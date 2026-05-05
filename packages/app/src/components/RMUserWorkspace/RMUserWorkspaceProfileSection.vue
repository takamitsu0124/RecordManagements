<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import type { AppUser } from '@rm/types'
import RMInput from 'src/components/RMInput/RMInput.vue'
import type { WorkspaceProfile } from './types'

const props = defineProps<{
  user: WorkspaceProfile
  isEditMode: boolean
  canEditGuildId: boolean
  situationOptions: AppUser['situation'][]
  affiliationDateStr: string | null
  gameStartDateAtStr: string | null
  birthDateAtStr: string | null
}>()

const emit = defineEmits<{
  (e: 'update:user', value: WorkspaceProfile): void
  (e: 'update:affiliationDateStr', value: string | null): void
  (e: 'update:gameStartDateAtStr', value: string | null): void
  (e: 'update:birthDateAtStr', value: string | null): void
}>()

const updateUser = (patch: Partial<WorkspaceProfile>) => {
  emit('update:user', {
    ...props.user,
    ...patch,
  })
}

const displayNameModel = computed({
  get: () => props.user.displayName,
  set: (value: string) => updateUser({ displayName: value }),
})

const displayNameKanaModel = computed({
  get: () => props.user.displayNameKana,
  set: (value: string) => updateUser({ displayNameKana: value }),
})

const guildIdModel = computed({
  get: () => props.user.guildId,
  set: (value: string) => updateUser({ guildId: value }),
})

const affiliationNumModel = computed({
  get: () => props.user.affiliationNum,
  set: (value: number | null) => updateUser({ affiliationNum: value ?? 0 }),
})

const situationModel = computed({
  get: () => props.user.situation,
  set: (value: AppUser['situation']) => updateUser({ situation: value }),
})

const emailModel = computed({
  get: () => props.user.email,
  set: (value: string) => updateUser({ email: value }),
})

const phoneModel = computed({
  get: () => props.user.phone,
  set: (value: string) => updateUser({ phone: value }),
})

const affiliationDateModel = computed<string | undefined>({
  get: () => props.affiliationDateStr ?? undefined,
  set: (value) =>
    emit('update:affiliationDateStr', typeof value === 'string' ? value : null),
})

const gameStartDateAtModel = computed<string | undefined>({
  get: () => props.gameStartDateAtStr ?? undefined,
  set: (value) =>
    emit('update:gameStartDateAtStr', typeof value === 'string' ? value : null),
})

const birthDateModel = computed<string | undefined>({
  get: () => props.birthDateAtStr ?? undefined,
  set: (value) =>
    emit('update:birthDateAtStr', typeof value === 'string' ? value : null),
})
</script>

<template>
  <Card class="user-workspace-card">
    <template #content>
      <div class="user-workspace-section">
        <div class="user-workspace-section__header">
          <div>
            <div class="rm-section-title">プロフィール</div>
            <div class="user-workspace-section__description">
              個人情報を増やさず、現在使っているプロフィール項目だけを同じ画面で確認・更新できます。
            </div>
          </div>
        </div>

        <Divider />

        <section>
          <div class="rm-section-title">基本情報</div>
          <div class="rm-form-grid rm-form-grid--two">
            <RMInput
              v-model="displayNameModel"
              label="キャラクターネーム"
              shadow
              :disabled="!isEditMode"
            />
            <RMInput
              v-model="displayNameKanaModel"
              label="キャラクターネーム(カナ)"
              shadow
              :disabled="!isEditMode"
            />
            <RMInput
              v-model="guildIdModel"
              label="所属ギルドID"
              shadow
              :disabled="!isEditMode || !canEditGuildId"
            />
            <RMInput
              v-model="affiliationNumModel"
              label="所属No"
              type="number"
              shadow
              :disabled="!isEditMode"
            />
          </div>
          <div class="user-workspace-field">
            <div class="user-workspace-field__label">プレイヤー状況</div>
            <Dropdown
              v-model="situationModel"
              :options="situationOptions"
              placeholder="状況を選択"
              class="user-workspace-dropdown"
              :disabled="!isEditMode"
            />
          </div>
        </section>

        <Divider />

        <section>
          <div class="rm-section-title">日付情報</div>
          <div class="rm-form-grid rm-form-grid--three">
            <RMInput
              v-model="affiliationDateModel"
              label="ギルド所属日"
              type="date"
              :date="true"
              shadow
              :disabled="!isEditMode"
            />
            <RMInput
              v-model="gameStartDateAtModel"
              label="ゲーム開始日時"
              type="date"
              :date="true"
              shadow
              :disabled="!isEditMode"
            />
            <RMInput
              v-model="birthDateModel"
              label="誕生日"
              type="date"
              :date="true"
              shadow
              :disabled="!isEditMode"
            />
          </div>
        </section>

        <Divider />

        <section>
          <div class="rm-section-title">連絡先</div>
          <div class="rm-form-grid rm-form-grid--two">
            <RMInput
              v-model="emailModel"
              label="登録メールアドレス"
              type="email"
              shadow
              :disabled="true"
            />
            <RMInput
              v-model="phoneModel"
              label="登録電話番号"
              type="tel"
              shadow
              :disabled="!isEditMode"
            />
          </div>
        </section>
      </div>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.user-workspace-card {
  border-radius: 24px;
  overflow: hidden;
}

.user-workspace-section {
  padding: clamp(16px, 2.2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.user-workspace-section__description {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.7;
}

.user-workspace-section section {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.user-workspace-field {
  margin-top: 14px;
}

.user-workspace-field__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.user-workspace-dropdown {
  width: 100%;
}

@media (max-width: 767px) {
  .user-workspace-section {
    padding: 16px;
  }

  .user-workspace-section section {
    padding: 12px;
  }
}
</style>
