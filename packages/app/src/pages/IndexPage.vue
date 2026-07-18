<script setup lang="ts">
import { onAuthStateChanged } from 'firebase/auth'
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@rm/db'
import RMSpinner from 'src/components/RMSpinner/RMSpinner.vue'

const router = useRouter()
let unsubscribe: (() => void) | undefined

const redirectToLandingPage = () => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    void router.replace({ name: user ? 'RMHome' : 'RMPreLogin' })
  })
}

onMounted(() => {
  void redirectToLandingPage()
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <RMSpinner text="所属情報を確認中..." />
</template>
