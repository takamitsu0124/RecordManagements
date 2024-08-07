<script lang="ts" setup>
import { computed, watch, ref, nextTick } from 'vue'
// $
/** props定義 */
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  /**ドロワーの高さ */
  drawerHeight: { type: String, default: '400px' },
  /**背景色 */
  bgColor: { type: String, default: 'black' },
  /**背景色の透過度 */
  bgOpacity: { type: Number, default: 0.4 },
  /**スクロールの有無 */
  isScroll: { type: Boolean, default: false },
  /**zの高さ,2枚、3枚と重ねる時に使用*/
  zIndex: { type: Number, default: 100000 },
  /**バツ印の有無 */
  isIcon: { type: Boolean, default: false },
  /**スロット要素の下からの距離 */
  bottomHeight: { type: String, default: '100px' },
  /**タイトルの設定 */
  drawerTitle: { type: String, default: '' },
  /**強制的にスクロールトップへ移動 */
  isForciblyScrollToTop: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
const drawer = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})
const drawerStyle = () => {
  if (drawer.value) return '_comein'
  if (!drawer.value) return '_comeout'
}
const styleChanger = () => {
  if (props.isScroll) return '_set_scroll'
}
const iconChanger = () => {
  if (props.isIcon) {
    return '_icon_position'
  } else if (!props.isIcon) {
    return '_complete_text'
  }
}
watch(
  drawer,
  () => {
    if (drawer.value) {
      document.body.style.overflow = 'hidden' // ボディ要素のスクロールを禁止
    } else {
      document.body.style.overflow = '' // ボディ要素のスクロールを許可
    }
  },
  { immediate: true }
)

const scrollTarget = ref<HTMLDivElement | null>(null)
//drawerを閉じたときには強制的に要素内トップへ
const scrollToTop = () => {
  nextTick(() => {
    if (scrollTarget.value) {
      scrollTarget.value.scrollTop = 0
    }
  })
}
// onMounted(async () => {
//   scrollToTop()
// })
watch(
  drawer,
  () => {
    if (drawer.value && props.isForciblyScrollToTop) {
      scrollToTop()
    }
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <Transition>
      <div v-show="drawer" class="_drawer_bg_color"></div>
    </Transition>
    <Transition v-show="drawer" appear>
      <div :class="['_drawer_default_style', drawerStyle()]">
        <div class="_drawer_position_box">
          <div class="_chat_title">{{ drawerTitle }}</div>
          <div class="_icon_box" :class="[iconChanger()]">
            <div @click="drawer = !drawer" v-if="isIcon">
              <q-icon name="close" class="_icon_style" />
            </div>
            <div @click="drawer = !drawer" v-if="!isIcon">完了</div>
          </div>
        </div>
        <div :class="['_slot_container', styleChanger()]" ref="scrollTarget">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="sass" scoped>

._drawer_bg_color
  background-color: v-bind(bgColor)
  opacity: v-bind(bgOpacity)
  z-index: 10000
  width: 100vw
  height: 100vh
  position: fixed
  top: 0
  left: 0

._slot_container
  height: calc(v-bind(drawerHeight) - v-bind(bottomHeight))

._drawer_default_style
  z-index: 10001
  height: v-bind(drawerHeight)
  width: 100vw
  background-color: white
  box-shadow: 0 0 3px 2px rgba(0,0,0,0.1)
  position: fixed
  bottom: 0px
  border-radius: 20px 20px 0px 0px
  color: black


._set_scroll
  overflow: auto
._comein
  animation: fadein 0.5s forwards
@keyframes fadein
  0%
   opacity: 0
  100%
    opacity: 1
._comeout
  animation: fadeout 0.5s forwards
@keyframes fadeout
  0%
    opacity: 1
  100%
    opacity: 0
.v-enter-active,.v-leave-active
  transition: opacity 0.3s ease

.v-enter-from,.v-leave-to
  opacity: 0
._icon_style
  font-size: 48px
  margin-right: 10px
  color: gray
._icon_box
  grid-column: 3/4
._icon_position
  // margin: 3px 10px 0px 0px
  text-align: right
._drawer_position_box
  display: grid
  grid-template-columns: 68px 1fr 68px
  height: 48px

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
  max-width: 260px //SEまで対応

._complete_text
  color: $blue-btn
  text-align: right
  margin: 26px 16px 0 0
</style>
