import { z } from 'zod'
import { importScreeningQuestionsFromText } from '../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../utils/ai/budget'
import { recordAiGeneration } from '../../utils/ai/usage'
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

  const questions = result.questions

  if (questions.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI could not identify any screening questions in the pasted text.',
    })
  }

  return { questions, source: 'ai_import' as const }
})
