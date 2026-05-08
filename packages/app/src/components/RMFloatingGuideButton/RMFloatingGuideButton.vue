<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'

withDefaults(
  defineProps<{
    buttonLabel?: string
    buttonAriaLabel?: string
    drawerHeader?: string
    drawerPosition?: 'left' | 'right' | 'top' | 'bottom'
    drawerStyle?: Record<string, string>
  }>(),
  {
    buttonLabel: 'ガイド',
    buttonAriaLabel: '画面ガイドを開く',
    drawerHeader: '画面ガイド',
    drawerPosition: 'right',
    drawerStyle: () => ({ width: 'min(96vw, 32rem)' }),
  }
)

const isDrawerVisible = ref(false)

const openDrawer = () => {
  isDrawerVisible.value = true
}

const closeDrawer = () => {
  isDrawerVisible.value = false
}
</script>

<template>
  <div class="rm-floating-guide-button">
    <Button
      :label="buttonLabel"
      icon="pi pi-question-circle"
      :aria-label="buttonAriaLabel"
      rounded
      severity="info"
      class="rm-floating-guide-button__trigger"
      @click="openDrawer"
    />
  </div>

  <Drawer
    v-model:visible="isDrawerVisible"
    :position="drawerPosition"
    :header="drawerHeader"
    :style="drawerStyle"
  >
    <slot :closeDrawer="closeDrawer" />
  </Drawer>
</template>

<style scoped lang="scss">
.rm-floating-guide-button {
  position: fixed;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 39;
}

.rm-floating-guide-button__trigger {
  min-height: 52px;
  padding-inline: 16px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.22);
}

.rm-floating-guide-button__trigger :deep(.p-button-label) {
  font-weight: 700;
}

@media (max-width: 767px) {
  .rm-floating-guide-button {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .rm-floating-guide-button__trigger {
    width: 46px;
    min-width: 46px;
    min-height: 46px;
    padding-inline: 0;
  }

  .rm-floating-guide-button__trigger :deep(.p-button-label) {
    display: none;
  }

  .rm-floating-guide-button__trigger :deep(.p-button-icon) {
    margin-right: 0;
  }
}
</style>
