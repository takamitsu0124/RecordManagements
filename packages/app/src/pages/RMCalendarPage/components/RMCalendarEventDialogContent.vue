<script lang="ts" setup>
import { computed, inject, ref, type Ref } from 'vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'

type CalendarEventForm = {
  id: string
  googleEventId: string
  source: 'guild' | 'personal'
  calendarId: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  htmlLink: string
}

type CalendarEventDialogData = {
  eventForm: CalendarEventForm
  canEdit: boolean
  sourceLabel: string
  onSave?: (form: CalendarEventForm) => Promise<boolean>
}

type DialogRefValue = {
  data?: CalendarEventDialogData
  close: (options?: unknown) => void
}

const dialogRef = inject<Ref<DialogRefValue | undefined>>('dialogRef')

const initialData = dialogRef?.value?.data

const eventForm = ref<CalendarEventForm>({
  id: initialData?.eventForm.id || '',
  googleEventId: initialData?.eventForm.googleEventId || '',
  source: initialData?.eventForm.source || 'guild',
  calendarId: initialData?.eventForm.calendarId || '',
  title: initialData?.eventForm.title || '',
  description: initialData?.eventForm.description || '',
  location: initialData?.eventForm.location || '',
  start: initialData?.eventForm.start || '',
  end: initialData?.eventForm.end || '',
  allDay: initialData?.eventForm.allDay || false,
  htmlLink: initialData?.eventForm.htmlLink || '',
})

const isSaving = ref(false)
const canEdit = computed(() => initialData?.canEdit ?? false)
const sourceLabel = computed(() => initialData?.sourceLabel || '予定')
const isReadOnly = computed(() => !canEdit.value || isSaving.value)

const closeDialog = () => {
  dialogRef?.value?.close()
}

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
    </div>

    <div class="calendar-dialog__grid">
      <RMInput
        v-model="eventForm.title"
        label="タイトル *"
        :outline="true"
        :disabled="isReadOnly"
      />

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
        hint="Google Calendar の location を更新します"
        :outline="true"
        :disabled="isReadOnly"
      />

      <RMInput
        v-model="eventForm.description"
        label="メモ"
        type="textarea"
        hint="Google Calendar の description を更新します"
        :outline="true"
        :disabled="isReadOnly"
      />

      <a
        v-if="eventForm.htmlLink"
        :href="eventForm.htmlLink"
        target="_blank"
        rel="noopener noreferrer"
        class="calendar-dialog__link"
      >
        Google Calendar で開く
      </a>
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
        v-if="canEdit"
        :label="isSaving ? '保存中...' : '保存'"
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

.calendar-dialog__grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-dialog__date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.calendar-dialog__link {
  color: var(--rm-text-soft);
  font-weight: 700;
  line-height: 1.7;
  text-decoration: none;
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
