<script lang="ts" setup>
import type { PropType } from 'vue'
import { computed } from 'vue'
import Toolbar from 'primevue/toolbar'
import RMHamburger from '../RMHamburger/RMHamburger.vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  menu: {
    type: Object as PropType<{ name: string; url: string }[]>,
    required: true
  }
})

const route = useRoute()
const hamOpen = defineModel<boolean>('hamOpen', { default: false })
const emit = defineEmits(['menuClick', 'logout'])
const pageDescriptionMap: Record<string, string> = {
  RMSkillPost: 'メンバーの所持スキルと画像順を更新',
  RMGuildDetail: '承認状況とメンバー運用を確認',
  RMSkillMasterAdmin: '検索・登録・更新をまとめて管理',
  RMUserEdit: 'プロフィール・所持スキル・画像をまとめて確認'
}

const currentPageTitle = computed(() => {
  const metaTitle = route.meta.pageTitle
  return typeof metaTitle === 'string' && metaTitle
    ? metaTitle
    : 'Record Managements'
})

const currentPageDescription = computed(() => {
  return route.name && pageDescriptionMap[String(route.name)]
    ? pageDescriptionMap[String(route.name)]
    : 'ギルド運営に必要な操作へすばやく移動'
})

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
      <div class="rm-header-shell__brand">
        <div class="rm-header-shell__app">Record Managements</div>
        <div class="rm-header-shell__current_name">{{ currentPageTitle }}</div>
        <p class="rm-header-shell__mobile_description">
          {{ currentPageDescription }}
        </p>
      </div>
    </template>
    <template #end>
      <div class="rm-header-shell__actions">
        <p class="rm-header-shell__description">{{ currentPageDescription }}</p>
        <RMHamburger
          v-model:isOpen="hamOpen"
          :menu="props.menu"
          class="_rm_hamburger"
          @logout="logout"
          @menuClick="menuClick"
        />
      </div>
    </template>
  </Toolbar>
</template>

<style lang="sass" scoped>
.rm-header-shell
  position: fixed
  display: flex
  align-items: center
  justify-content: space-between
  gap: 16px
  flex-wrap: nowrap
  top: 0
  left: 0
  right: 0
  z-index: 1000
  min-height: var(--rm-header-height)
  padding: 10px max(12px, env(safe-area-inset-right)) 10px max(12px, env(safe-area-inset-left))
  border-radius: 0 0 24px 24px
  background: linear-gradient(180deg, rgba(75, 105, 130, 0.96), rgba(47, 67, 89, 0.94))
  border: none
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18)
  color: white
  backdrop-filter: blur(18px)
  :deep(.p-toolbar)
    display: flex
    align-items: center
    justify-content: space-between
    gap: 16px
    padding: 0
    border-radius: 0
    background: transparent
    border: none
    box-shadow: none
  :deep(.p-toolbar-start)
    flex: 1 1 auto
    min-width: 0
  :deep(.p-toolbar-end)
    flex: 0 0 auto
    min-width: 0

.rm-header-shell__brand
  display: flex
  flex-direction: column
  gap: 4px
  min-width: 0

.rm-header-shell__app
  font-size: 11px
  font-weight: 700
  letter-spacing: 0.12em
  text-transform: uppercase
  color: rgba(255, 255, 255, 0.74)

.rm-header-shell__current_name
  font-size: clamp(16px, 2.2vw, 22px)
  font-weight: 800
  color: white
  line-height: 1.2
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis

.rm-header-shell__mobile_description
  display: none
  margin: 0
  max-width: 48ch
  font-size: 12px
  line-height: 1.45
  color: rgba(255, 255, 255, 0.72)

.rm-header-shell__actions
  display: flex
  align-items: center
  gap: 14px
  min-width: 0

.rm-header-shell__description
  margin: 0
  max-width: 360px
  font-size: 13px
  line-height: 1.5
  color: rgba(255, 255, 255, 0.78)
  text-align: right

._rm_hamburger
  flex: 0 0 auto

@media (max-width: 1023px)
  .rm-header-shell
    padding-top: max(10px, env(safe-area-inset-top))
  .rm-header-shell__description
    display: none
  .rm-header-shell__mobile_description
    display: block

@media (max-width: 767px)
  .rm-header-shell
    border-radius: 0 0 20px 20px
  .rm-header-shell__current_name
    font-size: 16px
    white-space: normal
    display: -webkit-box
    -webkit-line-clamp: 2
    -webkit-box-orient: vertical
</style>
