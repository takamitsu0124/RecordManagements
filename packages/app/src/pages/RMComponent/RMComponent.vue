<script lang="ts" setup>
import { menu } from '../../layouts/index'
import { ref } from 'vue'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import RMCard from 'src/components/RMCard/RMCard.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMTab from 'src/components/RMTab/RMTab.vue'
import RMLogo from 'src/components/RMLogo/RMLogo.vue'
import { useRouter } from 'vue-router'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { useToast } from 'src/components/RMToast/RMToast'
import { usePopupFun } from 'src/components/RMPopup/RMPopupFun'

const router = useRouter()
const isOpen = ref<boolean>(false)
const inputModel = ref<string>('')
const tabModel = ref<string>('テスト①')

const logout = () => {
  console.log('logout')
}

const menuClick = (currentMenu: { name: string; url: string }) => {
  void router.push({ path: currentMenu.url })
}

const spinnerStart = () => {
  void useSpinner(async () => {
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve('')
        void useToast({
          toastTitle: 'テスト',
          toastMovingTime: 3
        })
      }, 1500)
    )
  })
}

const popupStart = () => {
  usePopupFun({
    question: 'ログアウトします。<br />よろしいですか？',
    rightText: 'はい',
    leftText: 'いいえ',
    rightColor: 'primary',
    leftColor: 'black',
    onLeftButtonClick: () => {
      console.log('キャンセル')
    },
    onRightButtonClick: () => {
      console.log('完了')
    }
  })
}
</script>

<template>
  <div>
    <RMHeader
      v-model:hamOpen="isOpen"
      :menu="menu"
      @logout="logout"
      @menuClick="menuClick"
    />
    <div class="page_container">
      <div class="demo-actions">
        <RMButton
          label="スピナーテスト"
          color="primary"
          width="220px"
          @click="spinnerStart"
        />
        <RMButton
          label="ポップアップテスト"
          outline
          width="220px"
          @click="popupStart"
        />
      </div>
      <RMCard :cardShape="'roundM'" :shadowDirection="'allSide'" class="_test">
        <div class="demo-card-content">カードテスト</div>
      </RMCard>
      <RMInput v-model="inputModel" shadow date label="日付入力" />
      <RMButton
        :buttonType="'standard'"
        :buttonShape="'round'"
        label="テスト"
        width="220px"
      />
      <RMTab v-model="tabModel" />
      <RMLogo marginTop="20px" marginBottom="10px" />
    </div>
  </div>
</template>

<style lang="sass" scoped>
.page_container
  min-height: 100svh
  padding: 110px 24px 40px
  display: flex
  flex-direction: column
  gap: 24px
  align-items: center

.demo-actions
  display: flex
  flex-wrap: wrap
  justify-content: center
  gap: 12px

._test
  width: min(100%, 420px)

.demo-card-content
  padding: 28px
  text-align: center
  font-weight: 700
</style>
