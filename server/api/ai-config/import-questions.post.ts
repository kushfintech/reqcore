import { z } from 'zod'
import { importScreeningQuestionsFromText } from '../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../utils/ai/resolveProvider'
import { createRateLimiter } from '../../utils/rateLimit'

const bodySchema = z.object({
  sourceText: z.string().trim().min(1).max(50_000),
  aiConfigId: z.string().min(1).nullable().optional(),
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI screening-question requests. Please wait before retrying.',
})

/** Convert pasted questions into drafts; the new-job flow persists them later. */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { job: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)
  const resolved = await resolveAnalysisProvider(orgId, { preferId: body.aiConfigId })

  const questions = await importScreeningQuestionsFromText(
    resolved.providerConfig,
    body.sourceText,
  )

  if (questions.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI could not identify any screening questions in the pasted text.',
    })
  }

  return { questions, source: 'ai_import' as const }
})
