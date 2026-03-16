<script lang="ts" setup>
import { PropType } from 'vue'
import Toolbar from 'primevue/toolbar'
import RMHamburger from '../RMHamburger/RMHamburger.vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  menu: {
    type: Object as PropType<{ name: string; url: string }[]>,
    required: true,
  },
})

const router = useRouter()
const hamOpen = defineModel<boolean>('hamOpen', { default: false })
const emit = defineEmits(['menuClick', 'logout'])

const menuClick = (menu: { name: string; url: string }) => {
  emit('menuClick', menu)
}

const logout = () => {
  emit('logout')
}
</script>

<template>
  <Toolbar class="rm-header-shell">
    <template #start>
      <div class="_current_name">{{ router.currentRoute.value.name }}</div>
    </template>
    <template #end>
      <RMHamburger
        v-model:isOpen="hamOpen"
        :menu="props.menu"
        @logout="logout"
        @menuClick="menuClick"
        class="_rm_hamburger"
      />
    </template>
  </Toolbar>
</template>

<style lang="sass" scoped>
.rm-header-shell
  position: fixed
  top: 0
  left: 0
  right: 0
  z-index: 1000
  border-radius: 0
  background: linear-gradient(180deg, rgba(75, 105, 130, 0.96), rgba(52, 73, 94, 0.94))
  border: none
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16)
  color: white
  :deep(.p-toolbar)
    border-radius: 0

._current_name
  font-size: 18px
  font-weight: bold
  color: white

._rm_hamburger
  width: 100%
</style>
