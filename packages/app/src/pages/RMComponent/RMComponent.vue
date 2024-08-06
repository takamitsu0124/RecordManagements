<script lang="ts" setup>
import { menu } from '../../layouts/index'
import { nextTick, ref } from 'vue'
// import RMHamburger from 'src/components/RMHamburger/RMHamburger.vue'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import { useRouter } from 'vue-router'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'

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
    await nextTick(() => {
      console.log('test')
    })
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
  background: #707070
</style>
