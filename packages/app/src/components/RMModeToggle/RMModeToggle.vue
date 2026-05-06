<script lang="ts" setup>
import { computed } from 'vue'
import ToggleButton from 'primevue/togglebutton'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  onLabel: { type: String, default: '編集モード' },
  offLabel: { type: String, default: '閲覧モード' },
  onIcon: { type: String, default: 'pi pi-pencil' },
  offIcon: { type: String, default: 'pi pi-eye' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const helperText = computed(() => {
  if (props.disabled) return ''

  return props.modelValue
    ? `押すと${props.offLabel}に戻ります`
    : `押すと${props.onLabel}に切り替わります`
})
</script>

<template>
  <div
    class="rm-mode-toggle-shell"
    :class="{ 'is-actionable': !disabled, 'is-disabled': disabled }"
  >
    <ToggleButton
      v-model="model"
      :onLabel="onLabel"
      :offLabel="offLabel"
      :onIcon="onIcon"
      :offIcon="offIcon"
      :disabled="disabled"
      class="rm-mode-toggle"
    />
    <div v-if="helperText" class="rm-mode-toggle__hint">
      <i class="pi pi-chevron-right" aria-hidden="true" />
      <span>{{ helperText }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rm-mode-toggle-shell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.rm-mode-toggle {
  min-width: 162px;
}

.rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton) {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: rm-mode-toggle-pulse 2.6s ease-in-out infinite;
}

.rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton:hover),
.rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton:focus-visible) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(59, 130, 246, 0.18);
}

.rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton:active) {
  transform: scale(0.98);
}

.rm-mode-toggle__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.92);
  border: 1px solid rgba(96, 165, 250, 0.45);
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
}

.rm-mode-toggle__hint .pi {
  font-size: 0.8rem;
  animation: rm-mode-toggle-pointer 1.6s ease-in-out infinite;
}

@keyframes rm-mode-toggle-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0),
      0 10px 24px rgba(15, 23, 42, 0.08);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(96, 165, 250, 0.18),
      0 14px 30px rgba(59, 130, 246, 0.16);
  }
}

@keyframes rm-mode-toggle-pointer {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton),
  .rm-mode-toggle__hint .pi {
    animation: none;
  }

  .rm-mode-toggle-shell.is-actionable :deep(.p-togglebutton) {
    transition: none;
  }
}
</style>
