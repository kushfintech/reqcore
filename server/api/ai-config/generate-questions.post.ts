import { z } from 'zod'
import { generateScreeningQuestionsFromDescription, hasMeaningfulJobDescription } from '../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../utils/ai/resolveProvider'
import { assertPlatformBudgetForRequest } from '../../utils/ai/budget'
import { recordAiGeneration } from '../../utils/ai/usage'
import { createRateLimiter } from '../../utils/rateLimit'

const existingQuestionSchema = z.object({
  label: z.string().trim().min(1).max(500),
  type: z.enum(['short_text', 'long_text', 'single_select', 'multi_select', 'number', 'date', 'url', 'checkbox', 'file_upload']),
  description: z.string().trim().max(1000).nullish(),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(200)).max(50).nullish(),
})

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(50_000),
  mode: z.enum(['fill_gaps', 'replace']).default('replace'),
  existingQuestions: z.array(existingQuestionSchema).max(50).default([]),
  aiConfigId: z.string().min(1).nullable().optional(),
}).superRefine((body, ctx) => {
  if (body.mode === 'fill_gaps' && body.existingQuestions.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['existingQuestions'],
      message: 'Existing questions are required when filling gaps.',
    })
  }
})

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many AI screening-question requests. Please wait before retrying.',
})

/** Draft questions only; they are persisted later when the job is created. */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { job: ['create'] })
  const orgId = session.session.activeOrganizationId
  const body = await readValidatedBody(event, bodySchema.parse)
  if (body.mode === 'fill_gaps' && body.existingQuestions.length >= 50) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The application form already has the maximum of 50 screening questions.',
    })
  }
  if (!hasMeaningfulJobDescription(body.description)) {
    return {
      questions: [],
      source: 'ai' as const,
      mode: body.mode,
      emptyReason: 'insufficient_description' as const,
    }
  }
  const resolved = await resolveAnalysisProvider(orgId, { preferId: body.aiConfigId })
  await assertPlatformBudgetForRequest(orgId, resolved.billingMode)

  const startedAt = Date.now()
  let result: Awaited<ReturnType<typeof generateScreeningQuestionsFromDescription>>

  try {
    result = await generateScreeningQuestionsFromDescription(
      resolved.providerConfig,
      body.title,
      body.description,
      {
        fillGaps: body.mode === 'fill_gaps',
        existingQuestions: body.existingQuestions.map(question => ({
          ...question,
          description: question.description ?? null,
          options: question.options ?? null,
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

  const questions = body.mode === 'fill_gaps'
    ? result.questions.slice(0, 50 - body.existingQuestions.length)
    : result.questions

  return {
    questions,
    source: 'ai' as const,
    mode: body.mode,
    emptyReason: questions.length === 0 ? result.emptyReason : null,
  }
})
