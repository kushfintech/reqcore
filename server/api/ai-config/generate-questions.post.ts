import { z } from 'zod'
import { generateScreeningQuestionsFromDescription } from '../../utils/ai/screeningQuestions'
import { resolveAnalysisProvider } from '../../utils/ai/resolveProvider'
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
  const resolved = await resolveAnalysisProvider(orgId, { preferId: body.aiConfigId })

  const generated = await generateScreeningQuestionsFromDescription(
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
  const questions = body.mode === 'fill_gaps'
    ? generated.slice(0, 50 - body.existingQuestions.length)
    : generated

  if (questions.length === 0 && body.mode === 'replace') {
    throw createError({
      statusCode: 422,
      statusMessage: 'AI did not return any questions that passed the screening safety checks.',
    })
  }

  return { questions, source: 'ai' as const, mode: body.mode }
})
