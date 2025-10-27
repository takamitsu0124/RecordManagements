<script lang="ts" setup>
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import { ref } from 'vue'
import { menu } from './index'
import { useRouter } from 'vue-router'

const router = useRouter()
const backgroundImg = ref<string>(
  'url(https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Fhome_background2.png?alt=media&token=7123f3bf-11d6-42ec-903b-0a98659b63b3)'
)
const isOpen = ref<boolean>(false)

const logout = () => {
  console.log('logout')
}

const menuClick = (menu: { name: string; url: string; isShow: boolean }) => {
  router.push({ path: menu.url })
}
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="_layout">
    <RMHeader
      v-model:hamOpen="isOpen"
      :menu="menu"
      @logout="logout"
      @menuClick="menuClick"
    />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style lang="sass" scoped>
._layout
  background: v-bind(backgroundImg)
  background-size: cover
</style>
