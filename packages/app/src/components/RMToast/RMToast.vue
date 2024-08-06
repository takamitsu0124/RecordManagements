<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  /**
   * トースト内に表示させる文字列
   */
  toastText: { type: String, default: '予定を作成しました' },
  /**
   * トーストを表示、非表示の時間
   */
  toastMovingTime: { type: Number, default: 7 },
  /**
   * トーストトップからの高さ
   */
  fromTopHeight: { type: String, default: '120px' },
  /**
   * どこから表示させるか、基本は上から
   */
  toastFromTop: { type: Boolean, default: false },
  /**
   * トーストのメインカラー
   **/
  toastColor: { type: String, default: '#3BD4F0' },
  /**
   * トーストのアイコン
   */
  isCheckCircle: { type: Boolean, default: true },
})
//親コンポーネントからv-modelのBoolean値を元に表示、非表示を切り替える
const toastMove = ref(false)
onMounted(() => {
  toastMove.value = true

  return setTimeout(() => {
    ;(toastMove.value = false), props.toastMovingTime * 1000
  })
})
// トーストの表示時間をpropsの値から文字列の秒数に変換
const toastFadeTime = ref<string>()
toastFadeTime.value = `${String(props.toastMovingTime)}s`
const toastTransform = computed(() => {
  if (props.toastFromTop) return '-50px'
  return '50px'
})
/**トーストを表示させる向きによりそれぞれのマージンを変更する */
const marginTop = computed(() => {
  if (props.toastFromTop) return props.fromTopHeight
  return '0px'
})
const marginBottom = computed(() => {
  if (!props.toastFromTop) return props.fromTopHeight
  return '0px'
})
console.log('propstoasticon', props.isCheckCircle)
</script>

<template>
  <div>
    <Teleport to="body">
      <div>
        <Transition name="toast">
          <div
            style="z-index: 2000000"
            class="_toast"
            :class="{
              _toast_from_top: toastFromTop,
              _toast_from_bottom: !toastFromTop,
            }"
            v-if="toastMove"
          >
            <!-- トーストアイコンを設定した場合それを優先。ない場合デフォルトでチェックサークル -->

            <img
              src="~/assets/check_circle.svg"
              class="_check_circle"
              v-if="isCheckCircle"
            />
            <img src="~/assets/error.svg" class="_check_circle" v-else />
            <div class="_toast_text">{{ toastText }}</div>
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>

<style lang="sass" scoped>
._toast
  min-height: 44px
  margin: v-bind(marginTop) 26px v-bind(marginBottom) 26px
  width: calc(100% - 52px)
  background-color: white
  position: fixed
  left: 0
  right: 0
  transform: translateX(-50%)
  z-index: 10000
  display: flex
  align-items: center
  justify-content: center
  column-gap: 16px
  color: white
  border-radius: 3px
  border: 2px solid v-bind(toastColor)
  padding: 10px 5px
._toast_from_top
  top: 0
._toast_from_bottom
  bottom: 0
._toast .q-icon
  color: v-bind(toastColor)
  height: 22px
  width: auto

._toast_text
  color: black

  //test
.toast-enter
  opacity: 0
  transform: translateY(v-bind(toastTransform))

.toast-enter-active
  animation: movein v-bind(toastFadeTime)
  animation-timing-function: ease-in


.toast-leave-active
  animation: movein v-bind(toastFadeTime) reverse
  animation-timing-function: ease-in


@keyframes movein
  0%
    opacity: 0
    transform: translateY(v-bind(toastTransform))
  50%
    opacity: 1
    transform: translateY(0px)
  80%
    opacity: 1
    transform: translateY(0px)
  100%
    opacity: 0
    transform: translateY(v-bind(toastTransform))
._check_circle
   filter: invert(76%) sepia(59%) saturate(1421%) hue-rotate(153deg) brightness(98%) contrast(93%)
</style>
