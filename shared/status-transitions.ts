/**
 * ─────────────────────────────────────────────
 * Status transition rules — single source of truth
 * ─────────────────────────────────────────────
 *
 * Defines allowed state transitions for jobs and applications.
 * Imported by both server (API validation) and client (UI rendering).
 *
 * If you need to add/remove a transition, change it HERE and both
 * sides stay in sync automatically.
 */

// ─── Application status transitions ────────────────────────────────
/**
 * Allowed status transitions for applications.
 *
 * Free movement: a candidate can be moved from any stage to any other
 * stage (including stepping backward and re-opening `hired`). Each stage
 * simply lists every other stage as a valid target.
 */
const APPLICATION_STATUSES = [
  'new',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
] as const

export const APPLICATION_STATUS_TRANSITIONS: Record<string, string[]> =
  Object.fromEntries(
    APPLICATION_STATUSES.map((stage) => [
      stage,
      APPLICATION_STATUSES.filter((target) => target !== stage),
    ]),
  )

// ─── Job status transitions ────────────────────────────────────────
/**
 * Allowed status transitions for jobs.
 * `archived` can be reverted to `draft` or `open`.
 */
export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'archived'],
  open: ['closed', 'archived'],
  closed: ['open', 'archived'],
  archived: ['draft', 'open'],
}

// ─── Interview status transitions ──────────────────────────────────
/**
 * Allowed status transitions for interviews.
 * `completed` is terminal — no forward transitions.
 * `cancelled` and `no_show` can be rescheduled back to `scheduled`.
 */
export const INTERVIEW_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: ['scheduled'],
  no_show: ['scheduled'],
}
