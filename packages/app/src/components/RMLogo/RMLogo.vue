<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
  margin_top: {
    type: String,
    default: '0px',
  },
  margin_bottom: {
    type: String,
    default: '0px',
  },
  serviceName: {
    type: String,
    default: '',
  },
  serviceBottom: {
    type: String,
    default: '0px',
  },
})

const marginTop = computed(() => `${props.margin_top}`)
const marginBottom = computed(() => `${props.margin_bottom}`)
const serviceBottom = computed(() => `${props.serviceBottom}`)
</script>

<template>
  <q-img src="~/assets/apple_logo.png" class="_logo" />
  <div class="_service_name" v-if="props.serviceName">
    {{ props.serviceName }}
  </div>
</template>

<style lang="sass" scoped>
._logo
  width: 170px
  height: auto
  margin-top: v-bind(marginTop)
  margin-bottom: v-bind(marginBottom)
._service_name
  font-size: 16px
  color: $border-black
  margin-bottom: v-bind(serviceBottom)
</style>
