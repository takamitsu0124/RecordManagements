<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleButton from 'primevue/togglebutton'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { Guild } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import { notifyError } from 'src/composables/useAppNotifications'

const route = useRoute()
const router = useRouter()

const guildId = ref<string | string[] | null>(null)
const guildDetail = ref<Guild | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const isEditMode = ref(false)

onMounted(async () => {
  guildId.value = route.params.guildId
  if (!guildId.value) {
    errorMessage.value = 'ギルドIDが指定されていません。'
    isLoading.value = false
    notifyError(errorMessage.value)
    router.push('/')
    return
  }

  try {
    isLoading.value = true
    await dbGuildModule.doc(guildId.value as string).fetch()
    const fetchedGuild = dbGuildModule.doc(guildId.value as string).data

    if (fetchedGuild) {
      guildDetail.value = fetchedGuild as Guild
    } else {
      errorMessage.value = '指定されたギルドが見つかりませんでした。'
      notifyError(errorMessage.value)
      router.push('/')
    }
  } catch (error) {
    errorMessage.value = 'ギルド情報の取得中にエラーが発生しました。'
    notifyError(errorMessage.value)
    console.error('Error fetching guild detail:', error)
    router.push('/')
  } finally {
    isLoading.value = false
  }
})

const formatGuildFoundingDate = (date: Date | null) => {
  if (!date) return '不明'
  return new Intl.DateTimeFormat('ja-JP').format(date)
}

const goToEditGuild = () => {
  if (guildId.value) {
    router.push({
      name: 'RMGuildEdit',
      params: { guildId: guildId.value as string },
    })
  } else {
    notifyError('編集するギルドのIDが見つかりません。')
  }
}

const goBack = () => {
  router.go(-1)
}

const goToPostSkill = (userId: string) => {
  if (!isEditMode.value) return

  if (guildId.value) {
    router.push({
      name: 'RMSkillPost',
      params: { guildId: guildId.value as string, userId },
    })
  }
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div v-if="isLoading" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">ギルド情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="rm-state-card">
      <p class="rm-error">{{ errorMessage }}</p>
      <RMButton label="ホームに戻る" color="primary" @click="router.push('/')" />
    </div>

    <Card v-else-if="guildDetail" class="guild-detail-card">
      <template #content>
        <div class="guild-detail-card__content">
          <div class="guild-detail-card__header">
            <div>
              <div class="guild-detail-card__title">{{ guildDetail.guildName }}</div>
              <div class="guild-detail-card__id">ID: {{ guildDetail.id }}</div>
            </div>
            <ToggleButton
              v-model="isEditMode"
              onLabel="編集モード"
              offLabel="閲覧モード"
              onIcon="pi pi-pencil"
              offIcon="pi pi-eye"
              class="guild-detail-card__toggle"
            />
          </div>

          <Divider />

          <div class="guild-detail-grid">
            <div class="guild-detail-field">
              <div class="guild-detail-label">ギルド説明</div>
              <div>{{ guildDetail.guildMemo || '説明なし' }}</div>
            </div>
            <div class="guild-detail-field">
              <div class="guild-detail-label">状況</div>
              <div>{{ guildDetail.situation || '不明' }}</div>
            </div>
            <div class="guild-detail-field">
              <div class="guild-detail-label">創設日</div>
              <div>{{ formatGuildFoundingDate(guildDetail.guildFoundingDateAt) }}</div>
            </div>
            <div class="guild-detail-field">
              <div class="guild-detail-label">ゲーム内ギルドID</div>
              <div>{{ guildDetail.guildIdInGame || '未登録' }}</div>
            </div>
            <div class="guild-detail-field">
              <div class="guild-detail-label">公式メンバー数</div>
              <div>{{ guildDetail.officialMembers }}人</div>
            </div>
          </div>

          <Divider />

          <div>
            <div class="rm-section-title">ギルドメンバー</div>
            <div v-if="Object.keys(guildDetail.guildMember).length > 0" class="guild-member-list">
              <button
                v-for="(member, uid) in guildDetail.guildMember"
                :key="uid"
                type="button"
                class="guild-member-item"
                :class="{ 'guild-member-item--editable': isEditMode }"
                @click="goToPostSkill(uid as string)"
              >
                <div class="guild-member-item__icon">
                  <RMIcon name="person" />
                </div>
                <div class="guild-member-item__body">
                  <div class="guild-member-item__name">{{ member.name }}</div>
                  <div class="guild-member-item__id">{{ uid }}</div>
                </div>
                <RMIcon v-if="isEditMode" name="arrow_forward_ios" class="guild-member-item__arrow" />
              </button>
            </div>
            <p v-else class="rm-muted">メンバーがいません。</p>
          </div>

          <div class="rm-actions guild-detail-actions">
            <RMButton label="戻る" flat color="grey" @click="goBack" />
            <RMButton label="ギルドを編集" color="primary" @click="goToEditGuild" />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.guild-detail-card {
  width: min(100%, 860px);
  border-radius: 24px;
  overflow: hidden;
}

.guild-detail-card__content {
  padding: 28px;
}

.guild-detail-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.guild-detail-card__title {
  font-size: clamp(1.8rem, 4vw, 2.25rem);
  font-weight: 800;
  color: #1f2937;
}

.guild-detail-card__id {
  margin-top: 6px;
  color: #64748b;
}

.guild-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.guild-detail-field {
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.guild-detail-label {
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.guild-member-list {
  display: grid;
  gap: 12px;
}

.guild-member-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.85);
  text-align: left;
}

.guild-member-item--editable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.guild-member-item--editable:hover {
  transform: translateY(-1px);
  border-color: #a1c2e1;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
}

.guild-member-item__icon,
.guild-member-item__arrow {
  color: #64748b;
}

.guild-member-item__body {
  flex: 1;
}

.guild-member-item__name {
  font-weight: 700;
  color: #1f2937;
}

.guild-member-item__id {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.875rem;
}

.guild-detail-actions {
  margin-top: 24px;
}

@media (max-width: 767px) {
  .guild-detail-card__content {
    padding: 20px;
  }

  .guild-detail-card__toggle {
    width: 100%;
  }
}
</style>
