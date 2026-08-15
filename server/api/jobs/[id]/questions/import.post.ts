import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { job, jobQuestion } from '../../../../database/schema'
import { importScreeningQuestionsFromText } from '../../../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../../../utils/ai/resolveProvider'
import { createRateLimiter } from '../../../../utils/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({
  sourceText: z.string().trim().min(1).max(50_000),
  replaceExisting: z.boolean().default(false),
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI screening-question requests. Please wait before retrying.',
})

/** Analyze pasted questions and persist the resulting form fields atomically. */
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

  const resolved = await resolveAnalysisProvider(orgId)
  const imported = await importScreeningQuestionsFromText(
    resolved.providerConfig,
    body.sourceText,
  )

  if (imported.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI could not identify any screening questions in the pasted text.',
    })
  }

  const saved = await db.transaction(async (tx) => {
    if (existingJob.questions.length > 0) {
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
