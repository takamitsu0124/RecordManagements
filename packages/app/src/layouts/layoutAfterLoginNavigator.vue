<script lang="ts" setup>
import { signOut } from 'firebase/auth'
import { auth } from '@rm/db'
import RMHeader from 'src/components/RMHeader/RMHeader.vue'
import { ref } from 'vue'
import { menu } from './index'
import { useRouter } from 'vue-router'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'

const router = useRouter()
const backgroundImg = ref<string>(
  'url(https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Fhome_background2.png?alt=media&token=7123f3bf-11d6-42ec-903b-0a98659b63b3)'
)
const isOpen = ref<boolean>(false)

const logout = async () => {
  try {
    await signOut(auth)
    notifySuccess('ログアウトしました。')
    await router.push({ name: 'RMPreLogin' })
  } catch (error) {
    notifyError('ログアウトに失敗しました。')
    console.error('Logout failed:', error)
  }
}

const menuClick = (currentMenu: { name: string; url: string; isShow: boolean }) => {
  if (!currentMenu.url) {
    return
  }
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
      <div class="after-login-layout__content-shell">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.after-login-layout {
  position: relative;
  min-height: var(--rm-viewport-height);
  isolation: isolate;
  overflow-x: clip;
  background-color: #edf4fb;
  background-image:
    linear-gradient(180deg, rgba(239, 246, 255, 0.84), rgba(248, 250, 252, 0.9)),
    v-bind(backgroundImg);
  background-size: cover;
  background-position: center;
}

.after-login-layout::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at top right, rgba(161, 194, 225, 0.3), transparent 32%),
    radial-gradient(circle at left center, rgba(123, 77, 129, 0.14), transparent 28%);
  pointer-events: none;
}

.after-login-layout__content {
  padding-top: calc(var(--rm-header-height) + 8px);
  padding-bottom: 20px;
}

.after-login-layout__content-shell {
  min-height: calc(var(--rm-viewport-height) - var(--rm-header-height));
}

@media (max-width: 1023px) {
  .after-login-layout {
    background-attachment: scroll;
  }
}
</style>
