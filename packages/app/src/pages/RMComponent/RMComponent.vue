<script lang="ts" setup>
import { menu } from '../../layouts/index'
import { ref } from 'vue'
// import RMHamburger from 'src/components/RMHamburger/RMHamburger.vue'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import { useRouter } from 'vue-router'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { useToast } from 'src/components/RMToast/RMToast'

const router = useRouter()

const isOpen = ref<boolean>(false)

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
    </div>
  </div>
</template>

<style lang="sass" scoped>
.page_container
  margin-top: 60px
  height: 100svh
</style>
