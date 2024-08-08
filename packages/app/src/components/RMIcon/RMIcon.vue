<script lang="ts" setup>
import { PropType } from 'vue'
import { IconTypes } from '../iconType'

defineProps({
  name: { type: String as PropType<IconTypes>, required: true },
  type: {
    type: String as PropType<'' | 'outlined' | 'sharp' | 'round' | 'two-tone'>,
    default: '',
  },
})
</script>

<template>
  <div :class="`md-icon ${type ? `material-icons-${type}` : 'material-icons'}`">
    {{ name }}
  </div>
</template>

<style scoped>
.md-icon {
  user-select: none;
}
</style>
