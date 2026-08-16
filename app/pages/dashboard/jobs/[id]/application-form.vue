<script setup lang="ts">
import { Link2, ClipboardCopy } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const jobId = route.params.id as string
const toast = useToast()

const { job, status: fetchStatus, error, updateJob } = useJob(jobId)

useSeoMeta({
  title: computed(() =>
    job.value ? `Application Form — ${job.value.title} — Reqcore` : 'Application Form — Reqcore',
  ),
})

// ─────────────────────────────────────────────
// Application link
// ─────────────────────────────────────────────

const requestUrl = useRequestURL()
const applicationUrl = computed(() => {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  return `${base}/jobs/${job.value?.slug ?? jobId}/apply`
})

const linkCopied = ref(false)

async function copyApplicationLink() {
  try {
    await navigator.clipboard.writeText(applicationUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {
    // Fallback for non-HTTPS contexts
    toast.info(applicationUrl.value)
  }
}

// ─────────────────────────────────────────────
// Live application builder — shared with the create-job wizard.
// Every edit persists immediately via the operations below.
// ─────────────────────────────────────────────

const {
  questions: jobQuestions,
  refresh: refreshJobQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} = useJobQuestions(jobId)

type QuestionType =
  | 'short_text' | 'long_text' | 'single_select' | 'multi_select'
  | 'number' | 'date' | 'url' | 'checkbox' | 'file_upload'

type BuilderQuestion = {
  id: string
  label: string
  type: QuestionType
  description?: string | null
  required: boolean
  options?: string[] | null
  /** Applicant answers that would be destroyed if this question is deleted. */
  responseCount?: number
}

const builderModel = ref<{
  phoneRequirement: 'hidden' | 'optional' | 'required'
  requireResume: boolean
  requireCoverLetter: boolean
  questions: BuilderQuestion[]
}>({ phoneRequirement: 'optional', requireResume: false, requireCoverLetter: false, questions: [] })

// Keep the builder model in sync with server state.
watch(job, (j) => {
  if (j) {
    builderModel.value.phoneRequirement = j.phoneRequirement ?? 'optional'
    builderModel.value.requireResume = j.requireResume ?? false
    builderModel.value.requireCoverLetter = j.requireCoverLetter ?? false
  }
}, { immediate: true })

watch(jobQuestions, (qs) => {
  builderModel.value.questions = (qs ?? []).map((q: any) => ({
    id: q.id,
    label: q.label,
    type: q.type as QuestionType,
    description: q.description ?? null,
    required: q.required,
    options: q.options ?? null,
    responseCount: q.responseCount ?? 0,
  }))
}, { immediate: true })

const builderOperations = {
  addQuestion: (data: any) => addQuestion({ ...data, displayOrder: jobQuestions.value?.length ?? 0 }),
  updateQuestion: (id: string, data: any) => updateQuestion(id, data),
  deleteQuestion: (id: string) => deleteQuestion(id),
  reorderQuestions: (order: { id: string; displayOrder: number }[]) => reorderQuestions(order),
  setPhoneRequirement: (value: 'hidden' | 'optional' | 'required') => updateJob({ phoneRequirement: value }),
  setRequireResume: (value: boolean) => updateJob({ requireResume: value }),
  setRequireCoverLetter: (value: boolean) => updateJob({ requireCoverLetter: value }),
}

type AiQuestionGenerationState = 'idle' | 'running' | 'done' | 'failed' | 'unavailable'
type AiQuestionGenerationMode = 'fill_gaps' | 'replace'
type GeneratedQuestionsResponse = {
  questions: BuilderQuestion[]
  source: 'ai' | 'ai_import'
  mode?: AiQuestionGenerationMode
}

/**
 * The server refuses to cascade-delete applicant answers without an explicit
 * acknowledgement of the count. Confirming in the dialog normally satisfies it,
 * so this only fires when answers landed while the model was still working.
 */
function unacknowledgedAnswerDeletion(err: any): boolean {
  return (err?.data?.data ?? err?.data)?.code === 'applicant_answers_will_be_deleted'
}

const aiQuestionGenerationState = ref<AiQuestionGenerationState>('idle')
const aiQuestionGenerationError = ref<string | null>(null)
const aiQuestionImportState = ref<AiQuestionGenerationState>('idle')
const aiQuestionImportError = ref<string | null>(null)

async function generateAiQuestions(
  mode: AiQuestionGenerationMode = 'replace',
  acknowledgeAnswerDeletion = false,
) {
  if (aiQuestionGenerationState.value === 'running' || aiQuestionImportState.value === 'running') return

  const replacing = mode === 'replace' && builderModel.value.questions.length > 0

  aiQuestionGenerationState.value = 'running'
  aiQuestionGenerationError.value = null

  try {
    const result = await $fetch<GeneratedQuestionsResponse>(`/api/jobs/${jobId}/questions/generate`, {
      method: 'POST',
      body: { mode, acknowledgeAnswerDeletion },
    })
    await refreshJobQuestions()
    aiQuestionGenerationState.value = 'done'
    if (mode === 'fill_gaps') {
      if (result.questions.length === 0) {
        toast.info('No missing questions found', 'The current questions already cover the meaningful requirements in the job description.')
      }
      else {
        toast.success(`${result.questions.length} missing ${result.questions.length === 1 ? 'question' : 'questions'} added`)
      }
    }
    else {
      toast.success(replacing ? 'Screening questions replaced' : 'Screening questions generated')
    }
  }
  catch (err: any) {
    const statusCode = err?.data?.statusCode ?? err?.statusCode
    const statusMessage = err?.data?.statusMessage ?? err?.statusMessage ?? err?.message
    const providerUnavailable = statusCode === 422 && /provider|openrouter|ai is not available|removed/i.test(statusMessage ?? '')
    const staleAnswerCount = unacknowledgedAnswerDeletion(err)

    // Pull the newer answer count in so the next confirmation names it.
    if (staleAnswerCount) await refreshJobQuestions()

    aiQuestionGenerationState.value = providerUnavailable ? 'unavailable' : 'failed'
    aiQuestionGenerationError.value = providerUnavailable
      ? 'No AI provider is available. Configure one in Settings → AI, then try again.'
      : staleAnswerCount
        ? 'No questions were changed. New applicant answers arrived while AI was working — confirm the updated count to continue.'
        : 'No questions were changed. Try again, or edit the questions manually.'
    toast.error('Failed to generate questions', {
      message: aiQuestionGenerationError.value,
      details: statusMessage || `${statusCode ?? 'Unknown'} error — no additional details from server.`,
      statusCode,
    })
  }
}

async function importAiQuestions(sourceText: string, acknowledgeAnswerDeletion = false) {
  if (aiQuestionImportState.value === 'running' || aiQuestionGenerationState.value === 'running') return

  const replacing = builderModel.value.questions.length > 0
  aiQuestionImportState.value = 'running'
  aiQuestionImportError.value = null

  try {
    const result = await $fetch<GeneratedQuestionsResponse>(`/api/jobs/${jobId}/questions/import`, {
      method: 'POST',
      body: { sourceText, replaceExisting: replacing, acknowledgeAnswerDeletion },
    })
    await refreshJobQuestions()
    aiQuestionGenerationState.value = 'idle'
    aiQuestionGenerationError.value = null
    aiQuestionImportState.value = 'done'
    toast.success(`${result.questions.length} screening ${result.questions.length === 1 ? 'question' : 'questions'} created`)
  }
  catch (err: any) {
    const statusCode = err?.data?.statusCode ?? err?.statusCode
    const statusMessage = err?.data?.statusMessage ?? err?.statusMessage ?? err?.message
    const providerUnavailable = statusCode === 422 && /provider|openrouter|ai is not available|removed/i.test(statusMessage ?? '')
    const staleAnswerCount = unacknowledgedAnswerDeletion(err)

    // Pull the newer answer count in so the next confirmation names it.
    if (staleAnswerCount) await refreshJobQuestions()

    aiQuestionImportState.value = providerUnavailable ? 'unavailable' : 'failed'
    aiQuestionImportError.value = providerUnavailable
      ? 'No AI provider is available. Configure one in Settings → AI, then try again.'
      : staleAnswerCount
        ? 'No questions were changed. New applicant answers arrived while AI was working — confirm the updated count to continue.'
        : 'No questions were changed. Check the pasted text and try again.'
    toast.error('Failed to import questions', {
      message: aiQuestionImportError.value,
      details: statusMessage || `${statusCode ?? 'Unknown'} error — no additional details from server.`,
      statusCode,
    })
  }
}

</script>

<template>
  <div class="mx-auto max-w-6xl">
    <JobSubNavActions :job-id="jobId" />

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      Loading…
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      {{ error.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}
      <NuxtLink :to="$localePath('/dashboard')" class="underline ml-1">Back to Jobs</NuxtLink>
    </div>

    <template v-else-if="job">
      <!-- Header -->

      <!-- Application builder: controls + live candidate preview -->
      <!--
        The two-column layout is intentionally driven by the scoped CSS below
        (a plain media query on `.builder-layout`) rather than a Tailwind
        arbitrary responsive utility. In production SSR the arbitrary
        `xl:grid-cols-[…]` utility was not reliably applied on the first paint
        after a hard refresh — the container rendered as `display:grid` but
        without its column template, so the form and preview stacked into a
        single column until a client-side navigation re-applied the styles.
        Owning the layout in scoped CSS (higher specificity, unlayered, always
        inlined with this component) makes the side-by-side layout deterministic
        across dev/prod and SSR/CSR.
      -->
      <div class="builder-layout mb-6">
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 min-w-0 overflow-hidden">
          <!-- Application link pinned to top of the form card -->
          <div v-if="job.status === 'open'" class="flex items-center gap-3 px-5 py-3 bg-brand-50 dark:bg-brand-950/50 border-b border-brand-100 dark:border-brand-900">
            <Link2 class="size-4 text-brand-500 dark:text-brand-400 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400 mb-0.5">Application link</p>
              <input
                type="text"
                readonly
                :value="applicationUrl"
                class="w-full bg-transparent text-xs text-brand-700 dark:text-brand-300 select-all outline-none font-mono"
              />
            </div>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shrink-0"
              @click="copyApplicationLink"
            >
              <ClipboardCopy class="size-3.5" />
              {{ linkCopied ? 'Copied!' : 'Copy link' }}
            </button>
          </div>
          <div class="p-5">
            <ApplicationBuilder
              v-model="builderModel"
              :job-title="job.title"
              :operations="builderOperations"
              :show-preview="false"
              :ai-question-generation-state="aiQuestionGenerationState"
              :ai-question-generation-error="aiQuestionGenerationError"
              :ai-question-import-state="aiQuestionImportState"
              :ai-question-import-error="aiQuestionImportError"
              @generate-ai-questions="generateAiQuestions"
              @import-ai-questions="importAiQuestions"
            />
          </div>
        </div>
        <aside class="builder-preview min-w-0">
          <ApplicationBuilderPreview
            :application-form="builderModel"
            max-height="calc(100dvh - 10rem)"
            :job-details="{
              title: job.title,
              description: job.description ?? undefined,
              location: job.location ?? undefined,
              type: job.type ?? undefined,
              experienceLevel: job.experienceLevel ?? undefined,
              remoteStatus: job.remoteStatus ?? undefined,
            }"
          />
        </aside>
      </div>

    </template>
  </div>
</template>

<style scoped>
/*
  Deterministic side-by-side layout for the application builder.
  See the note in the template above: this replaces a Tailwind arbitrary
  responsive utility that failed to apply on the first SSR paint in production.
  Scoped styles are unlayered and always inlined with this component, so they
  win over (and don't depend on) Tailwind's `@layer utilities` ordering.
  The 80rem breakpoint mirrors Tailwind's `xl`.
*/
.builder-layout {
  display: grid;
  gap: 1.5rem; /* gap-6 */
}

.builder-preview {
  display: none; /* hidden below xl */
}

@media (min-width: 80rem) {
  .builder-layout {
    grid-template-columns: minmax(0, 3fr) minmax(24rem, 2fr);
  }

  .builder-preview {
    display: block;
    position: sticky;
    top: 2rem; /* top-8 */
    align-self: flex-start;
  }
}
</style>
