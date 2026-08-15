<script setup lang="ts">
import {
  Lock, Upload, FileText, GripVertical, Plus, Pencil, Trash2,
  Zap, Sparkles, Loader2, ShieldCheck, ClipboardPaste,
} from 'lucide-vue-next'

/**
 * Live application builder: recruiter controls on the left, a real candidate
 * preview on the right. The preview renders the exact same ApplicationFormBody
 * candidates see, in `preview` mode, so the two can never drift. Clicking a
 * field in the preview opens its editor here.
 *
 * Shared between the create-job wizard (step 2) and the per-job application-form
 * page so there is a single application-builder surface across the app.
 */
type QuestionType =
  | 'short_text' | 'long_text' | 'single_select' | 'multi_select'
  | 'number' | 'date' | 'url' | 'checkbox' | 'file_upload'

type DraftQuestion = {
  id: string
  label: string
  type: QuestionType
  description?: string | null
  required: boolean
  options?: string[] | null
}

type ApplicationForm = {
  phoneRequirement: 'hidden' | 'optional' | 'required'
  requireResume: boolean
  requireCoverLetter: boolean
  questions: DraftQuestion[]
}

/**
 * When provided, every edit is persisted immediately through these handlers
 * (used by the per-job application-form page). When omitted, edits are kept in
 * the in-memory model and persisted later by the parent (used by the create-job
 * wizard, which saves everything on job creation).
 */
type BuilderOperations = {
  addQuestion: (data: QuestionInput) => Promise<unknown>
  updateQuestion: (id: string, data: QuestionInput) => Promise<unknown>
  deleteQuestion: (id: string) => Promise<unknown>
  reorderQuestions: (order: { id: string; displayOrder: number }[]) => Promise<unknown>
  setPhoneRequirement: (value: 'hidden' | 'optional' | 'required') => Promise<unknown>
  setRequireResume: (value: boolean) => Promise<unknown>
  setRequireCoverLetter: (value: boolean) => Promise<unknown>
}

type QuestionInput = {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}

type AiQuestionGenerationMode = 'fill_gaps' | 'replace'

const props = defineProps<{
  /** Optional job title, shown as context above the preview. */
  jobTitle?: string
  /** Immediate-persistence handlers; when absent, edits stay in the model. */
  operations?: BuilderOperations
  /** The create-job wizard renders its preview in a persistent side panel. */
  showPreview?: boolean
  /** Present only when the parent supports AI question generation. */
  aiQuestionGenerationState?: 'idle' | 'running' | 'done' | 'failed' | 'unavailable'
  aiQuestionGenerationError?: string | null
  aiQuestionImportState?: 'idle' | 'running' | 'done' | 'failed' | 'unavailable'
  aiQuestionImportError?: string | null
}>()

const emit = defineEmits<{
  generateAiQuestions: [mode: AiQuestionGenerationMode]
  importAiQuestions: [sourceText: string]
}>()

const model = defineModel<ApplicationForm>({ required: true })

const busy = ref(false)
const showQuestionGenerationModeModal = ref(false)
const showQuestionImportModal = ref(false)
const aiActionRunning = computed(() =>
  props.aiQuestionGenerationState === 'running' || props.aiQuestionImportState === 'running',
)

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  number: 'Number',
  date: 'Date',
  url: 'URL',
  checkbox: 'Checkbox',
  file_upload: 'File Upload',
}

const phoneRequirementOptions = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
] as const

// ─────────────────────────────────────────────
// Question CRUD (operates on the model in place)
// ─────────────────────────────────────────────
const showAddForm = ref(false)
const editingQuestion = ref<DraftQuestion | null>(null)
const questionActionError = ref<string | null>(null)
const draggedQuestionId = ref<string | null>(null)
const questionDropTarget = ref<{ id: string; position: 'before' | 'after' } | null>(null)
let nextQuestionId = 0

function newDraftId() {
  // Stable, collision-free across a session; distinct from server ids.
  return `draft-${Date.now()}-${nextQuestionId++}`
}

function startAdd() {
  if (model.value.questions.length >= 50) {
    questionActionError.value = 'You can add up to 50 screening questions.'
    return
  }
  editingQuestion.value = null
  showAddForm.value = true
  questionActionError.value = null
}

function startEdit(q: DraftQuestion) {
  editingQuestion.value = q
  showAddForm.value = false
  questionActionError.value = null
}

function requestAiQuestions() {
  if (model.value.questions.length > 0) {
    showQuestionGenerationModeModal.value = true
    return
  }
  emit('generateAiQuestions', 'replace')
}

function selectAiQuestionGenerationMode(mode: AiQuestionGenerationMode) {
  showQuestionGenerationModeModal.value = false
  emit('generateAiQuestions', mode)
}

/** Run a delegated persistence handler, surfacing failures inline. */
async function runOp(op: () => Promise<unknown>): Promise<boolean> {
  busy.value = true
  questionActionError.value = null
  try {
    await op()
    return true
  } catch (err: any) {
    questionActionError.value = err?.data?.statusMessage ?? 'Something went wrong. Please try again.'
    return false
  } finally {
    busy.value = false
  }
}

async function handleAddQuestion(data: QuestionInput) {
  if (props.operations) {
    if (await runOp(() => props.operations!.addQuestion(data))) showAddForm.value = false
    return
  }
  model.value.questions.push({
    id: newDraftId(),
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  })
  showAddForm.value = false
  questionActionError.value = null
}

async function handleUpdateQuestion(data: QuestionInput) {
  if (!editingQuestion.value) return
  const id = editingQuestion.value.id
  if (props.operations) {
    if (await runOp(() => props.operations!.updateQuestion(id, data))) editingQuestion.value = null
    return
  }
  const index = model.value.questions.findIndex((q) => q.id === id)
  if (index === -1) return
  const existing = model.value.questions[index]
  if (!existing) return
  model.value.questions[index] = {
    id: existing.id,
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  }
  editingQuestion.value = null
  questionActionError.value = null
}

async function handleDeleteQuestion(questionId: string) {
  if (props.operations) {
    if (await runOp(() => props.operations!.deleteQuestion(questionId)) && editingQuestion.value?.id === questionId) {
      editingQuestion.value = null
    }
    return
  }
  const index = model.value.questions.findIndex((q) => q.id === questionId)
  if (index === -1) return
  model.value.questions.splice(index, 1)
  if (editingQuestion.value?.id === questionId) editingQuestion.value = null
  questionActionError.value = null
}

function questionDropPosition(event: DragEvent): 'before' | 'after' {
  const row = event.currentTarget as HTMLElement | null
  if (!row) return 'before'
  const bounds = row.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
}

function handleQuestionDragStart(event: DragEvent, questionId: string) {
  if (busy.value || !event.dataTransfer) {
    event.preventDefault()
    return
  }
  draggedQuestionId.value = questionId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', questionId)
}

function handleQuestionDragOver(event: DragEvent, questionId: string) {
  event.preventDefault()
  if (!draggedQuestionId.value || draggedQuestionId.value === questionId) {
    questionDropTarget.value = null
    return
  }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  questionDropTarget.value = { id: questionId, position: questionDropPosition(event) }
}

function handleQuestionDragEnd() {
  draggedQuestionId.value = null
  questionDropTarget.value = null
}

async function handleQuestionDrop(event: DragEvent, targetQuestionId: string) {
  event.preventDefault()
  const sourceQuestionId = draggedQuestionId.value ?? event.dataTransfer?.getData('text/plain')
  const position = questionDropPosition(event)
  handleQuestionDragEnd()
  if (!sourceQuestionId || sourceQuestionId === targetQuestionId) return

  const previousQuestions = [...model.value.questions]
  const reorderedQuestions = [...previousQuestions]
  const sourceIndex = reorderedQuestions.findIndex((question) => question.id === sourceQuestionId)
  if (sourceIndex === -1) return

  const [movedQuestion] = reorderedQuestions.splice(sourceIndex, 1)
  if (!movedQuestion) return
  const targetIndex = reorderedQuestions.findIndex((question) => question.id === targetQuestionId)
  if (targetIndex === -1) return
  reorderedQuestions.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, movedQuestion)

  if (reorderedQuestions.every((question, index) => question.id === previousQuestions[index]?.id)) return
  model.value.questions = reorderedQuestions
  questionActionError.value = null

  if (!props.operations) return
  const order = reorderedQuestions.map((question, index) => ({ id: question.id, displayOrder: index }))
  if (!await runOp(() => props.operations!.reorderQuestions(order))) {
    model.value.questions = previousQuestions
  }
}

function setRequireResume(value: boolean) {
  if (model.value.requireResume === value) return
  if (props.operations) {
    const prev = model.value.requireResume
    model.value.requireResume = value
    runOp(() => props.operations!.setRequireResume(value)).then((ok) => {
      if (!ok) model.value.requireResume = prev
    })
    return
  }
  model.value.requireResume = value
}

function setPhoneRequirement(value: 'hidden' | 'optional' | 'required') {
  if (model.value.phoneRequirement === value) return
  if (props.operations) {
    const previous = model.value.phoneRequirement
    model.value.phoneRequirement = value
    runOp(() => props.operations!.setPhoneRequirement(value)).then((ok) => {
      if (!ok) model.value.phoneRequirement = previous
    })
    return
  }
  model.value.phoneRequirement = value
}

function setRequireCoverLetter(value: boolean) {
  if (model.value.requireCoverLetter === value) return
  if (props.operations) {
    const prev = model.value.requireCoverLetter
    model.value.requireCoverLetter = value
    runOp(() => props.operations!.setRequireCoverLetter(value)).then((ok) => {
      if (!ok) model.value.requireCoverLetter = prev
    })
    return
  }
  model.value.requireCoverLetter = value
}

const questionsAnchor = ref<HTMLElement | null>(null)
const documentsAnchor = ref<HTMLElement | null>(null)
const personalInformationAnchor = ref<HTMLElement | null>(null)

/** Clicking a field in the preview jumps to (and opens) its editor on the left. */
function handleEditField(field: string) {
  if (field === 'phone') {
    personalInformationAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (field === 'resume' || field === 'coverLetter') {
    documentsAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (field.startsWith('question:')) {
    const id = field.slice('question:'.length)
    const q = model.value.questions.find((qq) => qq.id === id)
    if (q) {
      startEdit(q)
      nextTick(() => questionsAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
    return
  }
  // Name and email are mandatory, fixed fields — nothing to edit.
}
</script>

<template>
  <div
    class="grid grid-cols-1 items-start gap-6 lg:gap-8"
    :class="{ 'lg:grid-cols-2': showPreview !== false }"
    :aria-busy="busy"
  >
    <!-- ── Controls ─────────────────────────────── -->
    <div class="space-y-8">
      <div>
        <p class="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">Customize your application form</p>
        <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
          Edit the form on the left and watch the candidate's view update live. Locked fields are always collected and cannot be turned off.
        </p>
      </div>

      <!-- Personal information -->
      <div ref="personalInformationAnchor">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 pb-3 border-b border-surface-100 dark:border-surface-800">Personal information</h2>
        <div class="divide-y divide-surface-100 dark:divide-surface-800">
          <div
            v-for="field in ['First name', 'Last name', 'Email']"
            :key="field"
            class="flex items-center justify-between py-3.5 px-1"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-sm text-surface-900 dark:text-surface-100">{{ field }}</span>
              <Lock class="size-3 text-surface-300 dark:text-surface-600" />
            </div>
            <span
              class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800"
            >
              Mandatory
            </span>
          </div>
          <div class="flex flex-col gap-3 py-3.5 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span class="text-sm text-surface-900 dark:text-surface-100">Phone</span>
              <p class="mt-0.5 text-xs text-surface-400 dark:text-surface-500">Choose whether candidates see this field.</p>
            </div>
            <div class="inline-flex self-start rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800" role="radiogroup" aria-label="Phone field requirement">
              <button
                v-for="option in phoneRequirementOptions"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="model.phoneRequirement === option.value"
                class="rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
                :class="model.phoneRequirement === option.value
                  ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-100'
                  : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'"
                @click="setPhoneRequirement(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div ref="documentsAnchor">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 pb-3 border-b border-surface-100 dark:border-surface-800">Documents</h2>
        <div class="divide-y divide-surface-100 dark:divide-surface-800">
          <!-- Resume -->
          <div class="flex items-center justify-between py-4 px-1">
            <div>
              <div class="flex items-center gap-2">
                <Upload class="size-4 text-surface-400 dark:text-surface-500" />
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">Resume / CV</span>
              </div>
              <p class="text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6">PDF, DOC, or DOCX up to 10 MB</p>
            </div>
            <div class="inline-flex items-center rounded-lg bg-surface-100 dark:bg-surface-800 p-0.5" role="radiogroup" aria-label="Resume requirement">
              <button
                type="button"
                role="radio"
                :aria-checked="model.requireResume"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                :class="model.requireResume ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                @click="setRequireResume(true)"
              >
                Required
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="!model.requireResume"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                :class="!model.requireResume ? 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                @click="setRequireResume(false)"
              >
                Off
              </button>
            </div>
          </div>
          <!-- Cover letter -->
          <div class="flex items-center justify-between py-4 px-1">
            <div>
              <div class="flex items-center gap-2">
                <FileText class="size-4 text-surface-400 dark:text-surface-500" />
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">Cover letter</span>
              </div>
              <p class="text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6">Free-text field, max 10,000 characters</p>
            </div>
            <div class="inline-flex items-center rounded-lg bg-surface-100 dark:bg-surface-800 p-0.5" role="radiogroup" aria-label="Cover letter requirement">
              <button
                type="button"
                role="radio"
                :aria-checked="model.requireCoverLetter"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                :class="model.requireCoverLetter ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                @click="setRequireCoverLetter(true)"
              >
                Required
              </button>
              <button
                type="button"
                role="radio"
                :aria-checked="!model.requireCoverLetter"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                :class="!model.requireCoverLetter ? 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                @click="setRequireCoverLetter(false)"
              >
                Off
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Screening questions -->
      <div ref="questionsAnchor">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">Screening questions</h2>
          <div class="flex items-center gap-3">
            <span
              v-if="aiActionRunning"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400"
            >
              <Loader2 class="size-3.5 animate-spin" />
              <template v-if="props.aiQuestionImportState === 'running'">Analyzing pasted questions…</template>
              <template v-else>Writing from job description…</template>
            </span>
            <span v-else-if="model.questions.length > 0" class="text-xs font-medium text-surface-400 dark:text-surface-500 tabular-nums">
              {{ model.questions.length }} {{ model.questions.length === 1 ? 'question' : 'questions' }} added
            </span>
            <button
              v-if="props.aiQuestionGenerationState"
              type="button"
              :disabled="aiActionRunning || busy"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800 dark:bg-surface-900 dark:text-brand-300 dark:hover:bg-brand-950/50"
              @click="requestAiQuestions"
            >
              <Loader2 v-if="props.aiQuestionGenerationState === 'running'" class="size-3.5 animate-spin" />
              <Sparkles v-else class="size-3.5" />
              <template v-if="props.aiQuestionGenerationState === 'running'">Generating…</template>
              <template v-else-if="props.aiQuestionGenerationState === 'failed' || props.aiQuestionGenerationState === 'unavailable'">Try again</template>
              <template v-else-if="model.questions.length > 0">Regenerate with AI</template>
              <template v-else>Generate with AI</template>
            </button>
            <button
              v-if="props.aiQuestionGenerationState"
              type="button"
              :disabled="props.aiQuestionImportState === 'running' || busy"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
              @click="showQuestionImportModal = true"
            >
              <ClipboardPaste class="size-3.5" />
              Paste existing
            </button>
          </div>
        </div>

        <div
          v-if="props.aiQuestionGenerationState && (props.aiQuestionGenerationState !== 'idle' || model.questions.length === 0)"
          class="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-900 dark:bg-brand-950/30"
        >
          <div class="flex items-start gap-2.5">
            <ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium text-surface-700 dark:text-surface-300">
                <template v-if="props.aiQuestionGenerationState === 'running'">AI is drafting role-related questions.</template>
                <template v-else-if="props.aiQuestionGenerationState === 'done'">AI drafted these questions from the job description.</template>
                <template v-else-if="props.aiQuestionGenerationState === 'failed'">AI couldn't draft safe questions this time.</template>
                <template v-else-if="props.aiQuestionGenerationState === 'unavailable'">AI question drafting needs an AI provider.</template>
                <template v-else>AI can draft questions from the job description.</template>
              </p>
              <p class="mt-1 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                <template v-if="props.aiQuestionGenerationError">{{ props.aiQuestionGenerationError }}</template>
                <template v-else>Safety filters are designed to exclude protected or sensitive traits. Laws vary by jurisdiction, so review every draft before publishing.</template>
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="questionActionError"
          class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400 mt-4"
        >
          {{ questionActionError }}
          <button class="ml-2 underline" @click="questionActionError = null">Dismiss</button>
        </div>

        <div v-if="model.questions.length > 0" class="divide-y divide-surface-100 dark:divide-surface-800">
          <div
            v-for="q in model.questions"
            :key="q.id"
            class="relative flex items-center gap-3 py-3.5 px-1 group transition-opacity"
            :class="{ 'opacity-50': draggedQuestionId === q.id }"
            @dragover="handleQuestionDragOver($event, q.id)"
            @drop="handleQuestionDrop($event, q.id)"
          >
            <div
              v-if="questionDropTarget?.id === q.id"
              class="pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-brand-500"
              :class="questionDropTarget.position === 'before' ? 'top-0' : 'bottom-0'"
            />
            <button
              type="button"
              :draggable="!busy"
              class="cursor-grab rounded p-1 text-surface-300 hover:bg-surface-100 hover:text-surface-500 active:cursor-grabbing disabled:cursor-not-allowed dark:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-400"
              :disabled="busy"
              aria-label="Drag to reorder question"
              title="Drag to reorder"
              @dragstart="handleQuestionDragStart($event, q.id)"
              @dragend="handleQuestionDragEnd"
            >
              <GripVertical class="size-4" />
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ q.label }}</span>
                <span
                  v-if="q.required"
                  class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800"
                >
                  Required
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[10px] font-medium text-surface-500 dark:text-surface-400 ring-1 ring-inset ring-surface-200 dark:ring-surface-700"
                >
                  Optional
                </span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5 ml-0">
                <span class="text-xs text-surface-400 dark:text-surface-500">{{ questionTypeLabels[q.type] ?? q.type }}</span>
                <span v-if="q.description" class="text-xs text-surface-400 dark:text-surface-500 truncate">
                  &middot; {{ q.description }}
                </span>
                <span
                  v-if="(q.type === 'single_select' || q.type === 'multi_select') && q.options"
                  class="text-xs text-surface-400 dark:text-surface-500"
                >
                  &middot; {{ q.options.length }} options
                </span>
              </div>
            </div>
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                class="rounded p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                title="Edit"
                @click="startEdit(q)"
              >
                <Pencil class="size-4" />
              </button>
              <button
                type="button"
                class="rounded p-1.5 text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
                title="Delete"
                @click="handleDeleteQuestion(q.id)"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>

        <p v-else class="text-sm text-surface-400 dark:text-surface-500 py-6 text-center">
          No screening questions added yet.
        </p>

        <QuestionForm
          v-if="editingQuestion"
          :key="editingQuestion.id"
          :question="editingQuestion"
          class="mt-4 mb-2"
          @save="handleUpdateQuestion"
          @cancel="editingQuestion = null"
        />

        <QuestionForm
          v-if="showAddForm && !editingQuestion"
          class="mt-4 mb-2"
          @save="handleAddQuestion"
          @cancel="showAddForm = false"
        />

        <div class="mt-4 flex items-center gap-3">
          <button
            v-if="!showAddForm && !editingQuestion"
            type="button"
            :disabled="model.questions.length >= 50"
            class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors"
            @click="startAdd"
          >
            <Plus class="size-4" />
            Add a question
          </button>
        </div>

        <p class="mt-4 flex items-start gap-1.5 text-xs text-surface-400 dark:text-surface-500 leading-relaxed">
          <Zap class="size-3.5 shrink-0 mt-0.5" />
          <span>Build custom automation and knockout rules from these questions — e.g. auto-reject a wrong answer — anytime from the role's Automation Rules tab.</span>
        </p>
      </div>
    </div>

    <!-- ── Live preview ─────────────────────────── -->
    <div v-if="showPreview !== false" class="lg:sticky lg:top-4">
      <ApplicationBuilderPreview
        :application-form="model"
        :job-details="{ title: jobTitle }"
        @edit-field="handleEditField"
      />
    </div>
  </div>

  <ScreeningQuestionImportModal
    v-if="showQuestionImportModal"
    :state="props.aiQuestionImportState ?? 'idle'"
    :error="props.aiQuestionImportError"
    :existing-question-count="model.questions.length"
    :deletes-applicant-answers="Boolean(props.operations)"
    @close="showQuestionImportModal = false"
    @import="emit('importAiQuestions', $event)"
  />

  <ScreeningQuestionGenerationModeModal
    v-if="showQuestionGenerationModeModal"
    :existing-question-count="model.questions.length"
    :deletes-applicant-answers="Boolean(props.operations)"
    @close="showQuestionGenerationModeModal = false"
    @select="selectAiQuestionGenerationMode"
  />
</template>
