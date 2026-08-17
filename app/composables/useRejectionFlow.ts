import { computed, reactive } from 'vue'

/**
 * Context for an in-progress candidate rejection. When set, the app-level
 * RejectionFlowHost renders the RejectionEmailModal so the user can send a
 * rejection email (or skip) from anywhere a candidate can be rejected.
 */
export interface RejectionFlowContext {
  applicationId: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  jobTitle: string
  /** Runs after the candidate is moved to rejected (email sent OR skipped). */
  onDone?: () => void | Promise<void>
}

// Module-level singleton — the modal is only ever opened by a client click,
// so there is no SSR cross-request concern (state starts null on every render).
const state = reactive<{ context: RejectionFlowContext | null }>({ context: null })

export function useRejectionFlow() {
  function openRejection(context: RejectionFlowContext) {
    state.context = context
  }
  function closeRejection() {
    state.context = null
  }
  return {
    context: computed(() => state.context),
    openRejection,
    closeRejection,
  }
}
