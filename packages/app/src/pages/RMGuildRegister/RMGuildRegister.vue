<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { dbUsersModule, writeDocWithRandomId } from '@rm/db'
import { defaultGuild, Guild } from '@rm/types'
import { getSyncUserDocumentsErrorDetails, syncUserDocuments } from '@rm/utils'
import { globalLoginUserData } from 'src/boot/main'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
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

      notifySuccess('ギルドが正常に登録されました。')

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
      const syncErrorDetails = getSyncUserDocumentsErrorDetails(error)
      notifyError(
        syncErrorDetails
          ? 'ギルド作成後の users / user 同期に失敗しました。'
          : 'ギルドの登録に失敗しました。'
      )
      console.error('Guild registration failed:', syncErrorDetails || error)
    }
  })
}

const onCancel = () => {
  router.push('/')
}
</script>

<template>
  <div class="rm-page rm-page--center">
    <Card class="guild-register-card">
      <template #content>
        <form
          class="rm-form-stack guild-register-card__content"
          @submit.prevent="onSubmit"
        >
          <div class="guild-register-card__title">ギルド登録</div>

          <RMInput
            v-model="guildName"
            label="ギルド名 *"
            hint="ギルドの名称を入力してください"
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
            <RMButton label="キャンセル" flat color="grey" @click="onCancel" />
            <RMButton label="登録" type="submit" color="primary" />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.guild-register-card {
  width: min(100%, 560px);
  border-radius: 24px;
  overflow: hidden;
}

.guild-register-card__content {
  padding: 22px 18px;
}

.guild-register-card__title {
  margin-bottom: 4px;
  text-align: center;
  font-size: clamp(1.8rem, 4vw, 2.2rem);
  font-weight: 800;
  color: #1f2937;
}

@media (max-width: 600px) {
  .guild-register-card__content {
    padding: 16px 14px;
  }
}
</style>
