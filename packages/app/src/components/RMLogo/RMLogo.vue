<script lang="ts" setup>
import { computed, ref } from 'vue'

const props = defineProps({
  margin_top: {
    type: String,
    default: '0px'
  },
  margin_bottom: {
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

const marginTop = computed(() => `${props.margin_top}`)
const marginBottom = computed(() => `${props.margin_bottom}`)
const serviceBottom = computed(() => `${props.serviceBottom}`)

const appLogo = ref(
  'https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Ftwitter_header_photo_2.png?alt=media&token=ee80dd4e-12dd-4143-8a59-bb3641b434c6'
)
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
