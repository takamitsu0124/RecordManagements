<script lang="ts" setup>
import { computed, inject, ref, type Ref, watch } from 'vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'

type CalendarEventForm = {
  id: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
}

type CalendarEventDialogData = {
  eventForm: CalendarEventForm
  canEdit: boolean
  sourceLabel: string
  isNew?: boolean
  onSave?: (form: CalendarEventForm) => Promise<boolean>
  onDelete?: (form: CalendarEventForm) => Promise<boolean>
}

type DialogRefValue = {
  data?: CalendarEventDialogData
  close: (options?: unknown) => void
}

const dialogRef = inject<Ref<DialogRefValue | undefined>>('dialogRef')

const initialData = dialogRef?.value?.data

const eventForm = ref<CalendarEventForm>({
  id: initialData?.eventForm.id || '',
  title: initialData?.eventForm.title || '',
  description: initialData?.eventForm.description || '',
  location: initialData?.eventForm.location || '',
  start: initialData?.eventForm.start || '',
  end: initialData?.eventForm.end || '',
  allDay: initialData?.eventForm.allDay || false
})

const isSaving = ref(false)
const canEdit = computed(() => initialData?.canEdit ?? false)
const isNew = computed(() => initialData?.isNew ?? !eventForm.value.id)
const sourceLabel = computed(() => initialData?.sourceLabel || '共有予定')
const isReadOnly = computed(() => !canEdit.value || isSaving.value)
const canDelete = computed(
  () => canEdit.value && !isNew.value && Boolean(initialData?.onDelete)
)

const closeDialog = () => {
  dialogRef?.value?.close()
}

const normalizeDateValue = (value: string) => {
  return value.replace(/\//g, '-').trim()
}

const toDateOnlyValue = (value: string) => {
  const normalized = normalizeDateValue(value)
  if (!normalized) {
    return ''
  }

  return normalized.includes('T') ? normalized.slice(0, 10) : normalized
}

const formatDateTimeLocalValue = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  const hours = `${value.getHours()}`.padStart(2, '0')
  const minutes = `${value.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const toDateTimeValue = (value: string, fallbackHour: number) => {
  const dateOnly = toDateOnlyValue(value)
  if (!dateOnly) {
    return ''
  }

  if (normalizeDateValue(value).includes('T')) {
    return normalizeDateValue(value).slice(0, 16)
  }

  const nextDate = new Date(`${dateOnly}T00:00:00`)
  nextDate.setHours(fallbackHour, 0, 0, 0)
  return formatDateTimeLocalValue(nextDate)
}

watch(
  () => eventForm.value.allDay,
  (allDay, previousValue) => {
    if (previousValue === undefined || allDay === previousValue) {
      return
    }

    if (allDay) {
      const startDate = toDateOnlyValue(eventForm.value.start)
      const endDate = toDateOnlyValue(eventForm.value.end) || startDate
      eventForm.value.start = startDate
      eventForm.value.end = endDate
      return
    }

    const startDateTime = toDateTimeValue(eventForm.value.start, 9)
    const endDateTime =
      toDateTimeValue(eventForm.value.end, 10) || startDateTime

    eventForm.value.start = startDateTime
    eventForm.value.end = endDateTime >= startDateTime ? endDateTime : startDateTime
  }
)

const handleSave = async () => {
  if (!canEdit.value || !initialData?.onSave) {
    closeDialog()
    return
  }

  isSaving.value = true

  try {
    const shouldClose = await initialData.onSave({ ...eventForm.value })
    if (shouldClose) {
      closeDialog()
    }
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!canDelete.value || !initialData?.onDelete) {
    return
  }

  isSaving.value = true

  try {
    const shouldClose = await initialData.onDelete({ ...eventForm.value })
    if (shouldClose) {
      closeDialog()
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="calendar-dialog">
    <div class="calendar-status-pill-list">
      <span class="calendar-status-pill calendar-status-pill--info">
        {{ sourceLabel }}
      </span>
      <span
        class="calendar-status-pill"
        :class="
          eventForm.allDay
            ? 'calendar-status-pill--warning'
            : 'calendar-status-pill--success'
        "
      >
        {{ eventForm.allDay ? '終日予定' : '時刻指定' }}
      </span>
      <span
        v-if="!canEdit"
        class="calendar-status-pill calendar-status-pill--muted"
      >
        閲覧専用
      </span>
      <span
        v-else
        class="calendar-status-pill calendar-status-pill--primary"
      >
        {{ isNew ? '新規作成' : '編集' }}
      </span>
    </div>

    <div class="calendar-dialog__grid">
      <RMInput
        v-model="eventForm.title"
        label="タイトル *"
        hint="ギルドメンバーに共有したい予定名を入力してください"
        :outline="true"
        :disabled="isReadOnly"
      />

      <label class="calendar-dialog__toggle">
        <input
          v-model="eventForm.allDay"
          type="checkbox"
          :disabled="isReadOnly"
        />
        <span>終日予定として扱う</span>
      </label>

      <div class="calendar-dialog__date-grid">
        <RMInput
          v-model="eventForm.start"
          :label="eventForm.allDay ? '開始日 *' : '開始日時 *'"
          :type="eventForm.allDay ? 'date' : 'datetime-local'"
          :outline="true"
          :disabled="isReadOnly"
        />
        <RMInput
          v-model="eventForm.end"
          :label="eventForm.allDay ? '終了日 *' : '終了日時 *'"
          :type="eventForm.allDay ? 'date' : 'datetime-local'"
          :outline="true"
          :disabled="isReadOnly"
        />
      </div>

      <RMInput
        v-model="eventForm.location"
        label="場所"
        hint="必要なら集合場所や開催場所を記載します"
        :outline="true"
        :disabled="isReadOnly"
      />

      <RMInput
        v-model="eventForm.description"
        label="メモ"
        type="textarea"
        hint="参加条件や補足事項を残せます"
        :outline="true"
        :disabled="isReadOnly"
      />
    </div>

    <div class="calendar-dialog__footer">
      <RMButton
        label="閉じる"
        width="150px"
        flat
        color="grey"
        :isDisable="isSaving"
        @click="closeDialog"
      />
      <RMButton
        v-if="canDelete"
        :label="isSaving ? '削除中...' : '削除'"
        width="150px"
        flat
        color="negative"
        :isDisable="isSaving"
        @click="handleDelete"
      />
      <RMButton
        v-if="canEdit"
        :label="isSaving ? '保存中...' : isNew ? '作成' : '保存'"
        width="150px"
        color="primary"
        :isDisable="isSaving"
        @click="handleSave"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.calendar-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.calendar-status-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.calendar-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
}

.calendar-status-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.calendar-status-pill--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.calendar-status-pill--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.calendar-status-pill--muted {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.calendar-status-pill--primary {
  background: rgba(99, 102, 241, 0.14);
  color: #4338ca;
}

.calendar-dialog__grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-dialog__toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--rm-text);
}

.calendar-dialog__toggle input {
  width: 16px;
  height: 16px;
}

.calendar-dialog__date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.calendar-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

@media (max-width: 767px) {
  .calendar-dialog__date-grid {
    grid-template-columns: 1fr;
  }

  .calendar-dialog__footer {
    flex-direction: column-reverse;
  }
}
</style>
