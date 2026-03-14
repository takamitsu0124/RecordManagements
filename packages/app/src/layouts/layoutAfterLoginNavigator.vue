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

const menuClick = (currentMenu: { name: string; url: string; isShow: boolean }) => {
  router.push({ path: currentMenu.url })
}
</script>

<template>
  <div class="after-login-layout">
    <RMHeader
      v-model:hamOpen="isOpen"
      :menu="menu"
      @logout="logout"
      @menuClick="menuClick"
    />
    <main class="after-login-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.after-login-layout {
  min-height: 100vh;
  background: v-bind(backgroundImg);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.after-login-layout__content {
  padding-top: 72px;
}
</style>
