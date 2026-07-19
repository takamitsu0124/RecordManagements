<script lang="ts" setup>
import { computed, ref } from 'vue'
import twitterHeaderPhoto from 'assets/logo_transparent.png'

const props = defineProps({
  marginTop: {
    type: String,
    default: '0px'
  },
  marginBottom: {
    type: String,
    default: '0px'
  },
  serviceName: {
    type: String,
    default: ''
  },
  serviceBottom: {
    type: String,
    default: '0px'
  }
})

const marginTop = computed(() => `${props.marginTop}`)
const marginBottom = computed(() => `${props.marginBottom}`)
const serviceBottom = computed(() => `${props.serviceBottom}`)

const appLogo = ref(twitterHeaderPhoto)
</script>

<template>
  <!-- img-lazy-loading:allow -->
  <img :src="appLogo" alt="RecordManagement" class="_logo" />
  <div v-if="props.serviceName" class="_service_name">
    {{ props.serviceName }}
  </div>
</template>

<style lang="sass" scoped>
._logo
  width: 180px
  height: auto
  margin-top: v-bind(marginTop)
  margin-bottom: v-bind(marginBottom)
._service_name
  font-size: 16px
  color: $border-black
  margin-bottom: v-bind(serviceBottom)
</style>
