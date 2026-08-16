import { and, count, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { jobQuestion, questionResponse } from '../database/schema'
import type * as schema from '../database/schema'

/** `db` or an open transaction — both expose the same `select` builder. */
type QuestionAnswerReader = Pick<PostgresJsDatabase<typeof schema>, 'select'>

/**
 * Count the applicant answers stored against a job's screening questions.
 *
 * `questionResponse.questionId` is `ON DELETE CASCADE`, so any bulk delete of a
 * job's questions permanently destroys these rows along with them.
 */
export async function countApplicantAnswersForJob(
  reader: QuestionAnswerReader,
  jobId: string,
  orgId: string,
): Promise<number> {
  const [row] = await reader
    .select({ total: count() })
    .from(questionResponse)
    .innerJoin(jobQuestion, eq(questionResponse.questionId, jobQuestion.id))
    .where(and(
      eq(jobQuestion.jobId, jobId),
      eq(jobQuestion.organizationId, orgId),
    ))

  return row?.total ?? 0
}

/**
 * Guard a bulk replacement of a job's screening questions.
 *
 * Destroying answers applicants already submitted is irreversible, so it needs
 * an explicit acknowledgement from the client. The rejection carries the count
 * so the UI can name the real number instead of a generic warning.
 */
export function assertApplicantAnswerDeletionAcknowledged(
  answerCount: number,
  acknowledged: boolean,
): void {
  if (answerCount === 0 || acknowledged) return

  throw createError({
    statusCode: 409,
    statusMessage: `Replacing these screening questions permanently deletes ${answerCount} applicant ${answerCount === 1 ? 'answer' : 'answers'}. Confirm the deletion before continuing.`,
    data: { code: 'applicant_answers_will_be_deleted', answerCount },
  })
}
