<script setup lang="ts">
import { ref } from 'vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import { useRouter } from 'vue-router'

const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const router = useRouter()
</script>
<template>
  <div class="_login_outer_container">
    <div class="_login_inner_container">
      <div class="_login_form">
        <div class="_logo"><img src="~/assets/logo.png" /></div>
        <div class="_title">RecordManagement</div>
        <div class="_botton_area">
          <RMButton
            class="_selectBtn"
            @click="
              () => {
                router.push('/RMMailLogin')
              }
            "
            label="メールでログイン"
            :buttonShape="'ellipse'"
            :buttonType="'standard'"
            bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
          />
          <div class="_invite_notice">
            アカウント作成は管理者のみ可能です。招待や登録が必要な場合は管理者へ依頼してください。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="sass" scoped>
// APP
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
  padding: 35px
  position: fixed
  left: 0
  bottom: 35px
  width: 100%

._logo
  width: 55%
  margin: 0 auto 25px auto
  img
    width: 100%

._caution
  width: 100%
  color: #d20000
  text-align: center

._selectBtn
  width: 100% !important
  height: 50px !important
  margin-bottom: 40px !important
  user-select: none

._title
  font-size: 31px
  color: #333333
  font-weight: 900
  text-shadow: 0 3px 6px rgba(0,0,0,0.16)
  padding-bottom: 40px
._loginBtn
  width: 100%
  margin-top: 10px

._login_form
  padding: 20px
  div
    margin: 10px 0 !important

._botton_area
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  margin-bottom: 20px

._invite_notice
  width: 100%
  max-width: 420px
  margin-top: 12px
  color: #475569
  font-size: 14px
  line-height: 1.7
  text-align: center
// PC
@media screen and (min-width: 768px)
  ._login_form
    padding: 20px
    div
      margin: 10px 0 !important
  ._title
    font-size: 90px
    text-align: center

  ._logo
    width: 180px
    margin: 0 auto
    display: block
    position: absolute
    bottom: 100%
    left: 50%
    transform: translateX(-50%)

  ._selectBtn
    width: 300px !important
    font-size: 16px !important
    margin: 0 auto
    margin-bottom: 50px
</style>
