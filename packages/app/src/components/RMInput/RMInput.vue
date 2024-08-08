<script setup lang="ts">
import { ref, computed, PropType, watch } from 'vue'
import { SizeTypes } from './size'
import { IconTypes } from '../iconType'
import RMIcon from '../RMIcon/RMIcon.vue'
import RMCalendar from '../RMCalendar/RMCalendar.vue'
import { calendarPosition } from './calendarPosition'

const props = defineProps({
  /**
   * 値
   * @example 'テスト', 100
   */
  modelValue: { type: [String, Number, File] },
  /**
   * アウトライン
   * @example outline
   */
  outline: { type: Boolean, default: false },
  /**
   * シャドウ
   * @example shadow
   */
  shadow: { type: Boolean, default: false },
  /**
   * スクエア
   * @example square
   */
  square: { type: Boolean, default: false },
  /**
   * ディセーブル
   * @example disable => true
   */
  disabled: { type: Boolean, default: false },
  /**
   * ラベル
   * @example 'お名前'
   */
  label: { type: String, default: '' },
  /**
   * ラベルのテキストの大きさ
   * line-heightが24pxのため、大きすぎるサイズを入れると表示が崩れる
   * @example '16px'
   */
  labelSize: { type: String, default: '' },
  /**
   * プレースホルダー
   * @example 'お名前'
   */
  placeholder: { type: String, default: '' },
  /**
   * サイズ
   * @example 'S' | 'M' | 'L'
   */
  size: { type: String as PropType<SizeTypes>, default: 'S' },
  /**
   * アイコンレフト
   * @example 'left'
   */
  iconLeft: { type: String as PropType<IconTypes>, default: '' },
  /**
   * アイコンライト
   * @example 'right'
   */
  iconRight: { type: String as PropType<IconTypes>, default: '' },
  /**
   * 必須テキスト
   * @example '*' | '*必須'
   */
  requiredText: { type: String as PropType<'※' | '※必須'>, default: '' },
  /**
   * 必須アイコン
   * @example true
   */
  requiredIcon: { type: Boolean, default: false },
  /**
   * エラー1
   * @example true
   */
  error1: { type: Boolean, default: false },
  /**
   * エラー2
   * @example true
   */
  error2: { type: Boolean, default: false },
  /**
   * エラー3
   * @example '****を入力してください'
   */
  error3: { type: String, default: '' },
  /**
   * エラー4
   * @example '****を入力してください'
   */
  error4: { type: String, default: '' },
  /**
   * 日付
   * @example true | false
   */
  date: { type: Boolean, default: false },
  /**
   * 文字数制限
   * @example 11
   */
  maxlength: { type: String, default: '999' },
  /**
   * 検索
   * @example true | false
   */
  search: { type: Boolean, default: false },
  /**
   * カレンダーをポップアップモードで表示する
   * @example true | false
   */
  calendarPopupMode: { type: Boolean, default: false },
  /**
   * ファイル選択
   */
  accept: { type: String, default: '' },

  /**
   * inputmode
   * @example inputmode: numeric
   */
  inputmode: {
    type: String as PropType<
      | 'text'
      | 'search'
      | 'none'
      | 'tel'
      | 'url'
      | 'email'
      | 'numeric'
      | 'decimal'
      | undefined
    >,
    default: 'text',
  },
  type: {
    type: String,
    default: 'text',
  },
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | number | File | undefined): void
  (e: 'update:calendarPopupMode', val: boolean): void
  (e: 'onBlur'): void
  (e: 'onFocus'): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

const typeLocal = ref<string>(props.type)

const isDesign = computed(() => {
  if (props.outline) return 'outline'
  if (props.shadow) return 'shadow'
  if (props.square) return 'square'
  return 'standard'
})

// パスワードアイコンをクリックする
const clickPasswordIcon = () => {
  if (typeLocal.value === 'password') {
    typeLocal.value = 'text'
  } else {
    typeLocal.value = 'password'
  }
}

const calendarState = ref<boolean>(false)
const refCcInput = ref<HTMLElement>()
const refCcCalendar = ref<HTMLElement>()
const refCCCalendarPop = ref<HTMLElement>()
const calendarOpen = () => {
  calendarState.value = !calendarState.value

  // ラベルフラグ
  const labelFlag = ref<boolean>(false)
  if (props.label || props.requiredIcon || props.requiredText) {
    labelFlag.value = true
  }

  // カレンダーの表示位置を設定する:ポップアップの場合はスルーするー
  if (!props.calendarPopupMode) {
    const elementCalendar = refCcCalendar.value!
    elementCalendar.style.top = calendarPosition(
      refCcInput.value,
      props.size,
      labelFlag.value
    )
  }
}

// コンポーネントの要素外をクリックした場合、optionsを閉じる
// onClickOutside(refCcInput, () => {
//   if (!calendarState.value) return
//   calendarState.value = false
// })
// onClickOutside(refCCCalendarPop, () => {
//   if (!calendarState.value) return
//   calendarState.value = false
// })

//カレンダー上で日付を選んでも閉じる
watch(model, () => {
  if (!calendarState.value) return
  calendarState.value = false
  //modelの値を監視し、変更があった場合その値をmodelValueを使用しているemitに返す
  if (model.value) {
    let year = String(model.value).split('/')[0]
    let month = ('0' + String(model.value).split('/')[1]).slice(-2)
    let day = ('0' + String(model.value).split('/')[2]).slice(-2)
    /**日付を0付きの数字に変更する */
    const date = `${year}/${month}/${day}`
    emit('update:modelValue', date)
  }
})

const onBlur = () => {
  emit('onBlur')
}
const onFocus = () => {
  emit('onFocus')
}
const clickInput = () => {
  if (typeLocal.value === 'file') {
    const element = document.createElement('input')
    if (props.accept) {
      element.accept = props.accept
    }
    element.type = 'file'
    element.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files![0]
      model.value = file
      element.remove()
    })
    element.click()
  }
}

const showFileName = computed(() => {
  if (model.value instanceof File) {
    const fileName = model.value.name
    return fileName
  }
  return ''
})

const inputClass = computed(() => {
  return {
    _icon_left: props.iconLeft || props.search,
    _icon_right: props.iconRight || props.date,
    _icon_left_and_right: props.iconLeft && props.iconRight,
    _size_s: props.size.toLocaleLowerCase() === 's',
    _size_m: props.size.toLocaleLowerCase() === 'm',
    _size_l: props.size.toLocaleLowerCase() === 'l',
    _standard: isDesign.value === 'standard',
    _outline: isDesign.value === 'outline',
    _shadow: isDesign.value === 'shadow',
    _square: isDesign.value === 'square',
    _standard_or_shadow_width:
      (isDesign.value === 'standard' && !props.iconLeft && !props.iconRight) ||
      (isDesign.value === 'shadow' && !props.iconLeft && !props.iconRight),
    _outline_or_square_width:
      (isDesign.value === 'outline' && !props.iconLeft && !props.iconRight) ||
      (isDesign.value === 'square' && !props.iconLeft && !props.iconRight),
    _standard_or_shadow_single_icon:
      (isDesign.value === 'standard' &&
        (props.iconLeft || props.iconRight || props.date || props.search)) ||
      (isDesign.value === 'shadow' &&
        (props.iconLeft || props.iconRight || props.date || props.search)),
    _outline_or_square_single_icon:
      (isDesign.value === 'outline' &&
        (props.iconLeft || props.iconRight || props.date || props.search)) ||
      (isDesign.value === 'square' &&
        (props.iconLeft || props.iconRight || props.date || props.search)),
    _standard_or_shadow_double_icons:
      (isDesign.value === 'standard' && props.iconLeft && props.iconRight) ||
      (isDesign.value === 'shadow' && props.iconLeft && props.iconRight),
    _outline_or_square_double_icons:
      (isDesign.value === 'outline' && props.iconLeft && props.iconRight) ||
      (isDesign.value === 'square' && props.iconLeft && props.iconRight),
    _disable: props.disabled,
    _error_standard:
      isDesign.value === 'standard' &&
      (props.error1 || props.error2 || props.error3 || props.error4),
    _error_outline_and_square:
      (isDesign.value === 'outline' || isDesign.value === 'square') &&
      (props.error1 || props.error2 || props.error3 || props.error4),
    _error_bg: props.error2 || props.error4,
  }
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCCCalendar = (m: any): m is string | number | undefined => {
  return typeof m === 'string' || typeof m === undefined
}
</script>

<template>
  <div ref="refCcInput" class="_cc_input" @click="clickInput">
    <Teleport to="body">
      <transition name="fade" v-if="calendarPopupMode">
        <div
          class="_calender_modal"
          v-if="calendarPopupMode"
          v-show="calendarState"
        >
          <div v-if="size === 's' || size === 'S'" class="_calender_modal_box">
            <div class="_modal_card_small" ref="refCCCalendarPop">
              <RMCalendar
                v-if="isCCCalendar(model)"
                v-model="(model as string)"
              />
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
    <transition v-if="!calendarPopupMode">
      <div
        ref="refCcCalendar"
        v-show="calendarState"
        class="_cc_calendar_container"
      >
        <RMCalendar v-if="isCCCalendar(model)" v-model="(model as string)" />
      </div>
    </transition>

    <div class="_label_container">
      <div class="_label label_text_size">
        {{ label }}
      </div>
      <div
        v-if="requiredText"
        class="_required_text"
        :class="{ _required_position_right: label }"
      >
        {{ requiredText }}
      </div>
      <div
        v-if="requiredIcon"
        class="_required_icon_container"
        :class="{ _required_position_right: label }"
      >
        <div class="_required_icon">必須</div>
      </div>
    </div>

    <div class="_input_container">
      <div v-if="iconLeft && !search" class="_icon_left_position">
        <RMIcon :name="iconLeft" class="_cc_mdicon" />
      </div>

      <div v-if="search && !iconLeft" class="_icon_left_position">
        <RMIcon name="search" class="_cc_search_icon" />
      </div>

      <div v-if="iconRight && !date" class="_icon_right_position">
        <RMIcon :name="iconRight" class="_cc_mdicon" />
      </div>

      <div
        v-if="date && !iconRight"
        class="_calendar_icon_container"
        @click="calendarOpen"
      >
        <RMIcon name="calendar_today" class="_cc_mdicon" />
      </div>

      <div v-if="type === 'password'">
        <div
          v-if="typeLocal === 'password'"
          class="_calendar_icon_container"
          @click="clickPasswordIcon"
        >
          <RMIcon name="visibility_off" class="_cc_mdicon" />
        </div>
        <div
          v-if="typeLocal !== 'password'"
          class="_calendar_icon_container"
          @click="clickPasswordIcon"
        >
          <RMIcon name="visibility" class="_cc_mdicon" />
        </div>
      </div>

      <div v-if="typeLocal === 'file'" class="_input _file" :class="inputClass">
        {{ showFileName }}
      </div>

      <input
        v-else
        v-model="model"
        :disabled="disabled"
        :placeholder="search ? 'キーワードで検索' : placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :type="typeLocal"
        @blur="onBlur()"
        @focus="onFocus()"
        class="_input"
        :class="inputClass"
      />
    </div>

    <div v-show="error3" class="_error_message">
      {{ error3 }}
    </div>

    <div v-show="error4" class="_error_message">
      {{ error4 }}
    </div>
  </div>
</template>

<style lang="sass" scoped>
input::placeholder
  color: #D2D2D2
._cc_input
  font-family: 'Roboto', sans-serif
  position: relative
  box-sizing: border-box

._cc_calendar_container
  position: absolute
  z-index: 100
  right: 0

._icon_left_position
  width: 30px
  height: 30px
  display: flex
  justify-content: center
  align-items: center
  position: absolute
  top: 50%
  left: 10px
  transform: translateY(-50%)
  -webkit-transform: translateY(-50%)
  -ms-transform: translateY(-50%)

._icon_right_position
  width: 30px
  height: 30px
  display: flex
  justify-content: center
  align-items: center
  position: absolute
  top: 50%
  right: 10px
  transform: translateY(-50%)
  -webkit-transform: translateY(-50%)
  -ms-transform: translateY(-50%)
._calendarpopup_mode
  position: fixed
  top: 50%
  left: 50%
  transform: translate(-50%, -50%)
  z-index: 100


._calendar_icon_container
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0)
  width: 30px
  height: 30px
  display: flex
  justify-content: center
  align-items: center
  position: absolute
  top: 50%
  right: 10px
  transform: translateY(-50%)
  -webkit-transform: translateY(-50%)
  -ms-transform: translateY(-50%)
  border-radius: 50%
  cursor: pointer
  transition: 0.3s
._calendar_icon_container:hover
  background: rgb(var(--c-primary-rgb), 0.3)

._cc_mdicon
  font-size: 24px
  color: var(--c-primary)

._cc_search_icon
  font-size: 24px
  color: #9C9C9C

._label_container
  display: flex
  align-items: center
  padding: 0 5px
  margin-bottom: 2px
  line-height: 24px

._label
  font-size: 16px
  color: #707070
  width: fit-content

._required_text
  font-size: 14px
  color: #D20000

._required_icon_container
  height: 24px
  display: flex
  align-items: center

._required_icon
  font-size: 14px
  background: #D20000
  color: #fff
  line-height: 22px
  padding: 0 5px
  border-radius: 5px

._required_position_right
  margin-left: auto

._input_container
  position: relative

._input
  padding: 0 15px
  border: none
  outline: none
  font-size: 16px

._file
  line-height: 40px
  cursor: pointer

._icon_left
  padding: 0 15px 0 45px

._icon_right
  padding: 0 45px 0 15px

._icon_left_and_right
  padding: 0 45px

._size_s
  height: 40px

._size_m
  height: 45px

._size_l
  height: 50px

._standard
  -webkit-appearance: none
  appearance: none
  padding-top: 1px
  border-radius: 0px
  border-bottom: solid 1px var(--c-primary)

._outline
  border-radius: 5px

._shadow
  border-radius: 5px
  box-shadow: rgba(99, 99, 99, 0.2) 0px 0px 8px 1px
  -webkit-appearance: none
  appearance: none
  padding-top: 1px
  padding-bottom: 1px

._square
  border-radius: 0px

._standard_or_shadow_width
  width: calc(100%)

._outline_or_square_width
  width: calc(100%)
  border: solid 1px var(--c-primary)

._standard_or_shadow_single_icon
  width: calc(100%)

._outline_or_square_single_icon
  width: calc(100%)
  border: solid 1px var(--c-primary)

._standard_or_shadow_double_icons
  width: calc(100%)

._outline_or_square_double_icons
  width: calc(100%)
  border: solid 1px var(--c-primary)

._disable
  background: #ECECEC
  cursor: not-allowed

._error_message
  color: #D20000
  font-size: 16px

._error_standard
  border-bottom: solid 1px #D20000

._error_outline_and_square
  border: solid 1px #D20000

._error_bg
  background: rgba(210,0,0,0.2)

.v-enter-active, .v-leave-active
  transition: opacity 0.3s ease

.v-enter-from, .v-leave-to
  opacity: 0

.label_text_size
  font-size: v-bind('labelSize === "" ? "16px" : labelSize')
//
// モーダルカレンダー用
.fade-enter-active, .fade-leave-active
  transition: opacity 0.3s ease

.fade-enter-from, .fade-leave-to
  opacity: 0

.fade-enter-to, .fade-leave-from
  opacity: 1

._calender_modal
  position: fixed
  top: 0
  left: 0
  z-index: 9999
  background: rgb(var(--c-modal-black-rgb), 0.3)
  backdrop-filter: blur(1px)
  height: 100vh
  width: 100vw
  display: flex
._calender_modal_box
  position: absolute
  top: 50%
  left: calc((100vw + 0px) / 2)
  transform: translate(-50%, -50%)
  -webkit-transform: translate(-50%, -50%)
  -ms-transform: translate(-50%, -50%)
</style>
