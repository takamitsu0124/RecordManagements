<script lang="ts" setup>
import { PropType, computed, onMounted, ref } from 'vue'

/** props定義 */
const props = defineProps({
  /** v-model */
  modelValue: {
    type: String,
    required: true,
  },
  /** type切り替え */
  kind: {
    type: String as PropType<'slider'>,
    default: 'slider',
  },
  /** label */
  tabLabels: {
    type: Array as PropType<string[]>,
    default: () => ['テスト①', 'テスト②', 'テスト③'],
  },
})
const windowWidth = ref(window.innerWidth)

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const pointTab = computed(() => {
  return props.tabLabels.map((label) => label)
})

onMounted(() => {
  addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
</script>

<template>
  <!-- type slider -->
  <div class="_afc_tabs">
    <q-tabs v-model="model" v-if="kind === 'slider'" indicator-color="primary">
      <q-tab
        v-for="label in pointTab"
        :key="label"
        :name="label"
        :label="label === '全て' ? label : `${label}`"
        class="_afc_tab"
        no-caps
      />
    </q-tabs>
  </div>
</template>

<style lang="sass" scoped>
._afc_tabs
  width: 100%
  max-width: 248px
  margin: 0 auto
  overflow: scroll
._afc_tab
  color: $primary
@media screen and (min-width: 750px)
  ._afc_tabs
    max-width: 262px
</style>
<style lang="sass">
._afc_tab
  .q-tab__label
    @media (max-width: 389px)
      font-size: 14px
    @media screen and (min-width: 750px)
      font-size: 18px
      @media (max-width: 359px)
        white-space: pre-wrap
        line-height: 1.2
        margin-top: 3px
</style>
