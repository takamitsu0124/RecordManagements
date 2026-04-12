<script lang="ts" setup>
import { computed, PropType, useAttrs } from 'vue'
import { PopupColorKinds } from './RMPopupFun'

defineOptions({
  inheritAttrs: false,
})

/** props定義 */
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  /**ポップアップ質問 */
  question: { type: String, default: '質問' },
  /**補足 */
  supplement: { type: String, default: '' },
  /**ポップアップ左テキスト */
  leftText: { type: String },
  /**ポップアップ右テキスト */
  rightText: { type: String, default: '右' },
  /**ポップアップ左テキストカラー */
  leftColor: {
    type: String as PropType<PopupColorKinds>,
    default: 'primary',
  },
  /**ポップアップ右テキストカラー */
  rightColor: {
    type: String as PropType<PopupColorKinds>,
    default: 'primary',
  },
  /**件数 */
  subjectNum: { type: Number, default: 1 },
})
const emit = defineEmits<{
  (e: 'onLeft'): void
  (e: 'onRight'): void
  (e: 'update:modelValue', value: boolean): void
}>()
const attrs = useAttrs()

const popupStatus = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})
</script>

<template>
  <Transition style="z-index: 1000000">
    <div :class="['_AFC_outline', attrs.class]" v-if="popupStatus">
      <div class="_AFCButton_container">
        <div class="_popup_question">
          <div class="_popup_sentence" v-html="question"></div>
          <div v-if="supplement" class="_question_notice" v-html="supplement" />
        </div>
        <div class="_AFC_buttons">
          <div
            @click="emit('onLeft')"
            :class="[
              '_popup_left_button',
              '_popup_buttons',
              `text-${leftColor}`,
            ]"
            v-if="leftText"
          >
            {{ leftText }}
          </div>
          <div
            @click="emit('onRight')"
            :class="['_popup_buttons', `text-${rightColor}`]"
          >
            {{ rightText }}
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="sass" scoped>
// $
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
  color: $primary
._popup_question
  color: black
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 40px 1px
  text-align: center
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
