<script setup lang="ts">
import { Plus, RefreshCw, Sparkles, X } from 'lucide-vue-next'

defineProps<{
  existingQuestionCount: number
  deletesApplicantAnswers?: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [mode: 'fill_gaps' | 'replace']
}>()

const addButton = ref<HTMLButtonElement | null>(null)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => addButton.value?.focus())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:items-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" @click="emit('close')" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="screening-generation-mode-title"
        aria-describedby="screening-generation-mode-description"
        class="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-surface-900"
      >
        <div class="flex items-start justify-between gap-4 border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div class="flex items-start gap-2.5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
              <Sparkles class="size-4.5" />
            </span>
            <div>
              <h2 id="screening-generation-mode-title" class="text-base font-semibold text-surface-900 dark:text-surface-100">
                Generate questions with AI
              </h2>
              <p id="screening-generation-mode-description" class="mt-0.5 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                Choose how AI should use your {{ existingQuestionCount }} existing {{ existingQuestionCount === 1 ? 'question' : 'questions' }}.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4.5" />
          </button>
        </div>

        <div class="space-y-3 p-5">
          <button
            ref="addButton"
            type="button"
            :disabled="existingQuestionCount >= 50"
            class="group flex w-full items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-800 dark:bg-brand-950/30 dark:hover:border-brand-600 dark:hover:bg-brand-950/50"
            @click="emit('select', 'fill_gaps')"
          >
            <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm dark:bg-surface-900 dark:text-brand-400">
              <Plus class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">Add missing questions</span>
                <span class="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900 dark:text-brand-300">Recommended</span>
              </span>
              <span class="mt-1 block text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                Keep every current question. AI will compare them with the job description and add only questions that cover meaningful gaps.
              </span>
              <span v-if="existingQuestionCount >= 50" class="mt-1.5 block text-xs font-medium text-amber-700 dark:text-amber-300">
                The 50-question limit has been reached.
              </span>
            </span>
          </button>

          <button
            type="button"
            class="group flex w-full items-start gap-3 rounded-xl border border-surface-200 p-4 text-left transition-colors hover:border-danger-300 hover:bg-danger-50/50 focus:outline-none focus:ring-2 focus:ring-danger-500/20 dark:border-surface-700 dark:hover:border-danger-800 dark:hover:bg-danger-950/20"
            @click="emit('select', 'replace')"
          >
            <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
              <RefreshCw class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">Replace all questions</span>
              <span class="mt-1 block text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                Remove the current set and generate a new one from the job description.
                <template v-if="deletesApplicantAnswers"> Existing applicant answers to these questions will be permanently deleted.</template>
              </span>
            </span>
          </button>
        </div>

        <div class="flex justify-end border-t border-surface-200 px-5 py-4 dark:border-surface-800">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
            @click="emit('close')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
