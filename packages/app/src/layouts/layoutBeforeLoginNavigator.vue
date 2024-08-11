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
@media screen and (min-width: 1080px)
  ._login_layout
    width: 1080px
</style>
