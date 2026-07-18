<script lang="ts" setup>
import type { PropType} from 'vue'
import { computed } from 'vue'
import Button from 'primevue/button'
import RMIcon from '../RMIcon/RMIcon.vue'

const props = defineProps({
  buttonType: {
    type: String as PropType<
      'standard' | 'justIcon' | 'withIcon' | 'withImg' | 'delete' | 'medal'
    >,
    default: 'standard'
  },
  buttonHeight: { type: String, default: '50px' },
  label: { type: String, default: 'ページ遷移します' },
  letter: { type: String, default: '' },
  width: { type: String, default: '100%' },
  buttonShape: { type: String as PropType<'round' | 'square' | 'ellipse'> },
  bgColor: { type: String, default: '' },
  letterColor: { type: String, default: 'white' },
  letterSize: { type: String, default: '18px' },
  imageUrlOrIconName: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  iconColor: { type: String, default: 'white' },
  iconSize: { type: String, default: '20px' },
  medalGarbageSize: { type: String, default: '30px' },
  contentPosition: { type: String as PropType<'center' | 'between'> },
  isShadow: { type: Boolean, default: false },
  isMedalAndGarbageColor: {
    type: String as PropType<'grey' | 'blue' | 'white'>
  },
  isBorder: { type: Boolean, default: false },
  isDisable: { type: Boolean, default: false },
  specialIcon: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  outline: { type: Boolean, default: false },
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button'
  }
})

const buttonLabel = computed(() => props.label || props.letter)

const resolvedBackground = computed(() => {
  if (props.flat || props.outline) return 'transparent'
  if (props.bgColor) return props.bgColor

  const colorMap: Record<string, string> = {
    primary: 'linear-gradient(180deg, #7ca6cb, #4b6982)',
    grey: 'linear-gradient(180deg, #d1d5db, #6b7280)',
    'grey-7': 'linear-gradient(180deg, #d1d5db, #6b7280)',
    negative: 'linear-gradient(180deg, #f87171, #dc2626)',
    white: '#ffffff'
  }

  return colorMap[props.color] ?? 'linear-gradient(180deg, #7ca6cb, #4b6982)'
})

const resolvedTextColor = computed(() => {
  if (props.flat || props.outline) {
    if (props.color === 'negative') return '#dc2626'
    if (props.color === 'white') return '#ffffff'
    if (props.color === 'grey' || props.color === 'grey-7') return '#475569'
    return '#4b6982'
  }
  return props.letterColor
})

const buttonStyle = computed(() => ({
  '--rm-button-height': props.buttonHeight,
  '--rm-button-width': props.width,
  '--rm-button-font-size': props.letterSize,
  '--rm-button-icon-size': props.iconSize,
  '--rm-button-badge-size': props.medalGarbageSize,
  '--rm-button-bg': resolvedBackground.value,
  '--rm-button-color': resolvedTextColor.value,
  '--rm-button-border':
    props.outline || props.isBorder
      ? '1px solid #4b6982'
      : '1px solid transparent'
}))

const buttonClass = computed(() => ({
  _button_shape_round: props.buttonShape === 'round',
  _button_shape_ellipse: props.buttonShape === 'ellipse',
  _button_shadow: props.isShadow,
  _button_border: props.isBorder,
  _just_icon:
    props.buttonType === 'justIcon' ||
    props.buttonType === 'delete' ||
    props.buttonType === 'medal',
  _withImg: props.buttonType === 'withImg',
  _button_content_center: props.contentPosition === 'center',
  _button_content_between: props.contentPosition === 'between',
  _button_flat: props.flat,
  _button_outline: props.outline
}))

const medalGarbageColor = computed(() => {
  if (props.isMedalAndGarbageColor === 'blue') return '_medal_garbage_blue'
  if (props.isMedalAndGarbageColor === 'white') return '_medal_garbage_white'
  return ''
})

const iconName = computed(() => props.icon || props.imageUrlOrIconName)
</script>

<template>
  <Button
    :type="type"
    :disabled="isDisable"
    class="_AFC_buttons"
    :class="buttonClass"
    :style="buttonStyle"
  >
    <img
      v-if="buttonType === 'delete'"
      src="~/assets/garbage.svg"
      :class="['_garbage_and_medal_icon', medalGarbageColor]"
      alt="delete"
      loading="lazy"
    />
    <img
      v-else-if="buttonType === 'medal'"
      src="~/assets/medal.svg"
      :class="[
        '_garbage_and_medal_icon',
        '_medal_icon_size',
        medalGarbageColor,
      ]"
      alt="medal"
      loading="lazy"
    />
    <div
      v-else-if="buttonType === 'justIcon' && specialIcon"
      class="_just_icon _btn_icon"
    >
      <span class="material-symbols-outlined">{{ imageUrlOrIconName }}</span>
    </div>
    <RMIcon
      v-else-if="buttonType === 'justIcon'"
      :name="iconName"
      class="_btn_icon _just_icon"
    />
    <div v-else class="_icon_and_text_container">
      <div v-if="buttonType === 'withIcon'" class="_icon_status">
        <img
          v-if="imageUrlOrIconName === 'medal'"
          src="~/assets/medal.svg"
          class="_modal_icon"
          alt="medal"
          loading="lazy"
        />
        <div v-else-if="specialIcon" class="_btn_icon _special_icon">
          <span class="material-symbols-outlined">{{
            imageUrlOrIconName
          }}</span>
        </div>
        <RMIcon v-else :name="iconName" class="_btn_icon" />
      </div>
      <div v-else-if="buttonType === 'withImg'" class="_icon_status">
        <div class="_img_box">
          <img
            :src="imageUrlOrIconName"
            class="_icon_size _img_size"
            alt="button"
            loading="lazy"
          />
        </div>
      </div>
      <span
        v-if="
          buttonType === 'withImg' ||
          buttonType === 'standard' ||
          buttonType === 'withIcon'
        "
        class="_just_letter"
        v-html="buttonLabel"
      />
    </div>
  </Button>
</template>

<style lang="sass" scoped>
._AFC_buttons
  width: var(--rm-button-width)
  min-height: var(--rm-button-height)
  max-width: 700px
  border-radius: 16px
  border: var(--rm-button-border)
  background: var(--rm-button-bg)
  color: var(--rm-button-color)
  transition: 0.3s ease
  user-select: none
  box-shadow: none
  overflow: hidden
  :deep(.p-button-label)
    display: none
  :deep(.p-button-icon)
    display: none
  &:hover
    opacity: 0.92
    transform: translateY(-1px)
  &:focus-visible
    outline: none
    box-shadow: 0 0 0 4px rgba(75, 105, 130, 0.16)
  &:active:not(:disabled)
    transform: translateY(0)
  &:disabled, &.p-disabled
    opacity: 0.58
    cursor: not-allowed
    transform: none
    filter: saturate(0.72)

._button_flat
  background: transparent
  border: 1px solid transparent
  box-shadow: none

._button_outline
  background: rgba(255,255,255,0.7)

._button_shape_round
  border-radius: 999px

._button_shape_ellipse
  border-radius: 18px

._button_border
  border: 1px solid $primary

._button_shadow
  box-shadow: 0px 10px 24px rgba(15, 23, 42, 0.16)

._just_icon
  width: 49px
  min-width: 49px
  min-height: 49px
  display: grid
  place-items: center

._icon_and_text_container
  display: flex
  align-items: center
  justify-content: center
  gap: 12px
  width: 100%
  min-height: calc(var(--rm-button-height) - 2px)
  padding: 10px 24px

._button_content_center
  justify-content: center

._button_content_between
  justify-content: space-between

._icon_status
  display: flex
  align-items: center
  justify-content: center

._btn_icon
  font-size: var(--rm-button-icon-size)
  color: var(--rm-button-color)

._icon_size
  width: 90px
  height: auto

._img_size
  height: 100%
  width: auto

._img_box
  display: grid
  place-items: center

._just_letter
  display: grid
  place-items: center
  width: 100%
  font-size: var(--rm-button-font-size)
  line-height: 1.3
  font-weight: 700
  text-align: center

._withImg
  min-height: 101px
  min-width: 101px
  flex-direction: column

._medal_garbage_blue
  filter: invert(76%) sepia(59%) saturate(1421%) hue-rotate(153deg) brightness(98%) contrast(93%)

._medal_garbage_white
  filter: brightness(0) invert(1)

._garbage_and_medal_icon
  height: var(--rm-button-badge-size)
  width: auto

._medal_icon_size
  height: 42px
  width: auto

._modal_icon
  width: 24px
  height: 24px

._special_icon
  display: flex
  align-items: center
  justify-content: center

@media (max-width: 374px)
  ._just_letter
    font-size: calc(var(--rm-button-font-size) - 2px)

@media (max-width: 340px)
  ._just_letter
    font-size: calc(var(--rm-button-font-size) - 4px)
</style>
