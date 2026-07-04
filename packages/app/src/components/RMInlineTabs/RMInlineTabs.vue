<script lang="ts" setup>
import { ref } from 'vue'

export interface RMInlineTabItem {
  key: string
  label: string
  icon?: string
  badge?: string | number
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    tabs: RMInlineTabItem[]
    scrollOnOverflow?: boolean
    ariaLabel?: string
  }>(),
  {
    scrollOnOverflow: true,
    ariaLabel: 'セクション切り替え',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const tabRefs = ref<(HTMLElement | null)[]>([])
const setTabRef = (el: HTMLElement | null, index: number) => {
  tabRefs.value[index] = el
}

const select = (key: string) => {
  const tab = props.tabs.find((item) => item.key === key)
  if (!tab || tab.disabled) return
  emit('update:modelValue', key)
}

const enabledIndices = () =>
  props.tabs.reduce<number[]>((acc, tab, index) => {
    if (!tab.disabled) acc.push(index)
    return acc
  }, [])

const onKeydown = (event: KeyboardEvent, index: number) => {
  const indices = enabledIndices()
  const currentPos = indices.indexOf(index)
  if (currentPos === -1) return

  let nextPos = currentPos
  if (event.key === 'ArrowRight') {
    nextPos = (currentPos + 1) % indices.length
  } else if (event.key === 'ArrowLeft') {
    nextPos = (currentPos - 1 + indices.length) % indices.length
  } else if (event.key === 'Home') {
    nextPos = 0
  } else if (event.key === 'End') {
    nextPos = indices.length - 1
  } else {
    return
  }

  event.preventDefault()
  const nextIndex = indices[nextPos]
  select(props.tabs[nextIndex].key)
  tabRefs.value[nextIndex]?.focus()
}
</script>

<template>
  <div class="rm-inline-tabs">
    <div
      class="rm-inline-tabs__bar"
      :class="{ 'rm-inline-tabs__bar--scroll': scrollOnOverflow }"
      role="tablist"
      :aria-label="ariaLabel"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="tab.key"
        :ref="(el) => setTabRef(el as HTMLElement | null, index)"
        type="button"
        role="tab"
        :id="`rm-inline-tab-${tab.key}`"
        :aria-selected="modelValue === tab.key"
        :aria-controls="`rm-inline-tabpanel-${tab.key}`"
        :tabindex="modelValue === tab.key ? 0 : -1"
        :disabled="tab.disabled"
        class="rm-inline-tabs__pill"
        :class="{ 'rm-inline-tabs__pill--active': modelValue === tab.key }"
        @click="select(tab.key)"
        @keydown="onKeydown($event, index)"
      >
        <i v-if="tab.icon" :class="tab.icon" aria-hidden="true" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge !== undefined && tab.badge !== null"
          class="rm-inline-tabs__badge"
          >{{ tab.badge }}</span
        >
      </button>
    </div>

    <Transition name="rm-inline-tabs-fade" mode="out-in">
      <div
        :key="modelValue"
        class="rm-inline-tabs__panel"
        role="tabpanel"
        :id="`rm-inline-tabpanel-${modelValue}`"
        :aria-labelledby="`rm-inline-tab-${modelValue}`"
      >
        <slot :active-key="modelValue" />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.rm-inline-tabs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rm-inline-tabs__bar {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--rm-surface-muted);
  border: 1px solid var(--rm-border);
  max-width: 100%;
  width: fit-content;
}

.rm-inline-tabs__bar--scroll {
  overflow-x: auto;
  scrollbar-width: none;
}

.rm-inline-tabs__bar--scroll::-webkit-scrollbar {
  display: none;
}

.rm-inline-tabs__pill {
  appearance: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 9px 16px;
  background: transparent;
  color: var(--rm-text-soft);
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.rm-inline-tabs__pill:hover:not(:disabled):not(.rm-inline-tabs__pill--active) {
  background: rgba(75, 105, 130, 0.1);
  color: var(--rm-primary);
}

.rm-inline-tabs__pill:focus-visible {
  outline: 2px solid var(--rm-primary);
  outline-offset: 2px;
}

.rm-inline-tabs__pill:disabled {
  opacity: 0.4;
  cursor: default;
}

.rm-inline-tabs__pill--active {
  background: linear-gradient(180deg, #7ca6cb, var(--rm-primary));
  color: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
}

.rm-inline-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.16);
  color: var(--rm-text-soft);
  font-size: 0.72rem;
  font-weight: 800;
}

.rm-inline-tabs__pill--active .rm-inline-tabs__badge {
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}

.rm-inline-tabs__panel {
  min-width: 0;
}

.rm-inline-tabs-fade-enter-active,
.rm-inline-tabs-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.rm-inline-tabs-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.rm-inline-tabs-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 767px) {
  .rm-inline-tabs__bar:not(.rm-inline-tabs__bar--scroll) {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rm-inline-tabs-fade-enter-active,
  .rm-inline-tabs-fade-leave-active {
    transition: none;
  }
}
</style>
