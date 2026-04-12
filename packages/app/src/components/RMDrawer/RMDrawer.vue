<script lang="ts" setup>
import { computed, nextTick, ref, useAttrs, watch } from 'vue'
import RMIcon from '../RMIcon/RMIcon.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  drawerHeight: { type: String, default: '400px' },
  bgColor: { type: String, default: 'black' },
  bgOpacity: { type: Number, default: 0.4 },
  isScroll: { type: Boolean, default: false },
  zIndex: { type: Number, default: 100000 },
  isIcon: { type: Boolean, default: false },
  bottomHeight: { type: String, default: '100px' },
  drawerTitle: { type: String, default: '' },
  isForciblyScrollToTop: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
const attrs = useAttrs()

const drawer = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

const scrollTarget = ref<HTMLDivElement | null>(null)

const scrollToTop = () => {
  nextTick(() => {
    scrollTarget.value?.scrollTo({ top: 0 })
  })
}

watch(
  drawer,
  (opened) => {
    document.body.style.overflow = opened ? 'hidden' : ''
    if (opened && props.isForciblyScrollToTop) {
      scrollToTop()
    }
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="drawer"
        class="_drawer_bg_color"
        :style="{ '--drawer-bg': bgColor, '--drawer-opacity': String(bgOpacity), '--drawer-z': String(zIndex) }"
        @click="drawer = false"
      ></div>
    </transition>
    <transition name="slide-up">
      <div
        v-if="drawer"
        :class="['_drawer_default_style', attrs.class]"
        :style="{ '--drawer-height': drawerHeight, '--drawer-z': String(zIndex + 1) }"
      >
        <div class="_drawer_position_box">
          <div class="_chat_title">{{ drawerTitle }}</div>
          <button class="_icon_box" type="button" @click="drawer = false">
            <RMIcon v-if="isIcon" name="close" class="_icon_style" />
            <span v-else>完了</span>
          </button>
        </div>
        <div :class="['_slot_container', { _set_scroll: isScroll }]" ref="scrollTarget">
          <slot></slot>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style lang="sass" scoped>
._drawer_bg_color
  background-color: var(--drawer-bg)
  opacity: var(--drawer-opacity)
  z-index: var(--drawer-z)
  width: 100vw
  height: 100vh
  position: fixed
  inset: 0

._slot_container
  height: calc(var(--drawer-height) - v-bind(bottomHeight))

._drawer_default_style
  z-index: var(--drawer-z)
  height: var(--drawer-height)
  width: 100vw
  background-color: white
  box-shadow: 0 0 24px rgba(0,0,0,0.12)
  position: fixed
  bottom: 0
  border-radius: 20px 20px 0 0
  color: black

._set_scroll
  overflow: auto

._icon_style
  font-size: 32px
  color: gray

._icon_box
  border: none
  background: transparent
  color: #2563eb
  cursor: pointer
  display: flex
  align-items: center
  justify-content: flex-end

._drawer_position_box
  display: grid
  grid-template-columns: 68px 1fr 68px
  height: 48px
  padding: 0 12px

._chat_title
  margin-top: 5px
  grid-column: 2/3
  justify-self: center
  align-self: center
  font-weight: bold
  color: $border-black
  font-size: 16px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
  max-width: 260px

.fade-enter-active,.fade-leave-active
  transition: opacity 0.3s ease

.fade-enter-from,.fade-leave-to
  opacity: 0

.slide-up-enter-active,.slide-up-leave-active
  transition: transform 0.3s ease, opacity 0.3s ease

.slide-up-enter-from,.slide-up-leave-to
  transform: translateY(100%)
  opacity: 0.8
</style>
