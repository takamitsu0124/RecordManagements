<script lang="ts" setup>
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { Guild, User } from '@rm/types'
import { globalLoginUserData, lacksGuildId } from 'src/boot/main'
import RMCard from 'src/components/RMCard/RMCard.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import ProgressSpinner from 'primevue/progressspinner'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { notifyError } from 'src/composables/useAppNotifications'

const router = useRouter()

const currentUserCharaName = ref<string | null>(null)
const hasUserCharaNameInAnyGuild = ref(false)
const isLoadingGuildCheck = ref(true)
const hasInitialized = ref(false)

const loadHomeData = async (userId: string) => {
  try {
    isLoadingGuildCheck.value = true
    hasUserCharaNameInAnyGuild.value = false

    await dbUserModule.doc(userId).fetch()
    const userData = dbUserModule.doc(userId).data as User | null

    if (userData && userData.charaName) {
      currentUserCharaName.value = userData.charaName
    } else {
      console.warn('ログインユーザーのcharaNameが見つかりません。')
      return
    }

    await dbGuildModule.fetch()
    const allGuilds: Guild[] = Array.from(dbGuildModule.data.values())

    for (const guild of allGuilds) {
      for (const memberUid in guild.guildMember) {
        if (guild.guildMember[memberUid].name === currentUserCharaName.value) {
          hasUserCharaNameInAnyGuild.value = true
          break
        }
      }
      if (hasUserCharaNameInAnyGuild.value) break
    }
  } catch (error) {
    console.error('ギルド情報の取得中にエラーが発生しました:', error)
    notifyError('所属情報の取得に失敗しました。')
  } finally {
    isLoadingGuildCheck.value = false
  }
}

watch(
  () => globalLoginUserData.value.id,
  async (userId) => {
    if (!userId) {
      if (hasInitialized.value) {
        isLoadingGuildCheck.value = false
      }
      return
    }

    hasInitialized.value = true
    await loadHomeData(userId)
  },
  { immediate: true }
)

const registerGuild = () => {
  router.push('RMGuildRegister')
}

const selectGuild = () => {
  if (!globalLoginUserData.value.id) {
    notifyError('ユーザー情報がまだ読み込まれていません。')
    return
  }

  const userData = dbUserModule.doc(globalLoginUserData.value.id).data as User | null
  const userGuildId = userData?.guildId

  if (userGuildId) {
    router.push({ name: 'RMGuildDetail', params: { guildId: userGuildId } })
  } else {
    console.error('ログインユーザーのギルドIDが見つかりません。')
    notifyError('所属ギルド情報が見つかりません。')
  }
}

const goToUserEdit = () => {
  if (globalLoginUserData.value.id) {
    router.push({
      name: 'RMUserEdit',
      params: { userId: globalLoginUserData.value.id },
    })
  } else {
    notifyError('ユーザー情報が見つかりません。')
  }
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div v-if="isLoadingGuildCheck" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">所属情報を確認中...</p>
    </div>

    <div v-else class="_home_inner_container">
      <RMCard
        v-if="lacksGuildId"
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerGuild"
      >
        <RMIcon class="_icon_setting" name="add_home" />
        <div class="_content_text">ギルド登録</div>
      </RMCard>
      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="selectGuild"
      >
        <RMIcon class="_icon_setting" name="touch_app" />
        <div class="_content_text">ギルド選択</div>
      </RMCard>

      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="goToUserEdit"
      >
        <RMIcon class="_icon_setting" name="edit" />
        <div class="_content_text">マイページ</div>
      </RMCard>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._home_inner_container
  width: min(100%, 920px)
  display: flex
  flex-wrap: wrap
  justify-content: center
  align-items: center
  gap: 24px
  padding: 8px

._card_content
  width: 160px
  min-height: 160px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  gap: 14px
  cursor: pointer
  border: 1px solid rgba(255,255,255,0.72)
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,248,252,0.94))
  transition: all 0.3s ease
  &:hover
    transform: translateY(-6px) scale(1.02)
    box-shadow: 0 20px 36px rgba(15, 23, 42, 0.14)
    border-color: rgba(161, 194, 225, 0.8)

._icon_setting
  font-size: 78px
  color: #5c6bc0
  transition: color 0.3s ease

._content_text
  font-size: 18px
  font-weight: 600
  color: #334155
  transition: color 0.3s ease

._card_content:hover ._icon_setting
  color: #3f51b5

._card_content:hover ._content_text
  color: #3f51b5

@media screen and (min-width: 768px)
  ._card_content
    width: 190px
    min-height: 190px
  ._icon_setting
    font-size: 88px
  ._content_text
    font-size: 20px
</style>
