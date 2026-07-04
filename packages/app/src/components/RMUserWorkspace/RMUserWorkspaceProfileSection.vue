<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import type { AppUser } from '@rm/types'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMSectionEdit from 'src/components/RMSectionEdit/RMSectionEdit.vue'
import RMWheelDatePicker from 'src/components/RMWheelDatePicker/RMWheelDatePicker.vue'
import type { WorkspaceProfile } from './types'

const props = defineProps<{
  user: WorkspaceProfile
  editing: boolean
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
  (e: 'update:editing', value: boolean): void
  (e: 'save'): void
  (e: 'cancel'): void
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

const phoneModel = computed({
  get: () => props.user.phone,
  set: (value: string) => updateUser({ phone: value }),
})

const affiliationDateModel = computed<string | null>({
  get: () => props.affiliationDateStr,
  set: (value) => emit('update:affiliationDateStr', value),
})

const gameStartDateAtModel = computed<string | null>({
  get: () => props.gameStartDateAtStr,
  set: (value) => emit('update:gameStartDateAtStr', value),
})

const birthDateModel = computed<string | null>({
  get: () => props.birthDateAtStr,
  set: (value) => emit('update:birthDateAtStr', value),
})
</script>

<template>
  <Card class="user-workspace-card">
    <template #content>
      <div class="user-workspace-section">
        <RMSectionEdit
          :editing="editing"
          :can-edit="true"
          title="プロフィール"
          @update:editing="(value) => emit('update:editing', value)"
          @cancel="emit('cancel')"
          @save="emit('save')"
        >
          <template #view>
            <div class="workspace-view-grid">
              <div class="workspace-view-field">
                <div class="workspace-view-label">キャラクターネーム</div>
                <div class="workspace-view-value">
                  {{ user.displayName || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">キャラクターネーム(カナ)</div>
                <div class="workspace-view-value">
                  {{ user.displayNameKana || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">所属ギルドID</div>
                <div class="workspace-view-value">
                  {{ user.guildId || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">所属No</div>
                <div class="workspace-view-value">
                  {{ user.affiliationNum || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">プレイヤー状況</div>
                <div class="workspace-view-value">
                  {{ user.situation || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">ギルド所属日</div>
                <div class="workspace-view-value">
                  {{ affiliationDateStr || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">ゲーム開始日時</div>
                <div class="workspace-view-value">
                  {{ gameStartDateAtStr || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">誕生日</div>
                <div class="workspace-view-value">
                  {{ birthDateAtStr || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">登録メールアドレス</div>
                <div class="workspace-view-value">
                  {{ user.email || '未設定' }}
                </div>
              </div>
              <div class="workspace-view-field">
                <div class="workspace-view-label">登録電話番号</div>
                <div class="workspace-view-value">
                  {{ user.phone || '未設定' }}
                </div>
              </div>
            </div>
          </template>

          <template #edit>
            <section>
              <div class="rm-section-title">基本情報</div>
              <div class="rm-form-grid rm-form-grid--two">
                <RMInput
                  v-model="displayNameModel"
                  label="キャラクターネーム"
                  shadow
                />
                <RMInput
                  v-model="displayNameKanaModel"
                  label="キャラクターネーム(カナ)"
                  shadow
                />
                <RMInput
                  v-model="guildIdModel"
                  label="所属ギルドID"
                  shadow
                  :disabled="!canEditGuildId"
                />
                <RMInput
                  v-model="affiliationNumModel"
                  label="所属No"
                  type="number"
                  shadow
                />
              </div>
              <div class="user-workspace-field">
                <div class="user-workspace-field__label">プレイヤー状況</div>
                <Dropdown
                  v-model="situationModel"
                  :options="situationOptions"
                  placeholder="状況を選択"
                  class="user-workspace-dropdown"
                />
              </div>
            </section>

            <Divider />

            <section>
              <div class="rm-section-title">日付情報</div>
              <div class="rm-form-grid rm-form-grid--three">
                <RMWheelDatePicker
                  v-model="affiliationDateModel"
                  label="ギルド所属日"
                />
                <RMWheelDatePicker
                  v-model="gameStartDateAtModel"
                  label="ゲーム開始日時"
                />
                <RMWheelDatePicker v-model="birthDateModel" label="誕生日" />
              </div>
            </section>

            <Divider />

            <section>
              <div class="rm-section-title">連絡先</div>
              <div class="rm-form-grid rm-form-grid--two">
                <RMInput
                  :modelValue="user.email"
                  label="登録メールアドレス"
                  type="email"
                  shadow
                  :disabled="true"
                />
                <RMInput v-model="phoneModel" label="登録電話番号" type="tel" shadow />
              </div>
            </section>
          </template>
        </RMSectionEdit>
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

.workspace-view-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.workspace-view-field {
  padding: 12px 13px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.workspace-view-label {
  margin-bottom: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
}

.workspace-view-value {
  color: #1f2937;
  line-height: 1.6;
  word-break: break-word;
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
