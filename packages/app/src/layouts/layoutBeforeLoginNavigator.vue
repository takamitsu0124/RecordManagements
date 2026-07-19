<script lang="ts" setup>
// $
</script>

<template>
  <div class="_login_layout">
    <router-view v-slot="{ Component, route }">
      <Transition name="rm-page" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </router-view>
    <div v-show="false" id="recaptcha-container" />
  </div>
</template>

<style lang="sass" scoped>
._login_layout
  min-height: var(--rm-viewport-height)
  width: 100%
</style>
