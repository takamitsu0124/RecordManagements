<script lang="ts" setup>
import type { PropType } from 'vue'
import { onMounted, ref } from 'vue'
import type { PopupColorKinds } from './RMPopupFun'

/** props定義 */
const props = defineProps({
  /**ポップアップ質問 */
  question: { type: String, default: '質問' },
  /**補足 */
  supplement: { type: String, default: '' },
  /**
   * ポップアップ左テキスト
   * ボタン自体が不要であればpropsで未記入で自動非表示
   *  */
  leftText: { type: String, default: '' },
  /**ポップアップ右テキスト */
  rightText: { type: String, default: '閉じる' },
  /**ポップアップ左テキストカラー */
  leftColor: { type: String as PropType<PopupColorKinds>, default: 'primary' },
  /**ポップアップ右テキストカラー */
  rightColor: { type: String as PropType<PopupColorKinds>, default: 'primary' },
  /**件数 */
  subjectNum: { type: Number, default: 1 }
})

const emit = defineEmits<{
  (e: 'LeftButtonClick'): void
  (e: 'RightButtonClick'): void
}>()

const popupStatus = ref(false)
//app.mount()された時に強制的にpopupStatus.valueにtrueを入れ表示させる。
onMounted(() => {
  popupStatus.value = true
})
const handleLeftButtonClick = () => {
  emit('LeftButtonClick')
}
const handleRightButtonClick = () => {
  emit('RightButtonClick')
}
</script>

<template>
  <div>
    <Transition style="z-index: 1000000">
      <div v-if="popupStatus" class="_AFC_outline">
        <div class="_AFCButton_container">
          <div class="_popup_question">
            <div class="_popup_sentence" v-html="props.question" />
            <div
              v-if="supplement"
              class="_question_notice"
              v-html="supplement"
            />
          </div>
          <div class="_AFC_buttons">
            <div
              v-if="leftText"
              :class="[
                '_popup_left_button',
                '_popup_buttons',
                `text-${leftColor}`,
              ]"
              @click="handleLeftButtonClick()"
            >
              {{ leftText }}
            </div>
            <div
              :class="['_popup_buttons', `text-${rightColor}`]"
              @click="handleRightButtonClick()"
            >
              {{ rightText }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="sass" scoped>


._AFC_outline
  background-color: rgba(0,0,0,0.4)
  width: 100vw
  height: 100svh
  position: fixed
  top: 0
  left: 0

._AFCButton_container
  position: absolute
  top: 50%
  left: 50%
  transform: translate(-50%, -50%)
  border-radius: 12px
  width: 300px
  border: 1px solid $border-grey
  font-size: 16px
  background-color: white
._popup_question
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 40px 10px
  text-align: center
  word-break: break-all
._popup_sentence
  display: grid
  place-items: center
._AFC_buttons
  border-top: 1px solid $border-grey
  display: flex
  justify-content: space-around
  align-items: center
  height: 48px
._popup_left_button
  border-right: 1px solid $border-grey
._AFC_buttons div
  align-items: center
  text-align: center
  width: 100%
  height: 100%
._question_notice
  font-size: 14px
  white-space: pre-line
._popup_buttons
  display: grid
  place-items: center
  height: 100%
  transition: 0.5s
  opacity: 1
  font-size: 18px
._popup_buttons:hover
  cursor: pionter
  transition: 0.5s
  opacity: 0.6
.v-enter-active,.v-leave-active
  transition: opacity 0.5s ease
.v-enter-from,.v-leave-to
  opacity: 0
.text-primary
  color: $primary
.text-gray
  color: $text-gray
.text-white
  color: $text-white
.text-black
  color: $text-black
.text-red
  color: $text-red
</style>
