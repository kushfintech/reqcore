<script setup lang="ts">
import { Briefcase, Building2, ChevronDown, MapPin } from 'lucide-vue-next'

defineProps<{
  job: {
    title: string
    description?: string | null
    location?: string | null
    type: string
    organizationName?: string | null
  }
}>()

const { t } = useI18n()

/** Roughly four lines of `.job-prose` body text (0.9375rem × 1.7). */
const COLLAPSED_HEIGHT = 104

const descriptionContent = useTemplateRef<HTMLElement>('descriptionContent')
const expanded = ref(false)
const contentHeight = ref<number | null>(null)
// Assume the description is long enough to clamp until we can measure it, so
// the server-rendered markup already shows the collapsed state.
const overflows = ref(true)

const collapsed = computed(() => overflows.value && !expanded.value)

const descriptionStyle = computed(() => {
  if (collapsed.value) return { maxHeight: `${COLLAPSED_HEIGHT}px` }
  if (contentHeight.value === null) return {}
  return { maxHeight: `${contentHeight.value}px` }
})

onMounted(() => {
  const el = descriptionContent.value
  if (!el) return

  const observer = new ResizeObserver(() => {
    contentHeight.value = el.scrollHeight
    // A couple of pixels of overshoot isn't worth a toggle.
    overflows.value = el.scrollHeight - COLLAPSED_HEIGHT > 8
  })
  observer.observe(el)
  onBeforeUnmount(() => observer.disconnect())
})

const typeLabels = computed<Record<string, string>>(() => ({
  full_time: t('career.type.full_time'),
  part_time: t('career.type.part_time'),
  contract: t('career.type.contract'),
  internship: t('career.type.internship'),
}))
</script>

<template>
  <div class="mb-6 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
    <div class="h-1 bg-gradient-to-r from-brand-500 to-brand-400" />

    <div class="p-6 sm:p-8">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <span
          v-if="job.organizationName"
          class="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-medium text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
        >
          <Building2 class="size-3.5 text-surface-400" />
          {{ job.organizationName }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-300">
          <Briefcase class="size-3.5" />
          {{ typeLabels[job.type] ?? job.type }}
        </span>
        <span
          v-if="job.location"
          class="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-medium text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400"
        >
          <MapPin class="size-3.5 text-surface-400" />
          {{ job.location }}
        </span>
      </div>

      <h1 class="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-3xl">
        {{ job.title }}
      </h1>

      <div v-if="job.description" class="mt-5 border-t border-surface-100 pt-5 dark:border-surface-800">
        <div class="relative">
          <div
            id="job-description"
            class="overflow-hidden transition-[max-height] duration-300 ease-out"
            :style="descriptionStyle"
          >
            <div ref="descriptionContent">
              <MarkdownDescription :value="job.description" />
            </div>
          </div>
          <div
            v-if="collapsed"
            class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent dark:from-surface-900"
          />
        </div>

        <button
          v-if="overflows"
          type="button"
          class="mt-3 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          :aria-expanded="expanded"
          aria-controls="job-description"
          @click="expanded = !expanded"
        >
          {{ expanded ? t('career.showLess') : t('career.readFullDescription') }}
          <ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': expanded }" />
        </button>
      </div>
    </div>
  </div>
</template>
