<script lang="ts" setup>
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    severity?: 'danger' | 'warn' | 'primary'
    loading?: boolean
  }>(),
  {
    title: '確認',
    confirmLabel: '実行する',
    cancelLabel: 'キャンセル',
    severity: 'primary',
    loading: false
  }
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const onCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
const onConfirm = () => emit('confirm')
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :style="{ width: 'min(92vw, 26rem)' }"
    class="rm-confirm-dialog"
    @update:visible="(value) => emit('update:visible', value)"
  >
    <p class="rm-confirm-dialog__message">{{ message }}</p>
    <template #footer>
      <Button
        type="button"
        :label="cancelLabel"
        severity="secondary"
        text
        :disabled="loading"
        @click="onCancel"
      />
      <Button
        type="button"
        :label="confirmLabel"
        :severity="severity === 'primary' ? undefined : severity"
        :loading="loading"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<style lang="scss" scoped>
.rm-confirm-dialog__message {
  margin: 0;
  color: var(--rm-text-soft);
  line-height: 1.7;
}
</style>
