<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'ErrorNotFound'
})

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/')
}
</script>

<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-code">404</div>
      <div class="error-title">ページが見つかりませんでした</div>
      <p class="error-message">
        URL
        が変わったか、すでに削除された可能性があります。ホームから目的の画面に入り直してください。
      </p>
      <div class="error-actions">
        <Button
          label="前の画面へ"
          icon="pi pi-arrow-left"
          outlined
          class="error-button error-button--secondary"
          @click="goBack"
        />
        <Button
          label="ホームへ戻る"
          icon="pi pi-home"
          class="error-button"
          @click="router.push('/')"
        />
      </div>
    </div>
  </div>
</template>

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
  font-weight: 800;
}

.error-message {
  margin: 14px 0 0;
  line-height: 1.7;
  color: #475569;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
  justify-content: center;
}

.error-button {
  min-width: 180px;
}

@media (max-width: 767px) {
  .error-actions {
    flex-direction: column;
  }

  .error-button {
    width: 100%;
  }
}
</style>
