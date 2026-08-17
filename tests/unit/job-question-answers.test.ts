import { describe, expect, it, vi } from 'vitest'

// ── Stub Nitro auto-imports BEFORE importing the module under test ───────────
// createError → a plain Error carrying the H3 fields, so we can assert on them.
vi.stubGlobal('createError', (opts: { statusCode: number, statusMessage?: string, data?: unknown }) => {
  const err = new Error(opts.statusMessage ?? 'error') as Error & {
    statusCode: number
    statusMessage?: string
    data?: unknown
  }
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  err.data = opts.data
  return err
})

const { assertApplicantAnswerDeletionAcknowledged, countApplicantAnswersForJob }
  = await import('../../server/utils/jobQuestionAnswers')

type HttpError = Error & { statusCode: number, data?: { code?: string, answerCount?: number } }

function expectRejection(answerCount: number, acknowledged: boolean): HttpError {
  try {
    assertApplicantAnswerDeletionAcknowledged(answerCount, acknowledged)
  }
  catch (err) {
    return err as HttpError
  }
  throw new Error('expected the guard to reject')
}

describe('applicant-answer deletion guard', () => {
  it('allows a bulk replace when no applicant has answered yet', () => {
    expect(() => assertApplicantAnswerDeletionAcknowledged(0, false)).not.toThrow()
  })

  it('blocks a bulk replace that would cascade-delete stored answers', () => {
    const err = expectRejection(300, false)

    expect(err.statusCode).toBe(409)
    expect(err.data?.code).toBe('applicant_answers_will_be_deleted')
    // The client needs the real number to name it instead of warning generically.
    expect(err.data?.answerCount).toBe(300)
    expect(err.message).toContain('300 applicant answers')
  })

  it('blocks on a single answer and keeps the wording singular', () => {
    const err = expectRejection(1, false)

    expect(err.statusCode).toBe(409)
    expect(err.data?.answerCount).toBe(1)
    expect(err.message).toContain('1 applicant answer')
  })

  it('allows the replace once the deletion is explicitly acknowledged', () => {
    expect(() => assertApplicantAnswerDeletionAcknowledged(300, true)).not.toThrow()
  })
})

describe('applicant-answer counting', () => {
  /** Minimal stand-in for the drizzle select builder chain. */
  function fakeReader(rows: { total: number }[]) {
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => Promise.resolve(rows),
    }
    return { select: vi.fn(() => chain) } as never
  }

  it('returns the counted total', async () => {
    await expect(countApplicantAnswersForJob(fakeReader([{ total: 42 }]), 'job-1', 'org-1'))
      .resolves.toBe(42)
  })

  it('treats an empty result as zero rather than undefined', async () => {
    await expect(countApplicantAnswersForJob(fakeReader([]), 'job-1', 'org-1'))
      .resolves.toBe(0)
  })
})
