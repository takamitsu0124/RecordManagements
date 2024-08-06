<script lang="ts" setup></script>
<template>
  <div class="_spinner_container">
    <div class="_loading_box">
      <span class="_loading_item" style="--index: 0"></span>
      <span class="_loading_item" style="--index: 1"></span>
      <span class="_loading_item" style="--index: 2"></span>
      <span class="_loading_item" style="--index: 3"></span>
      <span class="_loading_item" style="--index: 4"></span>
      <span class="_loading_item" style="--index: 5"></span>
      <span class="_loading_item" style="--index: 6"></span>
      <span class="_loading_item" style="--index: 7"></span>
    </div>
  </div>
</template>
<style lang="sass" scoped>
._spinner_container
  display: grid
  place-items: center
  position: fixed
  top: 0
  left: 0
  width: 100vw
  height: 100vh
  z-index: 99999
  background-color: rgba(0,0,0,0.4)
._loading_box
  position: relative
  height: 60px
  width: 60px

._loading_item
  display: inline-block
  width: 8px
  height: 8px
  border-radius: 50%
  background-color: white
  opacity: 0.5
  position: absolute
  top: 50%
  left: 50%
  --angle: calc(360deg / 8 * var(--index))
  --x: calc(cos(var(--angle)) * 30px)
  --y: calc(sin(var(--angle)) * 30px)
  translate: calc(var(--x) - 50%) calc(var(--y) - 50%)
  --duration: 1.8s
  --delay: calc(var(--duration) * var(--index) / 8)
  animation: animate var(--duration) var(--delay) infinite ease-in-out

@keyframes animate
  50%
    opacity: 1
    transform: scale(1.6)
</style>
