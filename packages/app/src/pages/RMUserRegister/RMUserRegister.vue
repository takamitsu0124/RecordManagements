<script lang="ts" setup>
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppRole } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { globalRegisterForm } from './register'

const { registerInfo, defaultRegisterInfo, validateRegisterInfo } =
  globalRegisterForm()
const router = useRouter()
const errors = ref<{ field: string; message: string }>({
  field: '',
  message: '',
})
const onFocus = ref<number>(0)
const roleOptions: { label: string; value: AppRole }[] = [
  { label: 'General Member', value: 'member' },
  { label: 'Guild Admin', value: 'guild_admin' },
  { label: 'Admin', value: 'admin' },
]

const registerConfirm = () => {
  errors.value.message = validateRegisterInfo(registerInfo.value)?.message ?? ''
  errors.value.field = validateRegisterInfo(registerInfo.value)?.field ?? ''
  if (errors.value.message === '') {
    router.push({ name: 'RMUserRegisterConfirm' })
  }
}

const resetRegisterForm = () => {
  registerInfo.value = defaultRegisterInfo()
  errors.value = {
    field: '',
    message: '',
  }
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <Card class="user-register-card">
      <template #content>
        <div class="user-register-card__content">
          <RMPageHeader
            title="ユーザー登録"
            subtitle="Admin 専用"
            description="メールアドレス、表示名、所属ギルド、権限を確認しながら登録内容を作成します。"
            icon="pi pi-user-plus"
          />

          <div class="rm-inline-note">
            この画面では入力内容を整えます。実際の登録実行は次の確認画面で行います。
          </div>

          <div class="rm-form-grid rm-form-grid--two">
            <RMInput
              v-model="registerInfo.email"
              :class="{ _input_active: onFocus === 1 }"
              label="メールアドレス"
              type="email"
              requiredText="※必須"
              placeholder="sample@gmail.com"
              autocomplete="email"
              shadow
              @onFocus="onFocus = 1"
              @onBlur="onFocus = 0"
              :error2="errors.field === 'email'"
            />
            <RMInput
              v-model="registerInfo.password"
              :class="{ _input_active: onFocus === 2 }"
              label="パスワード"
              type="password"
              requiredText="※必須"
              placeholder="aa1234"
              autocomplete="new-password"
              shadow
              @onFocus="onFocus = 2"
              @onBlur="onFocus = 0"
              :error2="errors.field === 'password'"
            />
            <RMInput
              v-model="registerInfo.name"
              :class="{ _input_active: onFocus === 3 }"
              label="表示名"
              type="text"
              requiredText="※必須"
              placeholder="displayName"
              autocomplete="name"
              shadow
              @onFocus="onFocus = 3"
              @onBlur="onFocus = 0"
              :error2="errors.field === 'name'"
            />
            <RMInput
              v-model="registerInfo.guildId"
              :class="{ _input_active: onFocus === 4 }"
              label="所属ギルドID"
              type="text"
              placeholder="guild-id (任意)"
              autocomplete="off"
              shadow
              @onFocus="onFocus = 4"
              @onBlur="onFocus = 0"
            />
          </div>

          <div class="user-register-role">
            <div class="user-register-role__label">権限</div>
            <div class="user-register-role__help">
              迷った場合は通常メンバーを選び、必要な権限だけ後から付与してください。
            </div>
            <Dropdown
              v-model="registerInfo.role"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              class="user-register-role__dropdown"
              placeholder="権限を選択"
            />
          </div>

          <p v-if="errors.message" class="user-register-error">
            {{ errors.message }}
          </p>

          <div class="rm-actions user-register-actions">
            <RMButton
              label="ホームへ"
              flat
              color="grey"
              @click="router.push({ name: 'RMHome' })"
            />
            <RMButton
              label="入力をクリア"
              flat
              color="grey"
              @click="resetRegisterForm"
            />
            <RMButton
              label="確認へ進む"
              color="primary"
              @click="registerConfirm"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="sass" scoped>
.user-register-card
	width: min(100%, 960px)
	overflow: hidden

.user-register-card__content
	display: flex
	flex-direction: column
	gap: 16px
	padding: clamp(16px, 2vw, 22px)

.user-register-role
	display: flex
	flex-direction: column
	gap: 8px
	padding: 14px
	border-radius: 18px
	border: 1px solid #e2e8f0
	background: rgba(248, 250, 252, 0.88)

.user-register-role__label
	font-size: 14px
	font-weight: 700
	color: #475569

.user-register-role__help
	font-size: 13px
	line-height: 1.6
	color: #64748b

.user-register-role__dropdown
	width: 100%

.user-register-error
	margin: 0
	padding: 12px 14px
	border-radius: 16px
	background: rgba(239, 68, 68, 0.08)
	border: 1px solid rgba(239, 68, 68, 0.16)
	color: #b91c1c
	font-weight: 700

._input_active::v-deep(._standard_or_shadow_width)
	outline: 1px solid #707070

@media (max-width: 767px)
	.user-register-actions
		flex-direction: column
		align-items: stretch
</style>
