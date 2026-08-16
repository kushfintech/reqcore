import { z } from 'zod'
import { generateCriteriaFromDescription } from '../../utils/ai/scoring'
import { resolveAnalysisProvider } from '../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../utils/ai/budget'
import { recordAiGeneration } from '../../utils/ai/usage'
import { createRateLimiter } from '../../utils/rateLimit'

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(50000),
  /** Optional override — defaults to the org's analysis configuration. */
  aiConfigId: z.string().min(1).nullable().optional(),
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI criteria generation requests. Please wait before retrying.',
})

/**
 * POST /api/ai-config/generate-criteria
 *
 * Generate scoring criteria from a job title + description using the org's
 * default analysis AI configuration (or an explicit override).
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)

  const resolved = await resolveAnalysisProvider(orgId, { preferId: body.aiConfigId })
  await assertPlatformBudgetForRequest(orgId, resolved.billingMode)

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof generateCriteriaFromDescription>>

  try {
    result = await generateCriteriaFromDescription(
      resolved.providerConfig,
      body.title,
      body.description,
    )
  }
  catch {
    await recordAiGeneration({
      orgId,
      userId: session.user.id,
      feature: 'scoring_criteria_generation',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      usage: null,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
    })
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not draft scoring criteria right now. Please try again.',
    })
  }

  await recordAiGeneration({
    orgId,
    userId: session.user.id,
    feature: 'scoring_criteria_generation',
    provider: resolved.provider,
    model: resolved.model,
    billingMode: resolved.billingMode,
    usage: result.usage,
    latencyMs: Date.now() - startedAt,
    status: 'completed',
  })

  return { criteria: result.criteria, source: 'ai' }
})
