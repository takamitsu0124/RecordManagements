<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import { dbGuildModule, deleteFileByUrl, uploadFile } from '@rm/db'
import { Guild } from '@rm/types'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import { fetchGuild } from 'src/services/guildData'

const route = useRoute()
const router = useRouter()

const guildId = ref<string | string[] | null>(null)
const guildName = ref('')
const guildDescription = ref('')
const guildSituation = ref<'存続' | '解散' | ''>('')
const guildFoundingDate = ref<string>('')
const guildLogoUrl = ref('')
const guildGoogleCalendarId = ref('')
const newGuildLogoFile = ref<File | null>(null)

const situationOptions = ['存続', '解散']

const logoPreviewUrl = computed(() => {
  if (newGuildLogoFile.value) {
    return URL.createObjectURL(newGuildLogoFile.value)
  }
  return guildLogoUrl.value
})

onMounted(async () => {
  guildId.value = route.params.guildId
  if (!guildId.value) {
    notifyError('編集対象のギルドIDが指定されていません。')
    router.push('/')
    return
  }

  await useSpinner(async () => {
    try {
      const fetchedGuild = await fetchGuild(guildId.value as string)

      if (fetchedGuild) {
        guildName.value = fetchedGuild.guildName || ''
        guildDescription.value = fetchedGuild.guildMemo || ''
        guildSituation.value = fetchedGuild.situation || ''
        guildFoundingDate.value = fetchedGuild.guildFoundingDateAt
          ? new Intl.DateTimeFormat('sv-SE').format(
              fetchedGuild.guildFoundingDateAt
            )
          : ''
        guildLogoUrl.value = fetchedGuild.guildLogo || ''
        guildGoogleCalendarId.value = fetchedGuild.googleCalendarId || ''
      } else {
        notifyError('指定されたギルドが見つかりませんでした。')
        router.push('/')
      }
    } catch (error) {
      notifyError('ギルド情報の取得中にエラーが発生しました。')
      console.error('Error fetching guild for edit:', error)
      router.push('/')
    }
  })
})

const onLogoSelect = (event: { files?: File[] }) => {
  newGuildLogoFile.value = event.files?.[0] ?? null
}

const removeCurrentLogo = async () => {
  if (!guildId.value || !guildLogoUrl.value) return

  await useSpinner(async () => {
    try {
      await deleteFileByUrl(guildLogoUrl.value)
      await dbGuildModule.doc(guildId.value as string).merge({ guildLogo: '' })
      guildLogoUrl.value = ''
      notifySuccess('ギルドロゴを削除しました。')
    } catch (error) {
      notifyError('ギルドロゴの削除に失敗しました。')
      console.error('Error deleting guild logo:', error)
    }
  })
}

const onSubmit = async () => {
  if (!guildName.value.trim()) {
    notifyError('ギルド名を入力してください。')
    return
  }

  await useSpinner(async () => {
    try {
      if (!guildId.value) {
        throw new Error('ギルドIDがありません。')
      }

      let updatedLogoUrl = guildLogoUrl.value
      if (newGuildLogoFile.value) {
        const uploadDirPath = `guild_logos/${guildId.value}`
        updatedLogoUrl = await uploadFile(
          newGuildLogoFile.value,
          uploadDirPath,
          newGuildLogoFile.value.name
        )
      }

      const updatedData: Partial<Guild> = {
        guildName: guildName.value,
        guildMemo: guildDescription.value,
        googleCalendarId: guildGoogleCalendarId.value.trim(),
        situation: guildSituation.value,
        guildFoundingDateAt: guildFoundingDate.value
          ? new Date(guildFoundingDate.value)
          : null,
        guildLogo: updatedLogoUrl,
      }

      await dbGuildModule.doc(guildId.value as string).merge(updatedData)

      notifySuccess('ギルド情報が正常に更新されました。')
      router.push({
        name: 'RMGuildDetail',
        params: { guildId: guildId.value as string },
      })
    } catch (error) {
      notifyError('ギルド情報の更新に失敗しました。')
      console.error('Guild update failed:', error)
    }
  })
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
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack guild-edit-shell">
      <Card class="guild-edit-card">
        <template #content>
          <form
            class="rm-form-stack guild-edit-card__content"
            @submit.prevent="onSubmit"
          >
            <RMPageHeader
              title="ギルド情報編集"
              subtitle="公開情報と運用設定を更新"
              description="見た目に関わる項目と共有設定をまとめて編集できます。迷う項目は今の値を確認しながら一つずつ更新してください。"
              icon="pi pi-pencil"
            />

            <div class="rm-inline-note">
              ギルド名・説明・共有カレンダー
              ID・ロゴはあとから何度でも更新できます。
            </div>

            <RMInput
              v-model="guildName"
              label="ギルド名 *"
              hint="ギルドの名称を入力してください"
              autocomplete="organization"
              :outline="true"
            />

            <RMInput
              v-model="guildDescription"
              label="ギルド説明"
              type="textarea"
              hint="ギルドの説明を入力してください (任意)"
              :outline="true"
            />

            <RMInput
              v-model="guildGoogleCalendarId"
              label="共有 Google Calendar ID"
              hint="共有カレンダーを使う場合だけ入力します。未設定なら空欄のままで構いません"
              :outline="true"
            />

            <div>
              <div class="field-label">状況 *</div>
              <Dropdown
                v-model="guildSituation"
                :options="situationOptions"
                placeholder="状況を選択"
                class="guild-edit-card__dropdown"
              />
            </div>

            <RMInput
              v-model="guildFoundingDate"
              label="創設日"
              type="date"
              :date="true"
              hint="ギルドの創設日を選択してください"
              :outline="true"
            />

            <div class="guild-logo-section">
              <div class="field-label">ギルドロゴ</div>
              <p class="guild-logo-section__help">
                ロゴを変更すると、一覧や詳細画面の見分けがつきやすくなります。
              </p>
              <img
                v-if="logoPreviewUrl"
                :src="logoPreviewUrl"
                alt="ギルドロゴプレビュー"
                class="guild-logo-preview"
              />
              <FileUpload
                mode="basic"
                accept="image/*"
                chooseLabel="ギルドロゴ画像を選択"
                customUpload
                auto
                class="guild-logo-upload"
                @select="onLogoSelect"
              />
              <RMButton
                v-if="guildLogoUrl && !newGuildLogoFile"
                label="現在のロゴを削除"
                flat
                color="negative"
                icon="delete"
                @click="removeCurrentLogo"
              />
            </div>

            <div class="rm-actions">
              <RMButton
                label="キャンセル"
                flat
                color="grey"
                @click="onCancel"
              />
              <RMButton label="変更を保存" type="submit" color="primary" />
            </div>
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.guild-edit-shell {
  width: min(100%, 700px);
}

.guild-edit-card {
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
}

.guild-edit-card__content {
  padding: 22px 18px;
}

.field-label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.guild-edit-card__dropdown,
.guild-logo-upload {
  width: 100%;
}

.guild-logo-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guild-logo-section__help {
  margin: 0;
  color: var(--rm-text-soft);
  line-height: 1.6;
}

.guild-logo-preview {
  max-width: 220px;
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  border: 1px solid #d1d5db;
  border-radius: 18px;
  background: #f8fafc;
  padding: 10px;
}

@media (max-width: 600px) {
  .guild-edit-card__content {
    padding: 16px 14px;
  }
}
</style>
