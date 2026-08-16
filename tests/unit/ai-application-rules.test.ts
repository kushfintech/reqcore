import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zodSchema } from 'ai'
import { generateStructuredOutput } from '../../server/utils/ai/provider'
import {
  generateApplicationRulesFromDescription,
  getEligibleAutomationQuestions,
  normalizeGeneratedApplicationRules,
  type RuleGenerationQuestion,
} from '../../server/utils/ai/applicationRules'

vi.mock('../../server/utils/ai/provider', () => ({
  generateStructuredOutput: vi.fn(),
}))

function question(
  id: string,
  label: string,
  overrides: Partial<RuleGenerationQuestion> = {},
): RuleGenerationQuestion {
  return {
    id,
    label,
    type: 'single_select',
    required: true,
    options: ['Yes', 'No'],
    ...overrides,
  }
}

describe('AI application-rule generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers only deterministic, non-sensitive questions to the model', () => {
    const result = getEligibleAutomationQuestions([
      question('select', 'Do you hold the required licence?'),
      question('number', 'How many years have you used PostgreSQL?', {
        type: 'number',
        options: null,
      }),
      question('text', 'Describe your production experience.', {
        type: 'long_text',
        options: null,
      }),
      question('age', 'Are you over the age of 40?', {
        type: 'checkbox',
        options: null,
      }),
      question('authorization', 'Are you authorized to work in this country?', {
        type: 'single_select',
      }),
    ])

    expect(result.map(item => item.id)).toEqual(['select', 'number'])
  })

  it('normalizes values and removes hallucinated or invalid conditions', () => {
    const questions = [
      question('licence', 'Do you hold the required licence?'),
      question('years', 'How many years have you used PostgreSQL?', {
        type: 'number',
        options: null,
      }),
      question('essay', 'Describe your background.', {
        type: 'long_text',
        options: null,
      }),
    ]

    const result = normalizeGeneratedApplicationRules([
      {
        name: 'Strong experience',
        matchType: 'all',
        action: 'interview',
        conditions: [
          { questionId: 'licence', operator: 'is_one_of', value: ['yes'] },
        ],
      },
      {
        name: 'Hallucinated requirement',
        matchType: 'all',
        action: 'screening',
        conditions: [
          { questionId: 'licence', operator: 'is_one_of', value: ['Yes', 'Invented'] },
          { questionId: 'unknown', operator: 'is_true', value: null },
        ],
      },
      {
        name: 'Missing minimum experience',
        matchType: 'all',
        action: 'rejected',
        conditions: [
          { questionId: 'years', operator: 'lt', value: 3 },
          { questionId: 'years', operator: 'lt', value: 3 },
        ],
      },
      {
        name: 'Subjective keyword',
        matchType: 'all',
        action: 'screening',
        conditions: [
          { questionId: 'essay', operator: 'contains', value: 'passion' },
        ],
      },
    ], questions)

    expect(result).toEqual([
      {
        name: 'Missing minimum experience',
        matchType: 'all',
        action: 'rejected',
        enabled: true,
        conditions: [{ questionId: 'years', operator: 'lt', value: 3 }],
      },
      {
        name: 'Strong experience',
        matchType: 'all',
        action: 'interview',
        enabled: true,
        conditions: [{ questionId: 'licence', operator: 'is_one_of', value: ['Yes'] }],
      },
    ])
  })

  it('accepts null from the wire for checkbox operators that need no stored value', () => {
    const result = normalizeGeneratedApplicationRules([
      {
        name: 'Hybrid workplace',
        matchType: 'all',
        action: 'screening',
        conditions: [
          { questionId: 'hybrid', operator: 'is_true', value: null },
        ],
      },
    ], [question('hybrid', 'I can work hybrid', {
      type: 'checkbox',
      options: null,
    })])

    expect(result).toEqual([{
      name: 'Hybrid workplace',
      matchType: 'all',
      action: 'screening',
      enabled: true,
      conditions: [{ questionId: 'hybrid', operator: 'is_true' }],
    }])
  })

  it('asks for an empty result when objective automation is not appropriate', async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValueOnce({
      object: { rules: [] },
      usage: { promptTokens: 1, completionTokens: 1 },
    } as never)

    const result = await generateApplicationRulesFromDescription(
      {} as never,
      'Database Engineer',
      'A PostgreSQL specialist with at least three years of production experience.',
      [question('years', 'Years of PostgreSQL experience', {
        type: 'number',
        options: null,
      })],
    )

    expect(result.rules).toEqual([])
    // Usage has to survive an empty result too — an ungated, unrecorded call is
    // still a call we paid for.
    expect(result.usage).toEqual({ promptTokens: 1, completionTokens: 1 })
    const options = vi.mocked(generateStructuredOutput).mock.calls.at(-1)?.[1]
    expect(options?.system).toContain('Return an empty rules array')
    expect(options?.system).toContain('Never automate decisions using protected or sensitive traits')
    expect(options?.system).toContain('stated or clearly implied by the job description')
    expect(options?.system).toContain('hybrid or on-site role')
    expect(options?.prompt).toContain('Years of PostgreSQL experience')
    expect(options?.prompt).toContain('allowedOperators')
  })

  it('uses a strict-output-compatible schema with a required nullable value', async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValueOnce({
      object: { rules: [] },
      usage: { promptTokens: 1, completionTokens: 1 },
    } as never)

    await generateApplicationRulesFromDescription(
      {} as never,
      'Database Engineer',
      'At least three years of PostgreSQL experience is required.',
      [question('years', 'Years of PostgreSQL experience', {
        type: 'number',
        options: null,
      })],
    )

    const options = vi.mocked(generateStructuredOutput).mock.calls.at(-1)?.[1]
    const jsonSchema = zodSchema(options!.schema).jsonSchema as any
    const conditionSchema = jsonSchema.properties.rules.items.properties.conditions.items

    expect(conditionSchema.required).toContain('value')
    expect(conditionSchema.properties.value.anyOf).toContainEqual({ type: 'null' })
    expect(options?.system).toContain('set value to null')
  })

  it('does not call the provider when no question is safe for deterministic rules', async () => {
    const result = await generateApplicationRulesFromDescription(
      {} as never,
      'Writer',
      'Write thoughtful long-form articles.',
      [question('portfolio', 'Describe your writing style.', {
        type: 'long_text',
        options: null,
      })],
    )

    expect(result.rules).toEqual([])
    // No model call means no usage to report — and nothing to bill.
    expect(result.usage).toBeNull()
    expect(generateStructuredOutput).not.toHaveBeenCalled()
  })
})
