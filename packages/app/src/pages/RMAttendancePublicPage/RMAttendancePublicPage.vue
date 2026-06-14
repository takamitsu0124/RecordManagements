<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import type {
  AttendanceEvent,
  AttendanceStatus,
} from '@rm/types'
import {
  attendanceStatusDefinitions,
  isAttendanceEventClosedForResponses,
} from '@rm/types'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import {
  fetchAttendanceEventByPublicToken,
  submitAttendanceResponse,
} from 'src/services/attendanceData'
import AttendanceSummaryTable from 'src/pages/RMAttendancePage/components/AttendanceSummaryTable.vue'
import {
  buildAttendanceSummaryRows,
  formatAttendanceCandidateRange,
  formatAttendanceDateTime,
  formatAttendanceStatusSymbol,
} from 'src/pages/RMAttendancePage/helpers'

type DraftAnswer = {
  status: AttendanceStatus | null
  note: string
}

const route = useRoute()

const event = ref<AttendanceEvent | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const displayName = ref('')
const comment = ref('')
const answers = ref<Record<string, DraftAnswer>>({})

const publicToken = computed(() =>
  typeof route.params.publicToken === 'string' ? route.params.publicToken : ''
)

const summaryRows = computed(() =>
  event.value ? buildAttendanceSummaryRows(event.value) : []
)

const isClosed = computed(() =>
  event.value ? isAttendanceEventClosedForResponses(event.value) : true
)

const initializeDraftAnswers = (attendanceEvent: AttendanceEvent) => {
  answers.value = Object.fromEntries(
    attendanceEvent.candidates.map((candidate) => [
      candidate.id,
      {
        status: null,
        note: '',
      },
    ])
  )
}

const loadPage = async () => {
  if (!publicToken.value) {
    errorMessage.value = '公開URLが正しくありません。'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const attendanceEvent =
      await fetchAttendanceEventByPublicToken(publicToken.value)

    if (!attendanceEvent) {
      errorMessage.value = '対象の出欠確認イベントが見つかりません。'
      return
    }

    event.value = attendanceEvent
    initializeDraftAnswers(attendanceEvent)
  } catch (error) {
    errorMessage.value = '公開回答画面を読み込めませんでした。'
    console.error('Failed to load public attendance page:', error)
  } finally {
    isLoading.value = false
  }
}

const selectStatus = (candidateId: string, status: AttendanceStatus) => {
  if (!answers.value[candidateId]) return
  answers.value[candidateId].status = status
}

const onSubmit = async () => {
  if (!event.value) return

  if (isClosed.value) {
    notifyError('この出欠確認は締切済みです。')
    return
  }

  if (!displayName.value.trim()) {
    notifyError('名前を入力してください。')
    return
  }

  const hasUnansweredCandidate = event.value.candidates.some(
    (candidate) => answers.value[candidate.id]?.status === null
  )

  if (hasUnansweredCandidate) {
    notifyError('すべての候補に回答してください。')
    return
  }

  isSubmitting.value = true

  try {
    await submitAttendanceResponse({
      eventId: event.value.id,
      displayName: displayName.value,
      comment: comment.value,
      answers: Object.fromEntries(
        event.value.candidates.map((candidate) => [
          candidate.id,
          {
            status: answers.value[candidate.id].status,
            note: answers.value[candidate.id].note,
          },
        ])
      ),
    })

    notifySuccess('回答を送信しました。')
    displayName.value = ''
    comment.value = ''
    await loadPage()
  } catch (error) {
    notifyError('回答の送信に失敗しました。')
    console.error('Failed to submit attendance response:', error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <RMPageHeader
        title="出欠回答"
        subtitle="公開URLを知っている人なら回答と集計を確認できます。"
        description="候補ごとの現在の件数を見ながら、そのまま回答を送信できます。"
        icon="pi pi-check-circle"
        centered
      />

      <div v-if="isLoading" class="rm-state-card">
        <ProgressSpinner strokeWidth="5" />
        <p class="rm-muted">公開回答画面を読み込み中...</p>
      </div>

      <RMEmptyState
        v-else-if="errorMessage"
        icon="pi pi-exclamation-circle"
        title="出欠確認を表示できません"
        :message="errorMessage"
      />

      <template v-else-if="event">
        <Card>
          <template #content>
            <div class="attendance-public__hero">
              <div class="attendance-public__title">{{ event.title }}</div>
              <div class="attendance-public__meta">
                <Tag
                  :value="isClosed ? '締切済み' : '回答受付中'"
                  :severity="isClosed ? 'secondary' : 'success'"
                />
                <Tag :value="`回答 ${event.responseCount}件`" severity="contrast" />
              </div>
              <div class="attendance-public__details">
                <div><strong>場所:</strong> {{ event.location || '未設定' }}</div>
                <div><strong>説明:</strong> {{ event.description || '未設定' }}</div>
                <div>
                  <strong>締切:</strong>
                  {{
                    event.answerDeadlineAt
                      ? formatAttendanceDateTime(event.answerDeadlineAt)
                      : '未設定'
                  }}
                </div>
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="attendance-public__section-title">候補ごとの集計</div>
            <AttendanceSummaryTable :summaries="summaryRows" />
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="attendance-public__section-title">回答フォーム</div>

            <div
              v-if="isClosed"
              class="attendance-public__notice attendance-public__notice--closed"
            >
              この出欠確認は締切済みのため、新しい回答は送信できません。
            </div>

            <form class="attendance-public__form" @submit.prevent="onSubmit">
              <div class="attendance-public__field">
                <label>名前 *</label>
                <InputText
                  v-model="displayName"
                  :disabled="isClosed"
                  placeholder="回答者名"
                />
              </div>

              <div
                v-for="candidate in event.candidates"
                :key="candidate.id"
                class="attendance-public__candidate"
              >
                <div class="attendance-public__candidate-head">
                  <div class="attendance-public__candidate-title">
                    {{ candidate.label }}
                  </div>
                  <div class="attendance-public__candidate-range">
                    {{ formatAttendanceCandidateRange(candidate) }}
                  </div>
                </div>

                <div class="attendance-public__status-group">
                  <Button
                    v-for="status in attendanceStatusDefinitions"
                    :key="status.key"
                    type="button"
                    :label="status.label"
                    :severity="
                      answers[candidate.id]?.status === status.key
                        ? 'contrast'
                        : 'secondary'
                    "
                    :outlined="answers[candidate.id]?.status !== status.key"
                    :disabled="isClosed"
                    @click="selectStatus(candidate.id, status.key)"
                  />
                </div>

                <div class="attendance-public__field">
                  <label>
                    メモ ({{
                      formatAttendanceStatusSymbol(answers[candidate.id]?.status)
                    }})
                  </label>
                  <Textarea
                    v-model="answers[candidate.id].note"
                    rows="2"
                    autoResize
                    :disabled="isClosed"
                    placeholder="候補ごとの補足があれば入力してください。"
                  />
                </div>
              </div>

              <div class="attendance-public__field">
                <label>全体コメント</label>
                <Textarea
                  v-model="comment"
                  rows="3"
                  autoResize
                  :disabled="isClosed"
                  placeholder="全体コメント"
                />
              </div>

              <div class="attendance-public__footer">
                <Button
                  type="submit"
                  label="回答を送信"
                  icon="pi pi-send"
                  :disabled="isClosed"
                  :loading="isSubmitting"
                />
              </div>
            </form>
          </template>
        </Card>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.attendance-public__hero,
.attendance-public__form {
  display: grid;
  gap: 16px;
}

.attendance-public__title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1f2937;
}

.attendance-public__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attendance-public__details {
  display: grid;
  gap: 8px;
  line-height: 1.7;
  color: #475569;
}

.attendance-public__section-title {
  margin-bottom: 14px;
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
}

.attendance-public__notice {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
}

.attendance-public__notice--closed {
  border-color: rgba(148, 163, 184, 0.4);
  background: rgba(248, 250, 252, 0.94);
}

.attendance-public__field {
  display: grid;
  gap: 8px;
}

.attendance-public__field label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #475569;
}

.attendance-public__candidate {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.attendance-public__candidate-title {
  font-weight: 800;
  color: #1f2937;
}

.attendance-public__candidate-range {
  margin-top: 4px;
  font-size: 0.84rem;
  color: #64748b;
}

.attendance-public__status-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attendance-public__footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .attendance-public__status-group,
  .attendance-public__footer {
    display: grid;
  }
}
</style>
