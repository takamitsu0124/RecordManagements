<script lang="ts" setup>
import Card from 'primevue/card'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUser, dbUserCreate, maskPassword } from '@rm/utils'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { usePopupFun } from 'src/components/RMPopup/RMPopupFun'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import {
  getRegisterErrorMessage,
  globalRegisterForm,
  roleLabels,
} from './register'

const router = useRouter()
const { registerInfo, defaultRegisterInfo } = globalRegisterForm()
const uid = ref<string>('')
const errorMsg = ref<string>('')
const registerSave = async () => {
  await useSpinner(async () => {
    let userCredential = ''
    try {
      userCredential = await createUser(
        registerInfo.value.email,
        registerInfo.value.password
      )
      uid.value = userCredential
    } catch (error) {
      errorMsg.value = getRegisterErrorMessage(error)
      if (errorMsg.value) {
        usePopupFun({
          question: `${errorMsg.value}`,
          rightText: '閉じる',
          rightColor: 'primary',
          leftColor: 'black',
          onRightButtonClick: () => {
            console.log('閉じる')
          },
        })
      }
    }
    if (!uid.value) return

    try {
      await dbUserCreate(uid.value, registerInfo.value)
      notifySuccess('ユーザー登録が完了しました')
      registerInfo.value = defaultRegisterInfo()
      await router.push({ name: 'RMHome' })
    } catch (error) {
      notifyError('ユーザー登録に失敗しました。')
      console.error(error)
    }
  })
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <Card class="user-register-confirm-card">
      <template #content>
        <div class="user-register-confirm-card__content">
          <RMPageHeader
            title="登録内容の確認"
            subtitle="作成前に内容を最終確認"
            description="メールアドレス、表示名、所属ギルド、権限を確認してから登録を実行します。"
            icon="pi pi-check-square"
          />

          <div class="rm-inline-note">
            登録を実行すると新しいユーザーが作成され、完了後はホームへ戻ります。
          </div>

          <div class="user-register-confirm-list">
            <div class="user-register-confirm-item">
              <div class="user-register-confirm-item__label">
                メールアドレス
              </div>
              <div class="user-register-confirm-item__value">
                {{ registerInfo.email || '-' }}
              </div>
            </div>
            <div class="user-register-confirm-item">
              <div class="user-register-confirm-item__label">パスワード</div>
              <div class="user-register-confirm-item__value">
                {{
                  registerInfo.password
                    ? maskPassword(registerInfo.password)
                    : '-'
                }}
              </div>
            </div>
            <div class="user-register-confirm-item">
              <div class="user-register-confirm-item__label">表示名</div>
              <div class="user-register-confirm-item__value">
                {{ registerInfo.name || '-' }}
              </div>
            </div>
            <div class="user-register-confirm-item">
              <div class="user-register-confirm-item__label">所属ギルドID</div>
              <div class="user-register-confirm-item__value">
                {{ registerInfo.guildId || '-' }}
              </div>
            </div>
            <div class="user-register-confirm-item">
              <div class="user-register-confirm-item__label">権限</div>
              <div class="user-register-confirm-item__value">
                {{ roleLabels[registerInfo.role] ?? '-' }}
              </div>
            </div>
          </div>

          <div class="rm-actions user-register-confirm-actions">
            <RMButton
              label="入力に戻る"
              flat
              color="grey"
              @click="router.push({ name: 'RMUserRegister' })"
            />
            <RMButton
              label="この内容で登録"
              color="primary"
              @click="registerSave"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="sass" scoped>
.user-register-confirm-card
	width: min(100%, 820px)
	overflow: hidden

.user-register-confirm-card__content
	display: flex
	flex-direction: column
	gap: 16px
	padding: clamp(16px, 2vw, 22px)

.user-register-confirm-list
	display: grid
	gap: 12px

.user-register-confirm-item
	display: grid
	gap: 6px
	padding: 14px
	border-radius: 18px
	border: 1px solid #e2e8f0
	background: rgba(248, 250, 252, 0.9)

.user-register-confirm-item__label
	font-size: 14px
	font-weight: 700
	color: #475569

.user-register-confirm-item__value
	color: #1f2937
	line-height: 1.6
	word-break: break-word

@media (max-width: 767px)
	.user-register-confirm-actions
		flex-direction: column
		align-items: stretch
</style>
