<script lang="ts" setup>
// $
</script>

<template>
  <div class="_login_layout">
    <router-view />
  </div>
  <div id="recaptcha-container" v-show="false" />
</template>

<style lang="sass" scoped>
._login_layout
  min-height: var(--rm-viewport-height)
  width: 100%
</style>
