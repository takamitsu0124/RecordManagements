<script setup lang="ts">
import { ref } from 'vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import { useRouter } from 'vue-router'
import { mailLogin } from '@rm/utils'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { useToast } from 'src/components/RMToast/RMToast'
import { auth } from '@rm/db'

const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isError = ref([false, false])
const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const signIn = async () => {
  // 処理中はスピナーを表示
  await useSpinner(async () => {
    await mailLogin(auth, email.value, password.value, router, '/RMHome')
      .then(() => {
        useToast({
          toastTitle: 'ログインしました',
          toastMovingTime: 3,
        })
        return router.push('/RMHome')
      })
      .catch((error) => {
        console.log('ログインエラー', error.code)
        // 失敗した場合
        // Authのエラーコードごとにエラーメッセージを表示する
        if (error.code === 'auth/invalid-email') {
          // メールアドレスの形式がおかしい
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        } else if (error.code === 'auth/user-disabled') {
          // ユーザが無効になっている
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        } else if (error.code === 'auth/user-not-found') {
          // ユーザが存在しない(メールアドレスが存在しない)
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        } else if (error.code === 'auth/wrong-password') {
          // パスワードが間違っている
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        } else if (error.code === 'auth/too-many-requests') {
          // 5回パスワードを間違えた
          errorMessage.value =
            '入力上限に達しました。パスワードの再設定をお願いします'
        } else if (error.code === 'auth/invalid-credential') {
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        } else {
          errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
        }
        //エラーでログインできない場合にはinputを赤くする
        if (error) {
          {
            isError.value[0] = true
            isError.value[1] = true
          }
        }
      })
  })
}
</script>
<template>
  <div class="_login_outer_container">
    <div class="_login_inner_container">
      <div class="_login_form">
        <div class="_logo"><img src="~/assets/logo.png" /></div>
        <div class="_title">RecordManagement</div>
        <div class="_botton_area">
          <RMInput
            class="_login_input"
            v-model="email"
            type="text"
            label="ログインID"
            placeholder="sample@gmail.com"
            :error2="!!errorMessage"
            shadow
          />
        </div>
        <div class="_botton_area">
          <RMInput
            class="_login_input"
            v-model="password"
            type="password"
            label="パスワード"
            placeholder="aa12345678"
            :error2="!!errorMessage"
            shadow
          />
        </div>
        <div class="_caution">{{ errorMessage }}</div>
        <div class="_divForBtn">
          <RMButton
            class="_loginBtn"
            height="50px"
            width="100%"
            label="ログイン"
            bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
            @click="
              () => {
                signIn()
              }
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="sass" scoped>
._login_outer_container
  width: 100vw
  background: v-bind(bgImgPath)
  background-size: cover
  display: flex
  align-items: center
  justify-content: center
  min-height: 100vh
  padding: 20px

._login_inner_container
  width: 29.17vw
  min-width: 375px
  padding: 40px 30px
  background: rgba(255, 255, 255, 0.85)
  backdrop-filter: blur(10px)
  -webkit-backdrop-filter: blur(10px)
  border-radius: 20px
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37)
  border: 1px solid rgba(255, 255, 255, 0.18)

._login_form
  width: 100%

._logo
  width: 150px
  margin: 0 auto 20px
  img
    width: 100%

._title
  font-size: 28px
  color: #333333
  font-weight: 900
  text-shadow: 0 2px 4px rgba(0,0,0,0.1)
  text-align: center
  margin-bottom: 30px

._botton_area
  margin-bottom: 20px

._login_input
  width: 100%

._caution
  width: 100%
  color: #d20000
  font-weight: bold
  text-align: center
  min-height: 20px
  margin-bottom: 20px

._divForBtn
  margin-top: 30px

._loginBtn
  font-size: 16px

@media screen and (min-width: 768px)
  ._title
    font-size: 36px
</style>
