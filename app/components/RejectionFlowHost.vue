<script setup lang="ts">
/**
 * App-level host for the candidate rejection flow. Mounted once in the
 * dashboard layout; any reject action opens it via useRejectionFlow().
 * On send OR skip it moves the candidate to `rejected`, then runs the
 * caller's onDone (e.g. refresh a list/drawer). Cancel does nothing.
 */
const { context, closeRejection } = useRejectionFlow()
const toast = useToast()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

async function finalize() {
  const ctx = context.value
  closeRejection()
  if (!ctx) return
  try {
    await $fetch(`/api/applications/${ctx.applicationId}`, {
      method: 'PATCH',
      body: { status: 'rejected' },
    })
    await ctx.onDone?.()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to reject candidate', {
      message: err?.data?.statusMessage,
      statusCode: err?.data?.statusCode,
    })
  }
}
</script>

<template>
  <RejectionEmailModal
    v-if="context"
    :application-id="context.applicationId"
    :candidate-first-name="context.candidateFirstName"
    :candidate-last-name="context.candidateLastName"
    :candidate-email="context.candidateEmail"
    :job-title="context.jobTitle"
    @close="closeRejection"
    @sent="finalize"
    @skip="finalize"
  />
</template>
