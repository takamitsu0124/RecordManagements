<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-code">404</div>
      <div class="error-title">Oops. Nothing here...</div>
      <Button label="Go Home" icon="pi pi-home" class="error-button" @click="router.push('/')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'ErrorNotFound',
})

const router = useRouter()
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #7ca6cb, #4b6982);
}

.error-card {
  width: min(100%, 520px);
  padding: 40px 28px;
  border-radius: 24px;
  text-align: center;
  background: rgba(255, 255, 255, 0.92);
  color: #1f2937;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22);
}

.error-code {
  font-size: clamp(96px, 22vw, 180px);
  line-height: 1;
  font-weight: 900;
  color: #4b6982;
}

.error-title {
  margin-top: 16px;
  font-size: clamp(24px, 5vw, 36px);
  opacity: 0.78;
}

.error-button {
  margin-top: 28px;
}
</style>
