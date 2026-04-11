<script lang="ts" setup>
import RMCard from 'src/components/RMCard/RMCard.vue'
import RMLogo from 'src/components/RMLogo/RMLogo.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import { globalRegisterForm } from './register'
import { maskPassword, createUser, dbUserCreate } from '@rm/utils'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { usePopupFun } from 'src/components/RMPopup/RMPopupFun'
import { useToast } from 'src/components/RMToast/RMToast'

const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Fregister_background.jpeg?alt=media&token=2a3fd22a-6f76-4c06-90a0-83152a09179f") no-repeat center'
)
const router = useRouter()
const { registerInfo, defaultRegisterInfo } = globalRegisterForm()
const uid = ref<string>('')
const errorMsg = ref<string>('')
const roleLabels: Record<string, string> = {
  admin: 'Admin',
  guild_admin: 'Guild Admin',
  member: 'General Member',
}

const registerSave = async () => {
  await useSpinner(async () => {
    let userCredential = ''
    try {
      // auth作成
      userCredential = await createUser(
        registerInfo.value.email,
        registerInfo.value.password
      )
      // uidを取得
      uid.value = userCredential
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : String(error)

      if (errorCode === 'auth/email-already-in-use') {
        errorMsg.value = 'このメールアドレスは既に登録されています'
      }
      if (errorCode === 'auth/invalid-email') {
        errorMsg.value = 'メールアドレスの形式が無効です'
      }
      if (errorCode === 'auth/operation-not-allowed') {
        errorMsg.value = 'メール/パスワードログインが有効になっていません。'
      }
      if (errorCode === 'auth/weak-password') {
        errorMsg.value = 'パスワードが弱すぎます'
      }
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
    //  uidがなかったらリターン
    if (!uid.value) return

    try {
      // データベースユーザーの作成
      await dbUserCreate(uid.value, registerInfo.value).then(() => {
        useToast({
          toastTitle: 'ユーザー登録が完了しました',
          toastMovingTime: 3,
        })
      })
      registerInfo.value = defaultRegisterInfo()
      await router.push({ name: 'RMHome' })
    } catch (error) {
      console.error(error)
    }
  })
}
</script>

<template>
  <div class="_user_register_confirm_outer_container">
    <div class="_user_register_confirm_inner_container">
      <div class="_app_logo_area">
        <RMLogo margin_bottom="10px" />
      </div>
      <RMCard
        class="_user_register_card"
        :cardShape="'square'"
        :shadowDirection="'allSide'"
      >
        <div class="_register_confirm_container">
          <div class="_content">
            <div class="_label">メールアドレス</div>
            <div class="_value">
              {{ `　${!!registerInfo.email ? registerInfo.email : '-'}` }}
            </div>
          </div>
          <div class="_content">
            <div class="_label">パスワード</div>
            <div class="_value">
              {{
                `　${
                  !!registerInfo.password
                    ? maskPassword(registerInfo.password)
                    : '-'
                }`
              }}
            </div>
          </div>
          <div class="_content">
            <div class="_label">表示名</div>
            <div class="_value">
              {{ `　${!!registerInfo.name ? registerInfo.name : '-'}` }}
            </div>
          </div>
          <div class="_content">
            <div class="_label">所属ギルドID</div>
            <div class="_value">
              {{ `　${!!registerInfo.guildId ? registerInfo.guildId : '-'}` }}
            </div>
          </div>
          <div class="_content">
            <div class="_label">権限</div>
            <div class="_value">
              {{ `　${roleLabels[registerInfo.role] ?? '-'}` }}
            </div>
          </div>
        </div>
      </RMCard>
      <div class="_btn_area">
        <RMButton
          class="_select_btn"
          @click="registerSave"
          :button-shape="'ellipse'"
          :button-type="'standard'"
          label="登録"
          bgColor="linear-gradient(180deg, #C79BD2, #7B4D81)"
        />
        <RMButton
          class="_select_btn"
          @click="
            () => {
              router.push({ name: 'RMUserRegister' })
            }
          "
          :button-shape="'ellipse'"
          :button-type="'standard'"
          label="戻る"
          bgColor="linear-gradient(180deg, #D3D3D3, #696969)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="sass" scoped>
// SP
._user_register_confirm_outer_container
  background: v-bind(bgImgPath)
  background-size: cover
  display: block
  overflow: scroll
  position: fixed
  left: 0
  right: 0
  bottom: 0
  top: 0
._user_register_confirm_inner_container
  padding: 5px
  width: 100%
._app_logo_area
  display: flex
  justify-content: center
  align-items: center
._user_register_card
  margin: 5px 20px
._register_confirm_container
  display: flex
  flex-direction: column
  justify-content: center
  padding: 10px
._content
  display: flex
  flex-direction: column
  padding: 14px
  border-bottom: 1px solid #ddd
._label
  font-size: 14px
  color: #333
  margin-bottom: 4px
  font-weight: bold
._value
  font-size: 16px
  color: #555
  background-color: #f9f9f9
  padding: 8px
  border-radius: 4px
  border: 1px solid #ddd
._btn_area
  display: flex
  gap: 10px
  margin: 20px auto
// PC
@media screen and (min-width: 768px)
  ._user_register_confirm_inner_container
    padding: 50px 400px
    position: fixed
    left: 0
    bottom: 40px
    width: 100%
  ._btn_area
    display: flex
    gap: 30px
    margin: 30px auto
</style>
