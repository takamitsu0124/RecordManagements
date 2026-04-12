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
  min-height: 100vh
  width: 100%
</style>
