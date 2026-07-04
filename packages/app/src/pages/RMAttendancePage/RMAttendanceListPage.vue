<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import type { AttendanceEvent } from '@rm/types'
import { globalLoginUserData } from 'src/boot/main'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import { fetchMyAttendanceEvents } from 'src/services/attendanceData'
import {
  copyTextWithFallback,
  formatAttendanceDateTime,
} from './helpers'

const router = useRouter()

const events = ref<AttendanceEvent[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const ownerUid = computed(
  () => globalLoginUserData.value.uid || globalLoginUserData.value.id
)

const loadEvents = async () => {
  if (!ownerUid.value) {
    errorMessage.value = 'ユーザー情報が見つかりません。'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    events.value = await fetchMyAttendanceEvents(ownerUid.value)
  } catch (error) {
    errorMessage.value = '出欠確認イベントを読み込めませんでした。'
    console.error('Failed to load attendance events:', error)
  } finally {
    isLoading.value = false
  }
}

const goToCreate = () => {
  router.push({ name: 'RMAttendanceNew' })
}

const goToManage = (eventId: string) => {
  router.push({ name: 'RMAttendanceManage', params: { eventId } })
}

const copyPublicUrl = async (event: AttendanceEvent) => {
  try {
    await copyTextWithFallback(`${window.location.origin}/a/${event.publicToken}`)
    notifySuccess('公開URLをコピーしました。')
  } catch (error) {
    notifyError('公開URLのコピーに失敗しました。')
    console.error('Failed to copy attendance public url:', error)
  }
}

onMounted(() => {
  void loadEvents()
})
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <RMPageHeader
        title="出欠確認"
        subtitle="公開URL付きの調整イベントを個人で管理できます。"
        icon="pi pi-users"
      >
        <template #actions>
          <Button
            label="出欠確認を作成"
            icon="pi pi-plus"
            @click="goToCreate"
          />
        </template>
      </RMPageHeader>

      <div v-if="isLoading" class="rm-state-card">
        <ProgressSpinner strokeWidth="5" />
        <p class="rm-muted">出欠確認イベントを読み込み中...</p>
      </div>

      <RMEmptyState
        v-else-if="errorMessage"
        icon="pi pi-exclamation-circle"
        title="出欠確認を表示できません"
        :message="errorMessage"
      />

      <RMEmptyState
        v-else-if="events.length === 0"
        icon="pi pi-calendar-plus"
        title="出欠確認イベントがありません"
        message="まずは新しい出欠確認を作成して、公開URLを共有できる状態にしましょう。"
      >
        <template #actions>
          <Button label="出欠確認を作成" icon="pi pi-plus" @click="goToCreate" />
        </template>
      </RMEmptyState>

      <div v-else class="attendance-list">
        <Card v-for="event in events" :key="event.id" class="attendance-list__card">
          <template #content>
            <div class="attendance-list__content">
              <div class="attendance-list__head">
                <div>
                  <div class="attendance-list__title">{{ event.title }}</div>
                  <div class="attendance-list__meta">
                    <Tag
                      :value="event.isClosed ? '締切済み' : '受付中'"
                      :severity="event.isClosed ? 'secondary' : 'success'"
                    />
                    <Tag :value="`候補 ${event.candidates.length}件`" severity="info" />
                    <Tag
                      :value="`回答 ${event.responseCount}件`"
                      severity="contrast"
                    />
                  </div>
                </div>
              </div>

              <div class="attendance-list__details">
                <div><strong>場所:</strong> {{ event.location || '未設定' }}</div>
                <div>
                  <strong>締切:</strong>
                  {{
                    event.answerDeadlineAt
                      ? formatAttendanceDateTime(event.answerDeadlineAt)
                      : '未設定'
                  }}
                </div>
                <div>
                  <strong>作成日:</strong> {{ formatAttendanceDateTime(event.createdAt) }}
                </div>
              </div>

              <div class="attendance-list__actions">
                <Button
                  label="公開URLをコピー"
                  icon="pi pi-copy"
                  severity="secondary"
                  outlined
                  @click="copyPublicUrl(event)"
                />
                <Button
                  label="管理画面を開く"
                  icon="pi pi-external-link"
                  @click="goToManage(event.id)"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.attendance-list {
  display: grid;
  gap: 14px;
}

.attendance-list__card {
  padding: clamp(16px, 2.2vw, 22px);
}

.attendance-list__content {
  display: grid;
  gap: 14px;
}

.attendance-list__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.attendance-list__title {
  font-size: 1.04rem;
  font-weight: 800;
  color: #1f2937;
}

.attendance-list__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.attendance-list__details {
  display: grid;
  gap: 8px;
  color: #475569;
  line-height: 1.6;
}

.attendance-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 767px) {
  .attendance-list__actions {
    display: grid;
  }
}
</style>
