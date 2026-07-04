<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { genFirebaseRandomId } from '@codelic/datagen'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import type { AttendanceCandidate } from '@rm/types'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import RMWheelDateTimePicker from 'src/components/RMWheelDateTimePicker/RMWheelDateTimePicker.vue'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import { globalLoginUserData } from 'src/boot/main'
import { createAttendanceEvent } from 'src/services/attendanceData'

type CandidateDraft = AttendanceCandidate

const router = useRouter()

const title = ref('')
const description = ref('')
const location = ref('')
const answerDeadlineAt = ref<Date | null>(null)
const candidates = ref<CandidateDraft[]>([
  {
    id: genFirebaseRandomId(),
    label: '',
    startAt: null,
    endAt: null,
  },
])
const isSaving = ref(false)

const ownerUid = computed(
  () => globalLoginUserData.value.uid || globalLoginUserData.value.id
)

const addCandidate = () => {
  candidates.value.push({
    id: genFirebaseRandomId(),
    label: '',
    startAt: null,
    endAt: null,
  })
}

const removeCandidate = (candidateId: string) => {
  if (candidates.value.length <= 1) {
    notifyError('候補日時は1件以上必要です。')
    return
  }

  candidates.value = candidates.value.filter(
    (candidate) => candidate.id !== candidateId
  )
}

const onSubmit = async () => {
  if (!ownerUid.value) {
    notifyError('ユーザー情報が見つかりません。')
    return
  }

  if (!title.value.trim()) {
    notifyError('タイトルを入力してください。')
    return
  }

  if (candidates.value.length === 0) {
    notifyError('候補日時を1件以上追加してください。')
    return
  }

  const hasInvalidCandidate = candidates.value.some((candidate) => {
    if (!candidate.startAt) return true
    if (
      candidate.endAt &&
      candidate.startAt.getTime() > candidate.endAt.getTime()
    ) {
      return true
    }
    return false
  })

  if (hasInvalidCandidate) {
    notifyError('候補日時の入力内容を確認してください。')
    return
  }

  if (answerDeadlineAt.value && answerDeadlineAt.value.getTime() < Date.now()) {
    notifyError('回答締切は現在時刻より後を指定してください。')
    return
  }

  isSaving.value = true

  try {
    const eventId = await createAttendanceEvent({
      ownerUid: ownerUid.value,
      title: title.value,
      description: description.value,
      location: location.value,
      candidates: candidates.value,
      answerDeadlineAt: answerDeadlineAt.value,
    })

    notifySuccess('出欠確認を作成しました。')
    await router.push({ name: 'RMAttendanceManage', params: { eventId } })
  } catch (error) {
    notifyError('出欠確認の作成に失敗しました。')
    console.error('Failed to create attendance event:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <RMPageHeader
        title="出欠確認を作成"
        subtitle="公開URLを共有して回答と集計を集められます。"
        icon="pi pi-calendar-plus"
      />

      <Card class="attendance-create-card">
        <template #content>
          <form class="attendance-create" @submit.prevent="onSubmit">
            <div class="attendance-create__grid">
              <div class="attendance-create__field">
                <label>タイトル *</label>
                <InputText v-model="title" placeholder="例: 6月後半の集まり" />
              </div>

              <div class="attendance-create__field">
                <label>場所</label>
                <InputText
                  v-model="location"
                  placeholder="例: Discord / 都内"
                />
              </div>
            </div>

            <div class="attendance-create__field">
              <label>説明</label>
              <Textarea
                v-model="description"
                rows="4"
                autoResize
                placeholder="共有したい補足事項を入力できます。"
              />
            </div>

            <div class="attendance-create__field">
              <label>回答締切日時</label>
              <RMWheelDateTimePicker
                v-model="answerDeadlineAt"
                placeholder="未設定でも可"
              />
              <p class="attendance-create__field-hint">
                集計結果は締切後（未設定の場合は主催者が手動で締め切るまで）に公開されます。
              </p>
            </div>

            <div class="attendance-create__field">
              <div class="attendance-create__field-head">
                <label>候補日時 *</label>
                <Button
                  type="button"
                  label="候補を追加"
                  icon="pi pi-plus"
                  severity="secondary"
                  outlined
                  @click="addCandidate"
                />
              </div>

              <div class="attendance-create__candidate-list">
                <Card
                  v-for="(candidate, index) in candidates"
                  :key="candidate.id"
                  class="attendance-create__candidate-card"
                >
                  <template #content>
                    <div class="attendance-create__candidate-grid">
                      <div class="attendance-create__field">
                        <label>候補ラベル</label>
                        <InputText
                          v-model="candidate.label"
                          :placeholder="`候補${index + 1}`"
                        />
                      </div>

                      <div class="attendance-create__field">
                        <label>開始日時 *</label>
                        <RMWheelDateTimePicker v-model="candidate.startAt" />
                      </div>

                      <div class="attendance-create__field">
                        <label>終了日時</label>
                        <RMWheelDateTimePicker v-model="candidate.endAt" />
                      </div>

                      <div class="attendance-create__candidate-actions">
                        <Button
                          type="button"
                          label="削除"
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          @click="removeCandidate(candidate.id)"
                        />
                      </div>
                    </div>
                  </template>
                </Card>
              </div>
            </div>

            <p class="attendance-create__retention-note">
              作成した出欠確認データは、作成日から30日後に自動的に削除されます。
            </p>

            <div class="attendance-create__footer">
              <Button
                type="button"
                label="一覧へ戻る"
                severity="secondary"
                outlined
                @click="router.push({ name: 'RMAttendance' })"
              />
              <Button
                type="submit"
                label="作成して管理画面へ"
                icon="pi pi-check"
                :loading="isSaving"
              />
            </div>
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.attendance-create-card {
  padding: 24px;
}

.attendance-create {
  display: grid;
  gap: 18px;
}

.attendance-create__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.attendance-create__field {
  display: grid;
  gap: 8px;
}

.attendance-create__field label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #475569;
}

.attendance-create__field-hint {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.6;
}

.attendance-create__retention-note {
  margin: 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.6;
}

.attendance-create__field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.attendance-create__candidate-list {
  display: grid;
  gap: 12px;
}

.attendance-create__candidate-card {
  padding: 18px;
}

.attendance-create__candidate-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.attendance-create__candidate-actions {
  display: flex;
  align-items: flex-end;
}

.attendance-create__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .attendance-create__grid,
  .attendance-create__candidate-grid {
    grid-template-columns: 1fr;
  }

  .attendance-create__footer {
    display: grid;
    place-content: center;
  }
}
</style>
