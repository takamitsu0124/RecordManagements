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
  background: v-bind(bgImgPath)
  background-size: cover
  display: block
  position: fixed
  left: 0
  right: 0
  bottom: 0
  top: 0

._login_inner_container
  padding: 10px
  position: fixed
  left: 0
  bottom: 35px
  width: 100%

._login_form
  width: 100%
  padding: 20px
> div
  margin: 10px 0 !important

._logo
  width: 55%
  margin: 0 auto
  img
    width: 100%

._caution
  width: 100%
  color: #d20000
  font-weight: bold
  text-align: center

._title
  font-size: 40px
  color: #333333
  font-weight: 900
  text-shadow: 0 3px 6px rgba(0,0,0,0.16)
  padding-bottom: 35px
@media screen and (max-height: 768px)
  ._loginBtn
    width: 100%
    margin-top: 10px
  ._login_form
    padding: 20px
  > div
    margin: 10px 0 !important
  ._title
    font-size: 30px
    text-align: center
  ._logo
    width: 180px
    margin: 0 auto
    display: block
    position: absolute
    bottom: 100%
    left: 50%
    transform: translateX(-50%)
  ._botton_area
    margin-bottom: 20px

  ._divForBtn
    margin-top: 57px

@media screen and (min-width: 768px)
  ._title
    font-size: 90px
    text-align: center

  ._logo
    width: 180px
    display: block
    position: relative
    left: 6%
    transform: translateX(-50%)

  ._loginBtn,._login_input
    width: 300px
    font-size: 16px
    margin: 0 auto
    height: 50px
    margin-bottom: 50px
</style>
