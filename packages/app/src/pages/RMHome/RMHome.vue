<script lang="ts" setup>
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild' // 追加
import { Guild, User } from '@rm/types' // 追加
import { globalLoginUserData, lacksGuildId } from 'src/boot/main'
import RMCard from 'src/components/RMCard/RMCard.vue'
import { onMounted, ref } from 'vue' // refもインポート
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar' // useQuasarをインポート

const router = useRouter()
const $q = useQuasar() // $qインスタンスを取得

const currentUserCharaName = ref<string | null>(null)
const hasUserCharaNameInAnyGuild = ref(false)
const isLoadingGuildCheck = ref(true)

onMounted(async () => {
  // ユーザー情報をフェッチ
  await dbUserModule.doc(globalLoginUserData.value.id).fetch()
  const userData = dbUserModule.doc(globalLoginUserData.value.id)
    .data as User | null

  if (userData && userData.charaName) {
    currentUserCharaName.value = userData.charaName
  } else {
    console.warn('ログインユーザーのcharaNameが見つかりません。')
    isLoadingGuildCheck.value = false
    return
  }

  // すべてのギルドをフェッチし、キャラ名が存在するかチェック
  try {
    await dbGuildModule.fetch()
    const allGuilds: Guild[] = Array.from(dbGuildModule.data.values())

    for (const guild of allGuilds) {
      for (const memberUid in guild.guildMember) {
        if (guild.guildMember[memberUid].name === currentUserCharaName.value) {
          hasUserCharaNameInAnyGuild.value = true
          break
        }
      }
      if (hasUserCharaNameInAnyGuild.value) {
        break
      }
    }
  } catch (error) {
    console.error('ギルド情報の取得中にエラーが発生しました:', error)
  } finally {
    isLoadingGuildCheck.value = false
  }
})

const registerGuild = () => {
  router.push('RMGuildRegister')
}

const selectGuild = () => {
  const userData = dbUserModule.doc(globalLoginUserData.value.id)
    .data as User | null
  const userGuildId = userData?.guildId

  if (userGuildId) {
    router.push({ name: 'RMGuildDetail', params: { guildId: userGuildId } })
  } else {
    console.error('ログインユーザーのギルドIDが見つかりません。')
    $q.notify?.({
      type: 'negative',
      message: '所属ギルド情報が見つかりません。',
      position: 'top',
    })
  }
}

const goToUserEdit = () => {
  if (globalLoginUserData.value.id) {
    router.push({
      name: 'RMUserEdit',
      params: { userId: globalLoginUserData.value.id },
    })
  } else {
    $q.notify({
      type: 'negative',
      message: 'ユーザー情報が見つかりません。',
      position: 'top',
    })
  }
}
</script>

<template>
  <div class="_home_outer_container">
    <!-- ギルドに所属しておらず、roleがエンドユーザー -->
    <div class="_home_inner_container">
      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerGuild"
        v-if="lacksGuildId"
      >
        <q-icon class="_icon_setting" name="add_home" />
        <div class="_content_text">ギルド登録</div>
      </RMCard>
      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="selectGuild"
      >
        <q-icon class="_icon_setting" name="o_touch_app" />
        <div class="_content_text">ギルド選択</div>
      </RMCard>

      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="goToUserEdit"
      >
        <q-icon class="_icon_setting" name="edit" />
        <div class="_content_text">ユーザー情報編集</div>
      </RMCard>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._home_outer_container
  padding: 40px

._home_inner_container
  display: flex
  flex-wrap: wrap
  justify-content: center
  align-items: center
  gap: 25px

._card_content
  width: 150px
  height: 150px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  gap: 10px
  cursor: pointer
  border: 1px solid #e0e0e0
  border-radius: 12px
  background-color: #ffffff
  transition: all 0.3s ease
  &:hover
    transform: translateY(-5px) scale(1.02)
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1)
    border-color: #b0c4de

._icon_setting
  font-size: 80px
  color: #5c6bc0
  transition: color 0.3s ease

._content_text
  font-size: 18px
  font-weight: 500
  color: #424242
  transition: color 0.3s ease

._card_content:hover ._icon_setting
  color: #3f51b5

._card_content:hover ._content_text
  color: #3f51b5

// PC
@media screen and (min-width: 768px)
  ._home_outer_container
    padding: 60px
  ._home_inner_container
    max-width: 900px
    margin: 0 auto
  ._card_content
    width: 180px
    height: 180px
  ._icon_setting
    font-size: 90px
  ._content_text
    font-size: 20px
</style>
