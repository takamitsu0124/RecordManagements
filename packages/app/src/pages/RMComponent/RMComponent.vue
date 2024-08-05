<script lang="ts" setup>
import { menu } from '../../layouts/index'
import { ref } from 'vue'
// import RMHamburger from 'src/components/RMHamburger/RMHamburger.vue'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isOpen = ref<boolean>(false)

const logout = () => {
  console.log('logout')
}

const menuClick = (menu: { name: string; url: string }) => {
  router.push({ path: menu.url })
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
  </div>
</template>

<style lang="sass" scoped>
// $
</style>
