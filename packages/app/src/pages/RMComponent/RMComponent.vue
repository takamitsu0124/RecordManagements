<script lang="ts" setup>
import { menu } from '../../layouts/index'
import { ref } from 'vue'
// import RMHamburger from 'src/components/RMHamburger/RMHamburger.vue'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import RMCard from 'src/components/RMCard/RMCard.vue'
import RMDrawer from 'src/components/RMDrawer/RMDrawer.vue'
import RMUnderDrawer from 'src/components/RMUnderDrawer/RMUnderDrawer.vue'
import { useRouter } from 'vue-router'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { useToast } from 'src/components/RMToast/RMToast'
import { usePopupFun } from 'src/components/RMPopup/RMPopupFun'

const router = useRouter()

const isOpen = ref<boolean>(false)
const drawerOpen = ref<boolean>(false)
const underDrawerOpen = ref<boolean>(false)
const drawerHeight = ref<string>(`${window.innerHeight - 50}px`)

const logout = () => {
  console.log('logout')
}

const menuClick = (menu: { name: string; url: string }) => {
  router.push({ path: menu.url })
}

const spinnerStart = () => {
  useSpinner(async () => {
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve('')
        useToast({
          toastTitle: 'テスト',
          toastMovingTime: 3,
        })
      }, 5000)
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
    },
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
      <q-btn label="スピナーテスト" @click="spinnerStart" />
      <q-btn label="ポップアップテスト" @click="popupStart" />
      <RMCard :cardShape="'square'" :shadowDirection="'allSide'" class="_test">
        カードテスト
      </RMCard>
      <q-btn label="ドロワーオープン" @click="drawerOpen = !drawerOpen" />
      <RMDrawer v-model="drawerOpen" :drawerHeight="drawerHeight">
        <div v-for="n in 20" :key="n + 1">{{ n }}</div>
      </RMDrawer>
      <q-btn
        label="アンダードロワーオープン"
        @click="underDrawerOpen = !underDrawerOpen"
      />
      <RMUnderDrawer
        v-model="underDrawerOpen"
        :drawerHeight="1000"
        scroll
        isdrawerArea
      >
        <div v-for="n in 20" :key="n + 1">{{ n }}</div>
      </RMUnderDrawer>
    </div>
  </div>
</template>

<style lang="sass" scoped>
.page_container
  margin-top: 60px
  height: 100svh
._test
  margin: 30px 15px 0 15px
  height: 40px
</style>
