<script setup lang="ts">
import { AlertTriangle, ClipboardPaste, Loader2, Sparkles, X } from 'lucide-vue-next'

const MAX_SOURCE_CHARS = 50_000

const props = defineProps<{
  state: 'idle' | 'running' | 'done' | 'failed' | 'unavailable'
  error?: string | null
  existingQuestionCount: number
  /** Stored applicant answers that replacing would permanently destroy. */
  applicantAnswerCount?: number
}>()

const emit = defineEmits<{
  close: []
  import: [sourceText: string, acknowledgeAnswerDeletion: boolean]
}>()

const sourceText = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const trimmedSource = computed(() => sourceText.value.trim())

const answerCount = computed(() => props.applicantAnswerCount ?? 0)
/** Destroying stored answers takes a deliberate opt-in, not just a submit. */
const answerDeletionAcknowledged = ref(false)
const needsAnswerDeletionAcknowledgement = computed(() => answerCount.value > 0)

// A newer count (answers landing mid-import) has not been acknowledged yet.
watch(answerCount, () => { answerDeletionAcknowledged.value = false })

const canSubmit = computed(() =>
  trimmedSource.value.length > 0
  && props.state !== 'running'
  && (!needsAnswerDeletionAcknowledgement.value || answerDeletionAcknowledged.value),
)

function close() {
  if (props.state !== 'running') emit('close')
}

function submit() {
  if (!canSubmit.value) return
  emit('import', trimmedSource.value, answerDeletionAcknowledged.value)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(() => props.state, (state, previousState) => {
  if (state === 'done' && previousState === 'running') emit('close')
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => textarea.value?.focus())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" @click="close" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="screening-import-title"
        aria-describedby="screening-import-description"
        class="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-surface-900"
      >
        <div class="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div class="flex items-center gap-2.5">
            <span class="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
              <ClipboardPaste class="size-4.5" />
            </span>
            <div>
              <h2 id="screening-import-title" class="text-base font-semibold text-surface-900 dark:text-surface-100">
                Paste existing questions
              </h2>
              <p class="text-xs text-surface-500 dark:text-surface-400">AI will turn the text into form fields.</p>
            </div>
          </div>
          <button
            type="button"
            :disabled="state === 'running'"
            class="inline-flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            aria-label="Close"
            @click="close"
          >
            <X class="size-4.5" />
          </button>
        </div>

        <form class="flex min-h-0 flex-col" @submit.prevent="submit">
          <div class="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
            <p id="screening-import-description" class="text-sm leading-relaxed text-surface-600 dark:text-surface-300">
              Paste one question per line. AI will identify question types and answer choices while keeping the original wording and language.
            </p>

            <div>
              <label for="screening-question-source" class="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Existing questions
              </label>
              <textarea
                id="screening-question-source"
                ref="textarea"
                v-model="sourceText"
                :maxlength="MAX_SOURCE_CHARS"
                :disabled="state === 'running'"
                rows="13"
                placeholder="LinkedIn URL&#10;Street&#10;City&#10;State/Province&#10;ZIP/Postal Code&#10;Country/Region&#10;How did you hear about us?&#10;Referrer&#10;Highest Level Of Education"
                class="w-full resize-y rounded-lg border border-surface-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-surface-900 outline-none transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-wait disabled:opacity-70 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
              />
              <div class="mt-1.5 flex items-start justify-between gap-3">
                <p class="text-xs text-surface-500 dark:text-surface-400">Lists, numbering, and choices on following lines are supported.</p>
                <span class="shrink-0 text-xs tabular-nums text-surface-400 dark:text-surface-500">
                  {{ sourceText.length.toLocaleString() }} / {{ MAX_SOURCE_CHARS.toLocaleString() }}
                </span>
              </div>
            </div>

            <div
              v-if="existingQuestionCount > 0 && !needsAnswerDeletionAcknowledgement"
              class="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
            >
              Importing will replace {{ existingQuestionCount }} existing {{ existingQuestionCount === 1 ? 'question' : 'questions' }}.
            </div>

            <!-- Irreversible: name the exact number of answers and require an opt-in. -->
            <div
              v-else-if="needsAnswerDeletionAcknowledgement"
              class="rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800 dark:bg-danger-950/30"
            >
              <div class="flex items-start gap-3">
                <AlertTriangle class="mt-0.5 size-5 shrink-0 text-danger-600 dark:text-danger-400" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-danger-800 dark:text-danger-300">
                    This deletes {{ answerCount.toLocaleString() }} applicant
                    {{ answerCount === 1 ? 'answer' : 'answers' }}
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-danger-700 dark:text-danger-400">
                    Importing replaces your {{ existingQuestionCount }} existing
                    {{ existingQuestionCount === 1 ? 'question' : 'questions' }} and removes every answer
                    applicants gave to them. This cannot be undone.
                  </p>
                </div>
              </div>
              <label class="mt-3 flex cursor-pointer items-start gap-2.5 text-xs font-medium text-danger-800 dark:text-danger-300">
                <input
                  v-model="answerDeletionAcknowledged"
                  type="checkbox"
                  :disabled="state === 'running'"
                  class="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-danger-300 text-danger-600 focus:ring-danger-500/40 disabled:cursor-not-allowed dark:border-danger-700"
                >
                <span>
                  I understand {{ answerCount.toLocaleString() }} applicant
                  {{ answerCount === 1 ? 'answer' : 'answers' }} will be permanently deleted.
                </span>
              </label>
            </div>

            <div
              v-if="state === 'failed' || state === 'unavailable'"
              class="rounded-lg border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-950 dark:text-danger-400"
            >
              {{ error || 'The questions could not be analyzed. Please try again.' }}
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-surface-200 px-5 py-4 dark:border-surface-800">
            <button
              type="button"
              :disabled="state === 'running'"
              class="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-300 dark:hover:bg-surface-800"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Loader2 v-if="state === 'running'" class="size-4 animate-spin" />
              <Sparkles v-else class="size-4" />
              <template v-if="state === 'running'">Analyzing questions…</template>
              <template v-else-if="existingQuestionCount > 0">Analyze and replace</template>
              <template v-else>Analyze and create</template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
