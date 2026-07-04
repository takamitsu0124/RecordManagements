<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import type { AttendanceEvent, AttendanceResponse } from '@rm/types'
import { globalLoginUserData } from 'src/boot/main'
import RMConfirmDialog from 'src/components/RMConfirmDialog/RMConfirmDialog.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import {
  closeAttendanceEvent,
  fetchAttendanceEvent,
  fetchAttendanceResponses,
  softDeleteAttendanceEvent,
} from 'src/services/attendanceData'
import AttendanceSummaryTable from './components/AttendanceSummaryTable.vue'
import {
  buildAttendanceSummaryRows,
  copyTextWithFallback,
  formatAttendanceAnswersForDisplay,
  formatAttendanceDateTime,
} from './helpers'

const route = useRoute()
const router = useRouter()

const event = ref<AttendanceEvent | null>(null)
const responses = ref<AttendanceResponse[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const isClosing = ref(false)
const isDeleting = ref(false)

const eventId = computed(() =>
  typeof route.params.eventId === 'string' ? route.params.eventId : ''
)

const publicUrl = computed(() =>
  event.value ? `${window.location.origin}/a/${event.value.publicToken}` : ''
)

const summaryRows = computed(() =>
  event.value ? buildAttendanceSummaryRows(event.value) : []
)

// 作成日から30日後に自動削除される（scheduled Cloud Functionの保持期間と合わせる）。
const ATTENDANCE_RETENTION_DAYS = 30

const autoDeleteAt = computed(() => {
  if (!event.value) return null
  return new Date(
    event.value.createdAt.getTime() +
      ATTENDANCE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  )
})

const loadPage = async () => {
  if (!eventId.value) {
    errorMessage.value = 'イベントIDが見つかりません。'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const attendanceEvent = await fetchAttendanceEvent(eventId.value)
    if (!attendanceEvent) {
      errorMessage.value = '出欠確認イベントが見つかりません。'
      return
    }

    if (attendanceEvent.ownerUid !== (globalLoginUserData.value.uid || globalLoginUserData.value.id)) {
      notifyError('このイベントを管理する権限がありません。')
      await router.replace({ name: 'RMAttendance' })
      return
    }

    event.value = attendanceEvent
    responses.value = await fetchAttendanceResponses(attendanceEvent.id)
  } catch (error) {
    errorMessage.value = '管理画面を読み込めませんでした。'
    console.error('Failed to load attendance manage page:', error)
  } finally {
    isLoading.value = false
  }
}

const copyPublicUrl = async () => {
  if (!publicUrl.value) return

  try {
    await copyTextWithFallback(publicUrl.value)
    notifySuccess('公開URLをコピーしました。')
  } catch (error) {
    notifyError('公開URLのコピーに失敗しました。')
    console.error('Failed to copy attendance public url:', error)
  }
}

const onCloseEvent = async () => {
  if (!event.value || event.value.isClosed) return

  isClosing.value = true

  try {
    await closeAttendanceEvent(event.value.id)
    notifySuccess('出欠確認を締め切りました。')
    await loadPage()
  } catch (error) {
    notifyError('締切処理に失敗しました。')
    console.error('Failed to close attendance event:', error)
  } finally {
    isClosing.value = false
  }
}

const onDeleteEvent = async () => {
  if (!event.value) return

  isDeleting.value = true

  try {
    await softDeleteAttendanceEvent(event.value.id)
    notifySuccess('出欠確認を削除しました。')
    await router.replace({ name: 'RMAttendance' })
  } catch (error) {
    notifyError('削除に失敗しました。')
    console.error('Failed to delete attendance event:', error)
  } finally {
    isDeleting.value = false
  }
}

type PendingConfirmAction = 'close' | 'delete' | null
const pendingConfirmAction = ref<PendingConfirmAction>(null)

const confirmDialogConfig = computed(() => {
  if (pendingConfirmAction.value === 'close') {
    return {
      title: '出欠確認を締め切る',
      message:
        'この出欠確認を締め切りますか？締切後は新しい回答を受け付けなくなります。',
      confirmLabel: '締め切る',
      severity: 'warn' as const,
      loading: isClosing.value,
    }
  }
  if (pendingConfirmAction.value === 'delete') {
    return {
      title: '出欠確認を削除',
      message: 'この出欠確認を削除しますか？この操作は取り消せません。',
      confirmLabel: '削除する',
      severity: 'danger' as const,
      loading: isDeleting.value,
    }
  }
  return null
})

const requestCloseEvent = () => {
  if (!event.value || event.value.isClosed) return
  pendingConfirmAction.value = 'close'
}

const requestDeleteEvent = () => {
  if (!event.value) return
  pendingConfirmAction.value = 'delete'
}

const runPendingConfirmAction = async () => {
  if (pendingConfirmAction.value === 'close') {
    await onCloseEvent()
  } else if (pendingConfirmAction.value === 'delete') {
    await onDeleteEvent()
  }
  pendingConfirmAction.value = null
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <RMPageHeader
        title="出欠確認の管理"
        subtitle="候補ごとの集計と回答一覧を確認できます。"
        icon="pi pi-chart-bar"
      >
        <template #actions>
          <Button
            label="一覧へ戻る"
            severity="secondary"
            outlined
            @click="router.push({ name: 'RMAttendance' })"
          />
        </template>
      </RMPageHeader>

      <div v-if="isLoading" class="rm-state-card">
        <ProgressSpinner strokeWidth="5" />
        <p class="rm-muted">管理画面を読み込み中...</p>
      </div>

      <RMEmptyState
        v-else-if="errorMessage"
        icon="pi pi-exclamation-circle"
        title="管理画面を表示できません"
        :message="errorMessage"
      />

      <template v-else-if="event">
        <Card>
          <template #content>
            <div class="attendance-manage__card-content">
              <div class="attendance-manage__hero">
                <div>
                  <div class="attendance-manage__title">{{ event.title }}</div>
                  <div class="attendance-manage__meta">
                    <Tag
                      :value="event.isClosed ? '締切済み' : '受付中'"
                      :severity="event.isClosed ? 'secondary' : 'success'"
                    />
                    <Tag :value="`回答 ${event.responseCount}件`" severity="contrast" />
                  </div>
                </div>

                <div class="attendance-manage__actions">
                  <Button
                    label="公開URLをコピー"
                    icon="pi pi-copy"
                    severity="secondary"
                    outlined
                    @click="copyPublicUrl"
                  />
                  <Button
                    label="締め切る"
                    icon="pi pi-lock"
                    severity="warn"
                    :disabled="event.isClosed"
                    :loading="isClosing"
                    @click="requestCloseEvent"
                  />
                  <Button
                    label="削除"
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    :loading="isDeleting"
                    @click="requestDeleteEvent"
                  />
                </div>
              </div>

              <div class="attendance-manage__detail-grid">
                <div><strong>場所:</strong> {{ event.location || '未設定' }}</div>
                <div>
                  <strong>公開URL:</strong>
                  <a :href="publicUrl" target="_blank" rel="noopener noreferrer">
                    {{ publicUrl }}
                  </a>
                </div>
                <div>
                  <strong>締切:</strong>
                  {{
                    event.answerDeadlineAt
                      ? formatAttendanceDateTime(event.answerDeadlineAt)
                      : '未設定'
                  }}
                </div>
                <div><strong>説明:</strong> {{ event.description || '未設定' }}</div>
                <div class="attendance-manage__retention">
                  <strong>自動削除予定:</strong>
                  {{ autoDeleteAt ? formatAttendanceDateTime(autoDeleteAt) : '-' }}
                  （作成から30日後）
                </div>
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="attendance-manage__card-content">
              <div class="attendance-manage__section-title">候補ごとの集計</div>
              <AttendanceSummaryTable :summaries="summaryRows" />
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="attendance-manage__card-content">
              <div class="attendance-manage__section-title">回答者一覧</div>

              <RMEmptyState
                v-if="responses.length === 0"
                icon="pi pi-user-minus"
                title="回答はまだありません"
                message="公開URLから回答が送信されると、ここに一覧と集計が反映されます。"
              />

              <div v-else class="rm-mobile-scroll">
                <DataTable :value="responses" responsiveLayout="scroll">
                  <Column field="displayName" header="名前" style="min-width: 180px" />
                  <Column header="各候補の回答" style="min-width: 420px">
                    <template #body="{ data }">
                      {{ formatAttendanceAnswersForDisplay(event.candidates, data.answers) }}
                    </template>
                  </Column>
                  <Column field="comment" header="コメント" style="min-width: 220px" />
                  <Column header="回答日時" style="min-width: 160px">
                    <template #body="{ data }">
                      {{ formatAttendanceDateTime(data.createdAt) }}
                    </template>
                  </Column>
                </DataTable>
              </div>
            </div>
          </template>
        </Card>
      </template>

      <RMConfirmDialog
        :visible="!!confirmDialogConfig"
        :title="confirmDialogConfig?.title"
        :message="confirmDialogConfig?.message ?? ''"
        :confirm-label="confirmDialogConfig?.confirmLabel"
        :severity="confirmDialogConfig?.severity"
        :loading="confirmDialogConfig?.loading"
        @update:visible="(value) => { if (!value) pendingConfirmAction = null }"
        @cancel="pendingConfirmAction = null"
        @confirm="runPendingConfirmAction"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.attendance-manage__card-content {
  padding: clamp(16px, 2.2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attendance-manage__hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.attendance-manage__title {
  font-size: 1.08rem;
  font-weight: 800;
  color: #1f2937;
}

.attendance-manage__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.attendance-manage__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.attendance-manage__detail-grid {
  display: grid;
  gap: 10px;
  color: #475569;
  line-height: 1.7;
}

.attendance-manage__retention {
  color: #94a3b8;
  font-size: 0.85rem;
}

.attendance-manage__section-title {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
}

@media (max-width: 767px) {
  .attendance-manage__actions {
    display: grid;
    width: 100%;
  }
}
</style>
