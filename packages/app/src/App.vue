<template>
  <Toast
    group="app-top"
    position="top-center"
    :breakpoints="{ '640px': { width: '92vw' } }"
  />
  <Toast
    group="app-bottom"
    position="bottom-center"
    :breakpoints="{ '640px': { width: '92vw' } }"
  />
  <DynamicDialog />
  <RMScrollTopButton />
  <router-view />
</template>

<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog'
import RMScrollTopButton from 'src/components/RMScrollTopButton/RMScrollTopButton.vue'
import Toast from 'primevue/toast'

defineOptions({
  name: 'App',
})
</script>
