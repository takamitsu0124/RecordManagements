<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue'
import RMIcon from '../RMIcon/RMIcon.vue'
import { lockBodyScroll, unlockBodyScroll } from 'src/helpers/bodyScrollLock'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: { type: Boolean },
  scroll: { type: Boolean, default: false },
  height: { type: Number, default: 500 },
  backgroundColor: { type: String, default: '#FFFFFF' },
  isClosebutton: { type: Boolean, default: true },
  isFull: { type: Boolean, default: false },
  secondLayer: { type: Boolean, default: false },
  toTopKey: { type: Number, default: 0 },
  kind: {
    type: String,
    default: ''
  },
  isSelect: { type: Boolean, default: false },
  isMaxGroup: { type: Boolean, default: false },
  isdrawerArea: { type: Boolean, default: false },
  isdrawerGraphrea: { type: Boolean, default: false }
})

const emit = defineEmits<{
  (e: 'update:modelValue', payload: boolean): void
}>()
const attrs = useAttrs()

const value = computed({
  get: () => props.modelValue,
  set: (nextValue) => {
    emit('update:modelValue', nextValue)
  }
})

const area = ref<HTMLDivElement | null>(null)
let isBodyScrollLocked = false

watch(
  () => props.toTopKey,
  () => {
    nextTick(() => {
      area.value?.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    })
  }
)

watch(
  value,
  (opened) => {
    if (opened && !isBodyScrollLocked) {
      lockBodyScroll()
      isBodyScrollLocked = true
      return
    }

    if (!opened && isBodyScrollLocked) {
      unlockBodyScroll()
      isBodyScrollLocked = false
    }
  },
  { immediate: true }
)

const panelClass = computed(() => ({
  '_drawer--full': props.kind === 'full' || props.isFull,
  '_drawer--secondary': props.kind === 'second',
  '_drawer--third': props.kind === 'third'
}))

const drawerClose = () => {
  value.value = false
}

onBeforeUnmount(() => {
  if (!isBodyScrollLocked) return

  unlockBodyScroll()
  isBodyScrollLocked = false
})
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="value" class="_overlay" @click="drawerClose" />
    </transition>
    <transition name="sheet-up">
      <div v-if="value" :class="['_drawer', panelClass, attrs.class]">
        <div
          ref="area"
          class="_drawer_area"
          :class="{ _drawer_area_scroll: scroll, _drawer_grapharea: isdrawerGraphrea, _drawer_area_type: isdrawerArea }"
          :style="{ '--drawer-height': `${height}px`, '--drawer-bg': backgroundColor }"
        >
          <div class="_drawer_header">
            <div v-if="props.isSelect" class="_selected_message">
              {{
                isMaxGroup && isSelect
                  ? 'グループが最大数登録されています。'
                  : 'グループを選択してください。'
              }}
            </div>
            <div v-else class="_empty_area" />
            <button v-if="isClosebutton" type="button" class="_close_button" @click="drawerClose">
              <RMIcon name="close" class="_close_icon" />
            </button>
          </div>
          <div class="_drawer_content">
            <slot name="default" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style lang="sass" scoped>
._overlay
  position: fixed
  inset: 0
  z-index: 600
  background: rgba(0,0,0,0.35)

._drawer
  position: fixed
  left: 0
  right: 0
  bottom: 0
  z-index: 700
  display: flex
  justify-content: center
  padding: 0 10px

._drawer--secondary
  z-index: 710

._drawer--third
  z-index: 720

._drawer_area
  width: min(100%, 850px)
  height: min(calc(100vh - 20px), calc(var(--drawer-height) + 20px))
  background: var(--drawer-bg)
  border-top-left-radius: 20px
  border-top-right-radius: 20px
  box-shadow: 0 -12px 32px rgba(15,23,42,0.18)
  overflow: hidden
  display: flex
  flex-direction: column

._drawer--full ._drawer_area
  height: calc(100vh - 20px)

._drawer_area_scroll
  overflow: auto

._drawer_header
  display: flex
  align-items: center
  justify-content: space-between
  gap: 12px
  padding: calc(env(safe-area-inset-top) + 16px) 20px 12px

._drawer_content
  flex: 1
  overflow: auto
  padding: 0 20px 20px

._close_button
  border: none
  background: transparent
  cursor: pointer
  display: flex
  align-items: center
  justify-content: center

._close_icon
  font-size: 32px
  color: #707070

._selected_message
  flex: 1
  font-size: 16px
  text-align: center
  color: red

._empty_area
  flex: 1

.fade-enter-active,.fade-leave-active
  transition: opacity .3s ease

.fade-enter-from,.fade-leave-to
  opacity: 0

.sheet-up-enter-active,.sheet-up-leave-active
  transition: transform .3s ease, opacity .3s ease

.sheet-up-enter-from,.sheet-up-leave-to
  transform: translateY(100%)
  opacity: .85
</style>
