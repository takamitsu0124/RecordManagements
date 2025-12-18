<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { Guild } from '@rm/types'
// import RMCard from 'src/components/RMCard/RMCard.vue' // RMCardを使用
import RMButton from 'src/components/RMButton/RMButton.vue' // RMButtonを使用

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const guildId = ref<string | string[] | null>(null)
const guildDetail = ref<Guild | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const isEditMode = ref(false) // 編集モードのトグル状態

onMounted(async () => {
  guildId.value = route.params.guildId
  if (!guildId.value) {
    errorMessage.value = 'ギルドIDが指定されていません。'
    isLoading.value = false
    $q.notify({
      type: 'negative',
      message: errorMessage.value,
      position: 'top',
    })
    router.push('/') // IDがない場合はホームに戻る
    return
  }

  // ギルド詳細情報をフェッチ
  try {
    isLoading.value = true
    // dbGuildModule.doc(guildId.value as string).fetch() で特定のドキュメントを取得
    await dbGuildModule.doc(guildId.value as string).fetch()
    const fetchedGuild = dbGuildModule.doc(guildId.value as string).data

    if (fetchedGuild) {
      guildDetail.value = fetchedGuild as Guild
    } else {
      errorMessage.value = '指定されたギルドが見つかりませんでした。'
      $q.notify({
        type: 'negative',
        message: errorMessage.value,
        position: 'top',
      })
      router.push('/') // 見つからない場合はホームに戻る
    }
  } catch (error) {
    errorMessage.value = 'ギルド情報の取得中にエラーが発生しました。'
    $q.notify({
      type: 'negative',
      message: errorMessage.value,
      position: 'top',
    })
    console.error('Error fetching guild detail:', error)
    router.push('/') // エラー時はホームに戻る
  } finally {
    isLoading.value = false
  }
})

const formatGuildFoundingDate = (date: Date | null) => {
  if (!date) return '不明'
  return new Intl.DateTimeFormat('ja-JP').format(date)
}

const goToEditGuild = () => {
  if (guildId.value) {
    router.push({
      name: 'RMGuildEdit',
      params: { guildId: guildId.value as string },
    })
  } else {
    $q.notify({
      type: 'negative',
      message: '編集するギルドのIDが見つかりません。',
      position: 'top',
    })
  }
}

const goBack = () => {
  router.go(-1) // 一つ前のページに戻る
}

const goToPostSkill = (userId: string) => {
  if (!isEditMode.value) return // 編集モードでない場合は何もしない

  if (guildId.value) {
    router.push({
      name: 'RMSkillPost',
      params: { guildId: guildId.value as string, userId: userId },
    })
  }
}
</script>

<template>
  <q-page class="flex justify-center q-pa-md _guild_detail_page">
    <div v-if="isLoading" class="text-center q-pt-xl">
      <q-spinner-hourglass color="primary" size="3em" />
      <p class="text-primary q-mt-md">ギルド情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="text-center q-pt-xl text-negative">
      <p>{{ errorMessage }}</p>
      <RMButton
        label="ホームに戻る"
        color="primary"
        @click="router.push('/')"
        class="q-mt-md"
      />
    </div>

    <q-card v-else-if="guildDetail" class="_guild_detail_card">
      <q-card-section class="q-pb-sm">
        <div class="row items-center">
          <div class="text-h5 text-bold _card_title col">
            {{ guildDetail.guildName }}
          </div>
          <q-toggle
            v-model="isEditMode"
            checked-icon="edit"
            unchecked-icon="visibility"
            label="編集モード"
            color="primary"
            class="col-auto"
          />
        </div>
        <div class="text-subtitle1 text-grey-7">ID: {{ guildDetail.id }}</div>
      </q-card-section>

      <q-separator inset />

      <q-card-section class="q-pt-sm">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-md-6">
            <p class="text-body2 text-bold">ギルド説明:</p>
            <p class="text-body1">{{ guildDetail.guildMemo || '説明なし' }}</p>
          </div>
          <div class="col-12 col-md-6">
            <p class="text-body2 text-bold">状況:</p>
            <p class="text-body1">{{ guildDetail.situation || '不明' }}</p>
          </div>
          <div class="col-12 col-md-6">
            <p class="text-body2 text-bold">創設日:</p>
            <p class="text-body1">
              {{ formatGuildFoundingDate(guildDetail.guildFoundingDateAt) }}
            </p>
          </div>
          <div class="col-12 col-md-6">
            <p class="text-body2 text-bold">ゲーム内ギルドID:</p>
            <p class="text-body1">
              {{ guildDetail.guildIdInGame || '未登録' }}
            </p>
          </div>
          <div class="col-12 col-md-6">
            <p class="text-body2 text-bold">公式メンバー数:</p>
            <p class="text-body1">{{ guildDetail.officialMembers }}人</p>
          </div>
        </div>
      </q-card-section>

      <q-separator inset />

      <q-card-section>
        <div class="text-h6 q-mb-md">ギルドメンバー</div>
        <div v-if="Object.keys(guildDetail.guildMember).length > 0">
          <q-list bordered separator>
            <q-item
              v-for="(member, uid) in guildDetail.guildMember"
              :key="uid"
              :clickable="isEditMode"
              v-ripple="isEditMode"
              @click="goToPostSkill(uid as string)"
              :class="{ _item_clickable: isEditMode }"
            >
              <q-item-section avatar>
                <q-icon name="person" color="grey-6" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ member.name }}</q-item-label>
                <q-item-label caption>{{ uid }}</q-item-label>
              </q-item-section>
              <q-item-section v-if="isEditMode" side>
                <q-icon name="arrow_forward_ios" color="grey" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <p v-else class="text-grey-6">メンバーがいません。</p>
      </q-card-section>

      <q-card-actions :align="'right'" class="q-pa-md q-gutter-x-md">
        <RMButton label="戻る" flat color="grey" @click="goBack" />
        <RMButton label="ギルドを編集" color="primary" @click="goToEditGuild" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<style lang="sass" scoped>
._guild_detail_page
  background-color: #f0f2f5
  min-height: calc(100vh - 50px)
  display: flex
  align-items: flex-start
  justify-content: center

._guild_detail_card
  width: 100%
  max-width: 800px
  border-radius: 8px
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1)
  background-color: #ffffff
  margin-top: 20px
  margin-bottom: 20px

._card_title
  font-size: 1.8em
  color: #333

._item_clickable
  cursor: pointer
  &:hover
    background-color: #f5f5f5

@media screen and (max-width: 768px)
  ._guild_detail_card
    margin-top: 10px
    margin-bottom: 10px
    padding: 15px
  ._card_title
    font-size: 1.5em
</style>
