<script lang="ts" setup>
import { PropType } from 'vue'

/** props定義 */
const props = defineProps({
  /**カードの形  */
  cardShape: {
    type: String as PropType<'roundS' | 'roundM' | 'square'>,
    default: 'square',
  },
  /** 淵の線*/
  isBorder: { type: Boolean, default: false },
  /**カードの影
   * @allSide 全方向に影
   * @toBottom 左右と下に影
   */
  shadowDirection: {
    type: String as PropType<'allSide' | 'toBottom' | 'none'>,
    default: 'none',
  },
  /**背景色*/
  bgColor: { type: String, default: 'white' },
})

const cardStyleChanger = () => {
  const array = []
  if (props.isBorder) array.push('_set_border')
  if (props.shadowDirection === 'allSide') array.push('_set_allSideShadow')
  if (props.shadowDirection === 'toBottom') array.push('_set_toBottomShadow')
  if (props.bgColor) array.push(`bg-${props.bgColor}`)
  if (props.cardShape === 'roundS') array.push('_set_round_small')
  if (props.cardShape === 'roundM') array.push('_set_round_middle')
  return array
}
</script>

<template>
  <div :class="[cardStyleChanger()]">
    <slot></slot>
  </div>
</template>

<style lang="sass" scoped>
._set_border
  border: 1px solid $border-black
._set_allSideShadow
  box-shadow: 0 0 3px 2px rgba($black,0.08)
._set_toBottomShadow
  box-shadow: 0 3px 3px 2px rgba($black,0.1)
._set_round_small
  border-radius: 5px
._set_round_middle
  border-radius: 12px
</style>
