<script setup lang="ts">
import type { ApplicationRuleInput, QuestionType } from '~~/shared/application-rules'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string
const toast = useToast()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

const { job } = useJob(jobId)
const { questions } = useJobQuestions(jobId)
const { rules, status, error, saveRules, runRules } = useApplicationRules(jobId)

useSeoMeta({
  title: computed(() =>
    job.value ? `Automation Rules — ${job.value.title} — Reqcore` : 'Automation Rules — Reqcore',
  ),
})

const builderQuestions = computed(() =>
  (questions.value ?? []).map((q: any) => ({
    id: q.id,
    label: q.label,
    type: q.type as QuestionType,
    options: q.options ?? null,
  })),
)

const saving = ref(false)
const running = ref(false)
type AiGenerationState = 'idle' | 'running' | 'done' | 'failed' | 'unavailable'
type GeneratedRulesResponse = {
  rules: ApplicationRuleInput[]
  source: 'ai'
  reason: 'no_eligible_questions' | 'no_appropriate_rules' | null
}

const aiGenerationState = ref<AiGenerationState>('idle')
const aiGenerationError = ref<string | null>(null)
const aiGeneratedDraft = ref<{ id: number, rules: ApplicationRuleInput[] } | null>(null)

async function onSave(payload: ApplicationRuleInput[]) {
  saving.value = true
  try {
    await saveRules(payload)
    toast.success('Rules saved', 'New applicants will be categorized automatically.')
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to save rules', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    saving.value = false
  }
}

async function onRun() {
  running.value = true
  try {
    const res = await runRules()
    if (res.matched === 0) {
      toast.info('No matches', `Checked ${res.evaluated} applicant${res.evaluated === 1 ? '' : 's'} — none matched your rules.`)
    } else {
      const parts = Object.entries(res.byAction).map(([action, n]) => `${n} → ${action}`)
      toast.success(`${res.matched} applicant${res.matched === 1 ? '' : 's'} updated`, parts.join(', '))
      refreshNuxtData(`pipeline-apps-${jobId}`)
    }
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error('Failed to run rules', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    running.value = false
  }
}

async function onGenerate() {
  if (aiGenerationState.value === 'running') return
  if (!job.value?.description?.trim()) {
    toast.warning('Job description required', 'Add a job description first so AI can suggest appropriate automation rules.')
    return
  }

  aiGenerationState.value = 'running'
  aiGenerationError.value = null

  try {
    const result = await $fetch<GeneratedRulesResponse>(`/api/jobs/${jobId}/rules/generate`, {
      method: 'POST',
    })

    if (result.rules.length === 0) {
      aiGenerationState.value = 'idle'
      if (result.reason === 'no_eligible_questions') {
        toast.info(
          'No suitable structured questions',
          'Add a choice, number, or checkbox question that measures an essential job requirement, then try again.',
        )
      }
      else {
        toast.info(
          'No appropriate rules found',
          'AI found no safe match between the job description and a rule-compatible question. Free-text and sensitive questions are not used for automatic routing.',
        )
      }
      return
    }

    aiGeneratedDraft.value = { id: Date.now(), rules: result.rules }
    aiGenerationState.value = 'done'
    toast.success(
      `${result.rules.length} automation ${result.rules.length === 1 ? 'rule' : 'rules'} drafted`,
      'Review the draft and save it when you are ready.',
    )
  }
  catch (err: any) {
    const statusCode = err?.data?.statusCode ?? err?.statusCode
    const statusMessage = err?.data?.statusMessage ?? err?.statusMessage ?? err?.message
    const providerUnavailable = statusCode === 422
      && /provider|openrouter|ai is not available|removed/i.test(statusMessage ?? '')

    aiGenerationState.value = providerUnavailable ? 'unavailable' : 'failed'
    aiGenerationError.value = providerUnavailable
      ? 'No AI provider is available. Configure one in Settings → AI, then try again.'
      : 'No rules were changed. Try again, or create the rules manually.'
    toast.error('Failed to generate rules', {
      message: aiGenerationError.value,
      details: statusMessage || `${statusCode ?? 'Unknown'} error — no additional details from server.`,
      statusCode,
    })
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <JobSubNavActions :job-id="jobId" />

    <div v-if="status === 'pending'" class="text-center py-12 text-surface-400">
      Loading…
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      Failed to load automation rules.
    </div>

    <ApplicationRulesBuilder
      v-else
      :questions="builderQuestions"
      :server-rules="rules"
      :saving="saving"
      :running="running"
      :ai-generation-state="aiGenerationState"
      :ai-generation-error="aiGenerationError"
      :ai-generated-draft="aiGeneratedDraft"
      @save="onSave"
      @run="onRun"
      @generate="onGenerate"
    />
  </div>
</template>
