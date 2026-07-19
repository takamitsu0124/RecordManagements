<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

type WheelNumberOption = { label: string; value: number }

const props = withDefaults(
  defineProps<{
    modelValue: number | null | undefined
    options: WheelNumberOption[]
    label?: string
    placeholder?: string
    disabled?: boolean
    dialogHeader?: string
    clearLabel?: string
  }>(),
  {
    label: '',
    placeholder: '選択してください',
    disabled: false,
    dialogHeader: '値を選択',
    clearLabel: '未設定にする'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const ITEM_HEIGHT = 44

const isOpen = ref(false)
const draftIndex = ref(0)
const columnRef = ref<HTMLElement | null>(null)

const displayLabel = computed(() => {
  const found = props.options.find(
    (option) => option.value === props.modelValue
  )
  return found?.label ?? ''
})

const indexOfValue = (value: number | null | undefined) => {
  if (value === null || value === undefined) return -1
  return props.options.findIndex((option) => option.value === value)
}

const scrollColumnTo = (index: number, smooth = false) => {
  const el = columnRef.value
  if (!el) return
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
}

const openPicker = () => {
  if (props.disabled || props.options.length === 0) return

  const currentIndex = indexOfValue(props.modelValue)
  draftIndex.value = currentIndex >= 0 ? currentIndex : 0

  isOpen.value = true

  void nextTick(() => {
    scrollColumnTo(draftIndex.value)
  })
}

let scrollTimer: ReturnType<typeof setTimeout> | null = null

const onScroll = () => {
  if (scrollTimer) clearTimeout(scrollTimer)

  scrollTimer = setTimeout(() => {
    const el = columnRef.value
    if (!el) return

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clamped = Math.min(Math.max(rawIndex, 0), props.options.length - 1)
    draftIndex.value = clamped
    scrollColumnTo(clamped, true)
  }, 120)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()

  const el = columnRef.value
  if (!el) return

  const delta = event.key === 'ArrowDown' ? ITEM_HEIGHT : -ITEM_HEIGHT
  el.scrollBy({ top: delta, behavior: 'smooth' })
}

const onConfirm = () => {
  const option = props.options[draftIndex.value]
  emit('update:modelValue', option ? option.value : null)
  isOpen.value = false
}

const onClear = () => {
  emit('update:modelValue', null)
  isOpen.value = false
}
</script>

<template>
  <div class="rm-wheel-number">
    <div v-if="label" class="rm-wheel-number__label">{{ label }}</div>
    <button
      type="button"
      class="rm-wheel-number__trigger"
      :class="{ 'rm-wheel-number__trigger--disabled': disabled }"
      :disabled="disabled"
      @click="openPicker"
    >
      <span :class="{ 'rm-wheel-number__placeholder': !displayLabel }">
        {{ displayLabel || placeholder }}
      </span>
      <i class="pi pi-chevron-down rm-wheel-number__icon" aria-hidden="true" />
    </button>

    <Dialog
      v-model:visible="isOpen"
      modal
      dismissableMask
      :draggable="false"
      :header="dialogHeader"
      :style="{ width: 'min(88vw, 18rem)' }"
      class="rm-wheel-number-dialog"
    >
      <div class="rm-wheel-number-scroll-row">
        <div class="rm-wheel-number-highlight" aria-hidden="true" />

        <div
          ref="columnRef"
          class="rm-wheel-number-column"
          tabindex="0"
          role="listbox"
          :aria-label="dialogHeader"
          @scroll="onScroll"
          @keydown="onKeydown"
        >
          <div class="rm-wheel-number-column__pad" />
          <div
            v-for="(option, index) in options"
            :key="option.value"
            class="rm-wheel-number-item"
            role="option"
            :aria-selected="index === draftIndex"
            :class="{ 'rm-wheel-number-item--active': index === draftIndex }"
          >
            {{ option.label }}
          </div>
          <div class="rm-wheel-number-column__pad" />
        </div>
      </div>

      <template #footer>
        <Button
          type="button"
          :label="clearLabel"
          text
          severity="secondary"
          @click="onClear"
        />
        <Button
          type="button"
          label="キャンセル"
          severity="secondary"
          outlined
          @click="isOpen = false"
        />
        <Button type="button" label="決定" @click="onConfirm" />
      </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.rm-wheel-number {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rm-wheel-number__label {
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.rm-wheel-number__trigger {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.92);
  color: #1f2937;
  font-family: inherit;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rm-wheel-number__trigger:focus-visible {
  outline: none;
  border-color: #4b6982;
  box-shadow: 0 0 0 4px rgba(75, 105, 130, 0.14);
}

.rm-wheel-number__trigger--disabled {
  background: rgba(241, 245, 249, 0.88);
  color: #64748b;
  cursor: default;
}

.rm-wheel-number__placeholder {
  color: #94a3b8;
}

.rm-wheel-number__icon {
  font-size: 1.1rem;
  color: #64748b;
  flex-shrink: 0;
}

.rm-wheel-number-scroll-row {
  position: relative;
  display: flex;
}

.rm-wheel-number-column {
  flex: 1;
  min-width: 0;
  height: 220px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
}

.rm-wheel-number-column::-webkit-scrollbar {
  display: none;
}

.rm-wheel-number-column__pad {
  height: 88px;
}

.rm-wheel-number-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
  transition: color 0.15s ease, font-size 0.15s ease;
}

.rm-wheel-number-item--active {
  color: var(--rm-primary, #4b6982);
  font-size: 1.1rem;
  font-weight: 800;
}

.rm-wheel-number-highlight {
  position: absolute;
  left: 0;
  right: 0;
  top: 88px;
  height: 44px;
  border-radius: 12px;
  background: rgba(75, 105, 130, 0.08);
  border-top: 1.5px solid rgba(75, 105, 130, 0.35);
  border-bottom: 1.5px solid rgba(75, 105, 130, 0.35);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .rm-wheel-number-item {
    transition: none;
  }
}
</style>
