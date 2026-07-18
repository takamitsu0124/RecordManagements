<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import {
  dbGuildModule,
  deleteFileByUrl,
  GUILD_LOGO_IMAGE_RESIZE_OPTIONS,
  uploadFile
} from '@rm/db'
import type { Guild } from '@rm/types'
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
    void notifyError('編集対象のギルドIDが指定されていません。')
    void router.push('/')
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
      } else {
        void notifyError('指定されたギルドが見つかりませんでした。')
        void router.push('/')
      }
    } catch (error) {
      void notifyError('ギルド情報の取得中にエラーが発生しました。')
      console.error('Error fetching guild for edit:', error)
      void router.push('/')
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
      void notifySuccess('ギルドロゴを削除しました。')
    } catch (error) {
      void notifyError('ギルドロゴの削除に失敗しました。')
      console.error('Error deleting guild logo:', error)
    }
  })
}

const onSubmit = async () => {
  if (!guildName.value.trim()) {
    void notifyError('ギルド名を入力してください。')
    return
  }

  await useSpinner(async () => {
    try {
      if (!guildId.value) {
        throw new Error('ギルドIDがありません。')
      }

      let updatedLogoUrl = guildLogoUrl.value
      if (newGuildLogoFile.value) {
        const guildIdValue = Array.isArray(guildId.value)
          ? guildId.value[0] ?? ''
          : guildId.value
        const uploadDirPath = `guild_logos/${guildIdValue}`
        updatedLogoUrl = await uploadFile(
          newGuildLogoFile.value,
          uploadDirPath,
          newGuildLogoFile.value.name,
          GUILD_LOGO_IMAGE_RESIZE_OPTIONS
        )
      }

      const updatedData: Partial<Guild> = {
        guildName: guildName.value,
        guildMemo: guildDescription.value,
        situation: guildSituation.value,
        guildFoundingDateAt: guildFoundingDate.value
          ? new Date(guildFoundingDate.value)
          : null,
        guildLogo: updatedLogoUrl
      }

      await dbGuildModule.doc(guildId.value as string).merge(updatedData)

      void notifySuccess('ギルド情報が正常に更新されました。')
      void router.push({
        name: 'RMGuildDetail',
        params: { guildId: guildId.value }
      })
    } catch (error) {
      void notifyError('ギルド情報の更新に失敗しました。')
      console.error('Guild update failed:', error)
    }
  })
}

const onCancel = () => {
  if (guildId.value) {
    void router.push({
      name: 'RMGuildDetail',
      params: { guildId: guildId.value }
    })
  } else {
    void router.push('/')
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
              icon="pi pi-pencil"
            />

            <RMInput
              v-model="guildName"
              label="ギルド名 *"
              autocomplete="organization"
              :outline="true"
            />

            <RMInput
              v-model="guildDescription"
              label="ギルド説明 (任意)"
              type="textarea"
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
              :outline="true"
            />

            <div class="guild-logo-section">
              <div class="field-label">ギルドロゴ</div>
              <p class="guild-logo-section__help">
                一覧や詳細画面で表示されます。
              </p>
              <!-- img-lazy-loading:allow -->
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
