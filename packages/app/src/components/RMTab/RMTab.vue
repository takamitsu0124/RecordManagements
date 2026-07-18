<script lang="ts" setup>
import type { PropType} from 'vue'
import { computed } from 'vue'
import SelectButton from 'primevue/selectbutton'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  kind: {
    type: String as PropType<'slider'>,
    default: 'slider'
  },
  tabLabels: {
    type: Array as PropType<string[]>,
    default: () => ['テスト①', 'テスト②', 'テスト③']
  }
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="_afc_tabs">
    <SelectButton
      v-if="kind === 'slider'"
      v-model="model"
      :options="tabLabels"
      class="_afc_select_button"
    />
  </div>
</template>

<style lang="sass" scoped>
._afc_tabs
  width: 100%
  max-width: 320px
  margin: 0 auto

._afc_select_button
  width: 100%
  :deep(.p-togglebutton)
    flex: 1
    color: $primary
    border-color: rgba(75, 105, 130, 0.2)
  :deep(.p-togglebutton-checked)
    background: linear-gradient(180deg, #A1C2E1, #4B6982)
    border-color: #4B6982

@media screen and (min-width: 750px)
  ._afc_tabs
    max-width: 420px
</style>
