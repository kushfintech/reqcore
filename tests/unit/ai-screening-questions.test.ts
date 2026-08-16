import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateStructuredOutput } from '../../server/utils/ai/provider'
import {
  containsProhibitedScreeningContent,
  filterCompliantScreeningQuestions,
  generateScreeningQuestionsFromDescription,
  hasMeaningfulJobDescription,
  normalizeImportedScreeningQuestions,
  type GeneratedScreeningQuestion,
} from '../../server/utils/ai/screeningQuestions'

vi.mock('../../server/utils/ai/provider', () => ({
  generateStructuredOutput: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(generateStructuredOutput).mockReset()
})

function question(label: string, overrides: Partial<GeneratedScreeningQuestion> = {}): GeneratedScreeningQuestion {
  return {
    label,
    type: 'short_text',
    description: null,
    required: false,
    options: null,
    ...overrides,
  }
}

describe('AI screening-question safety filter', () => {
  it.each([
    'What is your date of birth?',
    'What is your marital status?',
    'Do you have any disabilities?',
    'What is your native language?',
    'What was your previous salary?',
    'Have you ever been arrested?',
    'What is your religion?',
    'Please upload a photograph of yourself.',
  ])('flags sensitive pre-employment inquiry: %s', (label) => {
    expect(containsProhibitedScreeningContent(label)).toBe(true)
  })

  it('does not confuse role-related duration with asking for the applicant\'s age', () => {
    expect(containsProhibitedScreeningContent('How many years of PostgreSQL experience do you have?')).toBe(false)
  })

  it('keeps role-related evidence questions and removes unsafe content anywhere in a question', () => {
    const result = filterCompliantScreeningQuestions([
      question('Describe a time you debugged a production incident.', {
        type: 'long_text',
        required: true,
      }),
      question('Which database have you used most recently?', {
        type: 'single_select',
        options: ['PostgreSQL', 'MySQL', 'Other'],
      }),
      question('Tell us about your customer-support experience.', {
        description: 'Include your medical history.',
      }),
      question('Choose your preferred deployment tool.', {
        type: 'single_select',
        options: ['Docker', 'Kubernetes', 'My religion is other'],
      }),
    ])

    expect(result).toHaveLength(2)
    expect(result.map(item => item.label)).toEqual([
      'Describe a time you debugged a production incident.',
      'Which database have you used most recently?',
    ])
  })

  it('deduplicates labels and converts malformed selects to short text', () => {
    const result = filterCompliantScreeningQuestions([
      question('Which CRM have you used?', { type: 'single_select', options: ['Salesforce'] }),
      question('  which crm have you used?  '),
    ])

    expect(result).toEqual([expect.objectContaining({
      label: 'Which CRM have you used?',
      type: 'short_text',
      options: null,
    })])
  })

  it('does not add a generated question whose label already exists in the form', () => {
    const existing = [
      question('Describe a time you debugged a production incident.', { type: 'long_text' }),
    ]

    const result = filterCompliantScreeningQuestions([
      question('  describe a time you debugged a production incident.  ', { type: 'long_text' }),
      question('Which observability tools have you used in production?'),
    ], existing)

    expect(result.map(item => item.label)).toEqual([
      'Which observability tools have you used in production?',
    ])
  })
})

describe('plain-text screening-question import normalization', () => {
  it('preserves original-language labels and keeps supported inferred fields', () => {
    const result = normalizeImportedScreeningQuestions([
      question('  ¿Tienes autorización para trabajar en España?  ', {
        type: 'single_select',
        options: ['Sí', 'No'],
      }),
      question('Enlace de LinkedIn', { type: 'url' }),
      question('Cuéntanos por qué te interesa el puesto', { type: 'long_text' }),
    ])

    expect(result).toEqual([
      expect.objectContaining({
        label: '¿Tienes autorización para trabajar en España?',
        type: 'single_select',
        options: ['Sí', 'No'],
      }),
      expect.objectContaining({ label: 'Enlace de LinkedIn', type: 'url' }),
      expect.objectContaining({ label: 'Cuéntanos por qué te interesa el puesto', type: 'long_text' }),
    ])
  })

  it('deduplicates labels, removes choices from non-select fields, and repairs malformed selects', () => {
    const result = normalizeImportedScreeningQuestions([
      question('LinkedIn URL', { type: 'url', options: ['Unexpected'] }),
      question(' linkedin url '),
      question('Preferred office', { type: 'single_select', options: ['Oslo'] }),
    ])

    expect(result).toEqual([
      expect.objectContaining({ label: 'LinkedIn URL', type: 'url', options: null }),
      expect.objectContaining({ label: 'Preferred office', type: 'short_text', options: null }),
    ])
  })
})

describe('AI screening-question gap filling', () => {
  it('supplies existing coverage to the model and accepts no additions when there are no gaps', async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValueOnce({
      object: { questions: [] },
      usage: { promptTokens: 900, completionTokens: 40 },
    } as never)

    const existing = [question('Which helpdesk tools have you used?')]
    const result = await generateScreeningQuestionsFromDescription(
      {} as never,
      'Support Specialist',
      'Own customer issues and use a helpdesk platform.',
      { fillGaps: true, existingQuestions: existing },
    )

    expect(result.questions).toEqual([])
    expect(result.emptyReason).toBe('no_gaps')
    // Spend the endpoint cannot see is spend no budget gate can cap, so usage
    // has to survive the trip back even when nothing was generated.
    expect(result.usage).toEqual({ promptTokens: 900, completionTokens: 40 })
    const generationOptions = vi.mocked(generateStructuredOutput).mock.calls.at(-1)?.[1]
    expect(generationOptions?.system).toContain('only for meaningful, job-related gaps')
    expect(generationOptions?.system).toContain('Return an empty questions array when there are no meaningful gaps')
    expect(generationOptions?.prompt).toContain('Which helpdesk tools have you used?')
  })
})

describe('AI screening-question grounding', () => {
  it('rejects repetitive placeholder text without calling the model', async () => {
    const description = 'efessssssssssssss efessssssssssssssefessssssssssssssefessssssssssssssefessssssssssssssefesssssssssssss'

    expect(hasMeaningfulJobDescription(description)).toBe(false)

    const result = await generateScreeningQuestionsFromDescription(
      {} as never,
      'Developer',
      description,
    )

    expect(result).toEqual({
      questions: [],
      usage: { promptTokens: 0, completionTokens: 0 },
      emptyReason: 'insufficient_description',
    })
    expect(generateStructuredOutput).not.toHaveBeenCalled()
  })

  it('allows the model to return no questions when coherent text has no grounded questions', async () => {
    vi.mocked(generateStructuredOutput).mockResolvedValueOnce({
      object: { questions: [] },
      usage: { promptTokens: 300, completionTokens: 20 },
    } as never)

    const result = await generateScreeningQuestionsFromDescription(
      {} as never,
      'Team Member',
      'Join our friendly team and help us make every day a great day.',
    )

    expect(result.questions).toEqual([])
    expect(result.emptyReason).toBe('no_grounded_questions')
    const generationOptions = vi.mocked(generateStructuredOutput).mock.calls.at(-1)?.[1]
    expect(generationOptions?.system).toContain('If it is nonsense, placeholder text, repetition')
    expect(generationOptions?.system).toContain('Every question must be traceable to a specific fact')
    expect(generationOptions?.schema.safeParse({ questions: [] }).success).toBe(true)
  })

  it('keeps concise descriptions with concrete role information eligible', () => {
    expect(hasMeaningfulJobDescription('Build Vue interfaces and review TypeScript pull requests.')).toBe(true)
    expect(hasMeaningfulJobDescription('Use React and Vue.')).toBe(true)
  })
})
