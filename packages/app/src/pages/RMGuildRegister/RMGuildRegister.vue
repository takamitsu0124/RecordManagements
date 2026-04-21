<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import { dbGuildModule, dbUsersModule, writeDocWithRandomId } from '@rm/db'
import { defaultGuild, Guild } from '@rm/types'
import { globalLoginUserData } from 'src/boot/main'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'

const router = useRouter()

const guildName = ref('')
const guildDescription = ref('')

const onSubmit = async () => {
  if (!guildName.value.trim()) {
    notifyError('ギルド名を入力してください。')
    return
  }

  await useSpinner(async () => {
    try {
      const creatorId = globalLoginUserData.value.id
      const newGuild: Guild = {
        ...defaultGuild(),
        guildName: guildName.value,
        guildMemo: guildDescription.value,
        situation: '存続',
        officialMembers: 1,
        guildMember: {
          [creatorId]: {
            name: globalLoginUserData.value.displayName || '',
          },
        },
      }

      const createdGuild = await writeDocWithRandomId(dbGuildModule, newGuild)

      if (createdGuild?.id && creatorId) {
        if (globalLoginUserData.value.role !== 'admin') {
          await dbUsersModule.doc(creatorId).merge({
            guildId: createdGuild.id,
            role: 'guild_admin',
          })

          globalLoginUserData.value = {
            ...globalLoginUserData.value,
            guildId: createdGuild.id,
            role: 'guild_admin',
          }
        }

        notifySuccess('ギルドが正常に登録されました。')
        router.push({
          name: 'RMGuildDetail',
          params: { guildId: createdGuild.id },
        })
        return
      }

      notifySuccess('ギルドが正常に登録されました。')
      router.push({ name: 'RMHome' })
    } catch (error) {
      notifyError('ギルドの登録に失敗しました。')
      console.error('Guild registration failed:', error)
    }
  })
}

const onCancel = () => {
  router.push('/')
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack guild-register-shell">
      <Card class="guild-register-card">
        <template #content>
          <form
            class="rm-form-stack guild-register-card__content"
            @submit.prevent="onSubmit"
          >
            <RMPageHeader
              title="ギルド登録"
              subtitle="最初に必要な情報だけ入力"
              description="まずはギルド名があれば作成できます。説明はあとから編集できるので、迷う項目は空欄のままでも問題ありません。"
              icon="pi pi-building"
            />

            <div class="rm-inline-note">
              登録直後は、作成者がギルド管理者として設定されます。
            </div>

            <RMInput
              v-model="guildName"
              label="ギルド名 *"
              hint="ギルドの名称を入力してください"
              autocomplete="organization"
              shadow
            />

            <RMInput
              v-model="guildDescription"
              label="ギルド説明"
              type="textarea"
              hint="ギルドの説明を入力してください (任意)"
              shadow
            />

            <div class="rm-actions">
              <RMButton
                label="キャンセル"
                flat
                color="grey"
                @click="onCancel"
              />
              <RMButton label="ギルドを作成" type="submit" color="primary" />
            </div>
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.guild-register-shell {
  width: min(100%, 640px);
}

.guild-register-card {
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
}

.guild-register-card__content {
  padding: 22px 18px;
}

@media (max-width: 600px) {
  .guild-register-card__content {
    padding: 16px 14px;
  }
}
</style>
