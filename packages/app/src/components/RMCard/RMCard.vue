<script lang="ts" setup>
import type { PropType } from 'vue'
import { computed } from 'vue'
import Card from 'primevue/card'

const props = defineProps({
  cardShape: {
    type: String as PropType<'roundS' | 'roundM' | 'square'>,
    default: 'square'
  },
  isBorder: { type: Boolean, default: false },
  shadowDirection: {
    type: String as PropType<'allSide' | 'toBottom' | 'none'>,
    default: 'none'
  },
  bgColor: { type: String, default: 'white' }
})

const cardClass = computed(() => ({
  '_set_border': props.isBorder,
  '_set_allSideShadow': props.shadowDirection === 'allSide',
  '_set_toBottomShadow': props.shadowDirection === 'toBottom',
  '_set_round_small': props.cardShape === 'roundS',
  '_set_round_middle': props.cardShape === 'roundM',
  '_set_round_square': props.cardShape === 'square'
}))
</script>

<template>
  <Card class="rm-card" :class="cardClass" :style="{ background: bgColor }">
    <template #content>
      <div class="rm-card__content">
        <slot />
      </div>
    </template>
  </Card>
</template>

<style lang="sass" scoped>
.rm-card
  overflow: hidden
  border: 1px solid rgba(255,255,255,0.75)
  backdrop-filter: blur(10px)
  :deep(.p-card-body)
    padding: 0
  :deep(.p-card-content)
    padding: 0

.rm-card__content
  height: 100%

._set_border
  border: 1px solid $border-black
._set_allSideShadow
  box-shadow: 0 0 3px 2px rgba($black,0.08)
._set_toBottomShadow
  box-shadow: 0 3px 3px 2px rgba($black,0.1)
._set_round_small
  border-radius: 10px
._set_round_middle
  border-radius: 20px
._set_round_square
  border-radius: 0
</style>
