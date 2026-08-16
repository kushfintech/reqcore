import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { job, jobQuestion } from '../../../../database/schema'
import { generateScreeningQuestionsFromDescription } from '../../../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../../../utils/ai/budget'
import { recordAiGeneration } from '../../../../utils/ai/usage'
import { createRateLimiter } from '../../../../utils/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({
  mode: z.enum(['fill_gaps', 'replace']).default('replace'),
  /** Set once the recruiter has confirmed the applicant answers a replace destroys. */
  acknowledgeAnswerDeletion: z.boolean().default(false),
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI screening-question requests. Please wait before retrying.',
})

/**
 * Generate screening questions from a saved job and persist them atomically.
 * Existing questions can either be used as coverage context for gap-filling or
 * replaced explicitly. Generation completes before a replacement transaction
 * removes anything.
 *
 * Replacing cascades into `question_response`, so a replace that would destroy
 * applicant answers is rejected until the client acknowledges the exact count.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { job: ['update'] })
  const orgId = session.session.activeOrganizationId
  const { id: jobId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, bodySchema.parse)

  const existingJob = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.organizationId, orgId)),
    columns: { id: true, title: true, description: true },
    with: {
      questions: {
        orderBy: (question, { asc }) => [asc(question.displayOrder), asc(question.createdAt)],
        columns: {
          id: true,
          label: true,
          type: true,
          description: true,
          required: true,
          options: true,
          displayOrder: true,
        },
      },
    },
  })

  if (!existingJob) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }
  if (!existingJob.description?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Add a job description before generating screening questions.',
    })
  }
  if (body.mode === 'fill_gaps' && existingJob.questions.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'There are no existing screening questions to analyze for gaps.',
    })
  }
  if (body.mode === 'fill_gaps' && existingJob.questions.length >= 50) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The application form already has the maximum of 50 screening questions.',
    })
  }

  // Reject before spending an AI call when the recruiter has not yet confirmed
  // the applicant answers this replace would cascade away.
  const replacing = body.mode === 'replace' && existingJob.questions.length > 0
  if (replacing) {
    assertApplicantAnswerDeletionAcknowledged(
      await countApplicantAnswersForJob(db, jobId, orgId),
      body.acknowledgeAnswerDeletion,
    )
  }

  const resolved = await resolveAnalysisProvider(orgId)
  await assertPlatformBudgetForRequest(orgId, resolved.billingMode)

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof generateScreeningQuestionsFromDescription>>

  try {
    result = await generateScreeningQuestionsFromDescription(
      resolved.providerConfig,
      existingJob.title,
      existingJob.description,
      {
        fillGaps: body.mode === 'fill_gaps',
        existingQuestions: existingJob.questions.map(question => ({
          label: question.label,
          type: question.type,
          description: question.description,
          required: question.required,
          options: question.options,
        })),
      },
    )
  }
  catch {
    await recordAiGeneration({
      orgId,
      userId: session.user.id,
      feature: 'screening_question_generation',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      usage: null,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
    })
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not draft screening questions right now. Please try again.',
    })
  }

  await recordAiGeneration({
    orgId,
    userId: session.user.id,
    feature: 'screening_question_generation',
    provider: resolved.provider,
    model: resolved.model,
    billingMode: resolved.billingMode,
    usage: result.usage,
    latencyMs: Date.now() - startedAt,
    status: 'completed',
  })

  const generated = body.mode === 'fill_gaps'
    ? result.questions.slice(0, 50 - existingJob.questions.length)
    : result.questions

  if (generated.length === 0 && body.mode === 'replace') {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI did not return any questions that passed the screening safety checks.',
    })
  }

  if (generated.length === 0) {
    return { questions: [], source: 'ai' as const, mode: body.mode }
  }

  const saved = await db.transaction(async (tx) => {
    if (replacing) {
      // Re-check inside the transaction: applicants can submit while the model
      // is still generating, and those answers were never acknowledged.
      assertApplicantAnswerDeletionAcknowledged(
        await countApplicantAnswersForJob(tx, jobId, orgId),
        body.acknowledgeAnswerDeletion,
      )

      await tx.delete(jobQuestion).where(and(
        eq(jobQuestion.jobId, jobId),
        eq(jobQuestion.organizationId, orgId),
      ))
    }

    const firstDisplayOrder = body.mode === 'fill_gaps'
      ? Math.max(...existingJob.questions.map(question => question.displayOrder), -1) + 1
      : 0

    return tx.insert(jobQuestion).values(generated.map((question, index) => ({
      organizationId: orgId,
      jobId,
      label: question.label,
      type: question.type,
      description: question.description,
      required: question.required,
      options: question.options,
      displayOrder: firstDisplayOrder + index,
    }))).returning({
      id: jobQuestion.id,
      jobId: jobQuestion.jobId,
      type: jobQuestion.type,
      label: jobQuestion.label,
      description: jobQuestion.description,
      required: jobQuestion.required,
      options: jobQuestion.options,
      displayOrder: jobQuestion.displayOrder,
      createdAt: jobQuestion.createdAt,
      updatedAt: jobQuestion.updatedAt,
    })
  })

  return { questions: saved, source: 'ai' as const, mode: body.mode }
})
