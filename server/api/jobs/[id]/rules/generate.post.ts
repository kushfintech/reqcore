import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { job } from '../../../../database/schema'
import {
  generateApplicationRulesFromDescription,
  getEligibleAutomationQuestions,
} from '../../../../utils/ai/applicationRules'
import { resolveAnalysisProvider } from '../../../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../../../utils/ai/budget'
import { recordAiGeneration } from '../../../../utils/ai/usage'
import { createRateLimiter } from '../../../../utils/rateLimit'

const paramsSchema = z.object({ id: z.string().min(1) })

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI automation-rule requests. Please wait before retrying.',
})

/**
 * POST /api/jobs/:id/rules/generate
 * Draft automation rules for review in the builder. Does not persist them.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { job: ['update'] })
  const orgId = session.session.activeOrganizationId
  const { id: jobId } = await getValidatedRouterParams(event, paramsSchema.parse)

  const jobRecord = await db.query.job.findFirst({
    where: and(eq(job.id, jobId), eq(job.organizationId, orgId)),
    columns: { id: true, title: true, description: true },
    with: {
      questions: {
        orderBy: (question, { asc }) => [asc(question.displayOrder), asc(question.createdAt)],
        columns: {
          id: true,
          label: true,
          description: true,
          type: true,
          required: true,
          options: true,
        },
      },
    },
  })

  if (!jobRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }
  if (!jobRecord.description?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Add a job description before generating automation rules.',
    })
  }
  if (jobRecord.questions.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Add screening questions before generating automation rules.',
    })
  }

  if (getEligibleAutomationQuestions(jobRecord.questions).length === 0) {
    return {
      rules: [],
      source: 'ai' as const,
      reason: 'no_eligible_questions' as const,
    }
  }

  const resolved = await resolveAnalysisProvider(orgId)
  await assertPlatformBudgetForRequest(orgId, resolved.billingMode)

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof generateApplicationRulesFromDescription>>

  try {
    result = await generateApplicationRulesFromDescription(
      resolved.providerConfig,
      jobRecord.title,
      jobRecord.description,
      jobRecord.questions,
    )
  }
  catch {
    await recordAiGeneration({
      orgId,
      userId: session.user.id,
      feature: 'application_rule_generation',
      provider: resolved.provider,
      model: resolved.model,
      billingMode: resolved.billingMode,
      usage: null,
      latencyMs: Date.now() - startedAt,
      status: 'failed',
    })
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not draft automation rules right now. Please try again.',
    })
  }

  await recordAiGeneration({
    orgId,
    userId: session.user.id,
    feature: 'application_rule_generation',
    provider: resolved.provider,
    model: resolved.model,
    billingMode: resolved.billingMode,
    usage: result.usage,
    latencyMs: Date.now() - startedAt,
    status: 'completed',
  })

  return {
    rules: result.rules,
    source: 'ai' as const,
    reason: result.rules.length === 0 ? 'no_appropriate_rules' as const : null,
  }
})
