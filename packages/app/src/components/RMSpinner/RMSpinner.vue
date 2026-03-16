<script lang="ts" setup>
import ProgressSpinner from 'primevue/progressspinner'
</script>

<template>
  <div class="_spinner_container">
    <div class="_loading_box">
      <ProgressSpinner strokeWidth="5" class="_spinner" />
      <div class="_loading_text">Loading...</div>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._spinner_container
  display: grid
  place-items: center
  position: fixed
  inset: 0
  z-index: 99999
  background-color: rgba(15,23,42,0.35)
  backdrop-filter: blur(4px)

._loading_box
  display: flex
  flex-direction: column
  align-items: center
  gap: 12px
  padding: 24px 28px
  border-radius: 24px
  background: rgba(255,255,255,0.9)
  box-shadow: 0 18px 40px rgba(15,23,42,0.2)

._spinner
  width: 64px
  height: 64px

._loading_text
  font-size: 14px
  color: #475569
  letter-spacing: 0.08em
  text-transform: uppercase
</style>
