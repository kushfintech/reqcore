import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { job, jobQuestion } from '../../../../database/schema'
import { importScreeningQuestionsFromText } from '../../../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../../../utils/ai/budget'
import { recordAiGeneration } from '../../../../utils/ai/usage'
import { createRateLimiter } from '../../../../utils/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({
  sourceText: z.string().trim().min(1).max(50_000),
  replaceExisting: z.boolean().default(false),
  /** Set once the recruiter has confirmed the applicant answers a replace destroys. */
  acknowledgeAnswerDeletion: z.boolean().default(false),
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI screening-question requests. Please wait before retrying.',
})

/**
 * Analyze pasted questions and persist the resulting form fields atomically.
 *
 * Replacing cascades into `question_response`, so an import that would destroy
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
    columns: { id: true },
    with: {
      questions: { columns: { id: true } },
    },
  })

  if (!existingJob) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }
  if (existingJob.questions.length > 0 && !body.replaceExisting) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This job already has screening questions. Confirm that they should be replaced.',
    })
  }

  // Reject before spending an AI call when the recruiter has not yet confirmed
  // the applicant answers this replacement would cascade away.
  const replacing = existingJob.questions.length > 0
  if (replacing) {
    assertApplicantAnswerDeletionAcknowledged(
      await countApplicantAnswersForJob(db, jobId, orgId),
      body.acknowledgeAnswerDeletion,
    )
  }

  const resolved = await resolveAnalysisProvider(orgId)
  await assertPlatformBudgetForRequest(orgId, resolved.billingMode)

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof importScreeningQuestionsFromText>>

  try {
    result = await importScreeningQuestionsFromText(resolved.providerConfig, body.sourceText)
  }
  catch {
    await recordAiGeneration({
      orgId,
      userId: session.user.id,
      feature: 'screening_question_import',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      usage: null,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
    })
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not read the pasted questions right now. Please try again.',
    })
  }

  await recordAiGeneration({
    orgId,
    userId: session.user.id,
    feature: 'screening_question_import',
    provider: resolved.provider,
    model: resolved.model,
    billingMode: resolved.billingMode,
    usage: result.usage,
    latencyMs: Date.now() - startedAt,
    status: 'completed',
  })

  const imported = result.questions

  if (imported.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI could not identify any screening questions in the pasted text.',
    })
  }

  const saved = await db.transaction(async (tx) => {
    if (replacing) {
      // Re-check inside the transaction: applicants can submit while the model
      // is still analyzing, and those answers were never acknowledged.
      assertApplicantAnswerDeletionAcknowledged(
        await countApplicantAnswersForJob(tx, jobId, orgId),
        body.acknowledgeAnswerDeletion,
      )

      await tx.delete(jobQuestion).where(and(
        eq(jobQuestion.jobId, jobId),
        eq(jobQuestion.organizationId, orgId),
      ))
    }

    return tx.insert(jobQuestion).values(imported.map((question, displayOrder) => ({
      organizationId: orgId,
      jobId,
      label: question.label,
      type: question.type,
      description: question.description,
      required: question.required,
      options: question.options,
      displayOrder,
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

  return { questions: saved, source: 'ai_import' as const }
})
