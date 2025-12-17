<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue' // computedも追加
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'

import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { Guild } from '@rm/types'
import { uploadFile, deleteFileByUrl } from '@rm/db/src/fireStorage/fireStorage' // 追加

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const guildId = ref<string | string[] | null>(null)
const guildName = ref('')
const guildDescription = ref('')
const guildSituation = ref<'存続' | '解散' | ''>('') // 追加
const guildFoundingDate = ref<string>('') // 追加 (YYYY/MM/DD形式)
const guildLogoUrl = ref<string>('') // 追加 (現在のロゴURL)
const newGuildLogoFile = ref<File | null>(null) // 追加 (新しいロゴファイル)
const formRef = ref<HTMLFormElement | null>(null)
const originalGuildData = ref<Guild | null>(null) // 元のギルドデータを保持

// 状況の選択肢
const situationOptions = ['存続', '解散']

// ファイル選択時にプレビューURLを生成
const logoPreviewUrl = computed(() => {
  if (newGuildLogoFile.value) {
    return URL.createObjectURL(newGuildLogoFile.value)
  } else if (guildLogoUrl.value) {
    return guildLogoUrl.value
  }
  return ''
})

onMounted(async () => {
  guildId.value = route.params.guildId
  if (!guildId.value) {
    $q.notify?.({
      type: 'negative',
      message: '編集対象のギルドIDが指定されていません。',
      position: 'top',
    })
    router.push('/')
    return
  }

  // 既存のギルド情報をフェッチ
  try {
    $q.loading?.show({ message: 'ギルド情報を読み込み中...' })
    await dbGuildModule.doc(guildId.value as string).fetch()
    const fetchedGuild = dbGuildModule.doc(guildId.value as string).data

    if (fetchedGuild) {
      originalGuildData.value = fetchedGuild as Guild
      guildName.value = fetchedGuild.guildName || ''
      guildDescription.value = fetchedGuild.guildMemo || ''
      guildSituation.value = fetchedGuild.situation || ''
      // DateオブジェクトをISO形式文字列に変換 (YYYY-MM-DD)
      guildFoundingDate.value = fetchedGuild.guildFoundingDateAt
        ? new Intl.DateTimeFormat('sv-SE').format(
            fetchedGuild.guildFoundingDateAt
          )
        : ''
      guildLogoUrl.value = fetchedGuild.guildLogo || ''
    } else {
      $q.notify?.({
        type: 'negative',
        message: '指定されたギルドが見つかりませんでした。',
        position: 'top',
      })
      router.push('/')
    }
  } catch (error) {
    $q.notify?.({
      type: 'negative',
      message: 'ギルド情報の取得中にエラーが発生しました。',
      position: 'top',
    })
    console.error('Error fetching guild for edit:', error)
    router.push('/')
  } finally {
    $q.loading?.hide()
  }
})

const removeCurrentLogo = async () => {
  if (!guildId.value || !guildLogoUrl.value) return

  $q.loading?.show({ message: 'ロゴを削除中...' })
  try {
    await deleteFileByUrl(guildLogoUrl.value)
    await dbGuildModule.doc(guildId.value as string).merge({ guildLogo: '' }) // DBからもURLを削除
    guildLogoUrl.value = '' // ローカルの状態をクリア
    $q.notify?.({
      type: 'positive',
      message: 'ギルドロゴを削除しました。',
      position: 'top',
    })
  } catch (error) {
    $q.notify?.({
      type: 'negative',
      message: 'ギルドロゴの削除に失敗しました。',
      position: 'top',
    })
    console.error('Error deleting guild logo:', error)
  } finally {
    $q.loading?.hide()
  }
}

const onSubmit = async () => {
  if (formRef.value) {
    const isValid = await formRef.value.validate()
    if (!isValid) {
      $q.notify?.({
        type: 'negative',
        message: '入力内容に誤りがあります。',
        position: 'top',
      })
      return
    }
  }

  $q.loading?.show({
    message: 'ギルド情報を更新しています...',
  })

  try {
    if (!guildId.value) {
      throw new Error('ギルドIDがありません。')
    }

    let updatedLogoUrl = guildLogoUrl.value
    // 新しいロゴファイルが選択された場合
    if (newGuildLogoFile.value) {
      // 古いロゴが存在すれば削除（これはuploadFileが成功した後に実行するのがより安全）
      // if (guildLogoUrl.value && originalGuildData.value?.guildLogo) {
      //   await deleteFileByUrl(originalGuildData.value.guildLogo)
      // }

      // ディレクトリパスのみを構築
      const uploadDirPath = `guild_logos/${guildId.value}`
      // uploadFile関数にファイル名も渡す
      updatedLogoUrl = await uploadFile(newGuildLogoFile.value, uploadDirPath, newGuildLogoFile.value.name)
    }

    const updatedData: Partial<Guild> = {
      // Partial<Guild> を使用して部分更新に対応
      guildName: guildName.value,
      guildMemo: guildDescription.value,
      situation: guildSituation.value,
      // 文字列の日付をDateオブジェクトに変換
      guildFoundingDateAt: guildFoundingDate.value
        ? new Date(guildFoundingDate.value)
        : null,
      guildLogo: updatedLogoUrl,
    }

    await dbGuildModule.doc(guildId.value as string).merge(updatedData)

    $q.notify?.({
      type: 'positive',
      message: 'ギルド情報が正常に更新されました。',
      position: 'top',
    })
    router.push({
      name: 'RMGuildDetail',
      params: { guildId: guildId.value as string },
    })
  } catch (error) {
    $q.notify?.({
      type: 'negative',
      message: 'ギルド情報の更新に失敗しました。',
      position: 'top',
    })
    console.error('Guild update failed:', error)
  } finally {
    $q.loading?.hide()
  }
}

const onCancel = () => {
  if (guildId.value) {
    router.push({
      name: 'RMGuildDetail',
      params: { guildId: guildId.value as string },
    })
  } else {
    router.push('/')
  }
}

const requiredRule = (val: string) =>
  (val && val.length > 0) || 'このフィールドは必須です。'
</script>

<template>
  <div class="flex flex-center _guild_edit_page">
    <q-card class="_guild_edit_card">
      <q-card-section>
        <div class="text-h6 text-center _card_title">ギルド情報編集</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form @submit.prevent="onSubmit" ref="formRef" class="q-gutter-md">
          <RMInput
            v-model="guildName"
            label="ギルド名 *"
            hint="ギルドの名称を入力してください"
            :rules="[requiredRule]"
            :outline="true"
          />

          <RMInput
            v-model="guildDescription"
            label="ギルド説明"
            type="textarea"
            hint="ギルドの説明を入力してください (任意)"
            :outline="true"
          />

          <!-- 状況 -->
          <q-select
            v-model="guildSituation"
            :options="situationOptions"
            label="状況 *"
            :rules="[requiredRule]"
            :outlined="true"
            emit-value
            map-options
          />

          <!-- 創設日 -->
          <RMInput
            v-model="guildFoundingDate"
            label="創設日"
            type="date"
            :date="true"
            hint="ギルドの創設日を選択してください"
            :outline="true"
          />

          <!-- ギルドロゴ -->
          <div class="q-pt-md">
            <q-img
              v-if="logoPreviewUrl"
              :src="logoPreviewUrl"
              alt="ギルドロゴプレビュー"
              class="q-mb-md _guild_logo_preview"
              fit="contain"
            />
            <q-file
              v-model="newGuildLogoFile"
              label="ギルドロゴ画像を選択"
              accept="image/*"
              clearable
              :outlined="true"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
            <RMButton
              v-if="guildLogoUrl && !newGuildLogoFile"
              label="現在のロゴを削除"
              flat
              color="negative"
              icon="delete"
              @click="removeCurrentLogo"
              class="q-mt-sm"
            />
          </div>

          <q-card-actions class="_btn_area">
            <RMButton label="キャンセル" flat color="grey" @click="onCancel" />
            <RMButton label="更新" type="submit" color="primary" />
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<style lang="sass" scoped>
._guild_edit_page
  background-color: #f8f9fa
  min-height: 100vh

._guild_edit_card
  width: 100%
  max-width: 550px
  padding: 30px
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08)
  border-radius: 12px
  background-color: #ffffff

._card_title
  font-size: 28px
  font-weight: 600
  color: #343a40
  margin-bottom: 30px

.q-gutter-md
  gap: 20px

.q-card-actions
  margin-top: 30px
._btn_area
  display: flex
  justify-content: center
  gap: 10px

._guild_logo_preview
  max-width: 200px
  height: 200px
  border: 1px solid #ccc
  border-radius: 4px

// レスポンシブ調整
@media screen and (max-width: 600px)
  ._guild_edit_card
    margin: 20px
    padding: 20px
  ._card_title
    font-size: 24px
    margin-bottom: 20px
</style>
