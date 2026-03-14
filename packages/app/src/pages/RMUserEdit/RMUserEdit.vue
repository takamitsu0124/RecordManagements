<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { User, defaultUser } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'

const route = useRoute()
const router = useRouter()

const userId = ref<string | null>(null)
const user = ref<User>(defaultUser())
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const situationOptions = ['現役', '隠居', '引退', '']

const affiliationDateStr = ref<string | null>(null)
const gameStartDateAtStr = ref<string | null>(null)
const birthDateAtStr = ref<string | null>(null)

const dateToModel = (d: Date | null): string | null => {
  if (!d) return null
  const date = new Date(d)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}/${month}/${day}`
}

onMounted(async () => {
  userId.value = route.params.userId as string
  if (!userId.value) {
    errorMessage.value = 'ユーザーIDが指定されていません。'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    await dbUserModule.doc(userId.value).fetch()
    const fetchedUser = dbUserModule.doc(userId.value).data
    if (fetchedUser) {
      const userCopy = {
        ...fetchedUser,
        contact: { ...fetchedUser.contact },
        skillRecord: JSON.parse(JSON.stringify(fetchedUser.skillRecord)),
        proficiencyLevel: JSON.parse(JSON.stringify(fetchedUser.proficiencyLevel)),
      }
      user.value = userCopy

      affiliationDateStr.value = dateToModel(user.value.affiliationDate)
      gameStartDateAtStr.value = dateToModel(user.value.gameStartDateAt)
      birthDateAtStr.value = dateToModel(user.value.birthDateAt)
    } else {
      errorMessage.value = '指定されたユーザーが見つかりませんでした。'
    }
  } catch (error) {
    errorMessage.value = 'ユーザー情報の取得中にエラーが発生しました。'
    console.error('Error fetching user detail:', error)
  } finally {
    isLoading.value = false
  }
})

const onSubmit = async () => {
  if (!userId.value) return

  await useSpinner(async () => {
    try {
      const updatedData: Partial<User> = {
        charaName: user.value.charaName,
        charaNameKana: user.value.charaNameKana,
        guildId: user.value.guildId,
        affiliationDate: affiliationDateStr.value ? new Date(affiliationDateStr.value) : null,
        affiliationNum: Number(user.value.affiliationNum),
        situation: user.value.situation,
        gameStartDateAt: gameStartDateAtStr.value ? new Date(gameStartDateAtStr.value) : null,
        contact: {
          email: user.value.contact.email,
          phone: user.value.contact.phone,
        },
        birthDateAt: birthDateAtStr.value ? new Date(birthDateAtStr.value) : null,
      }

      await dbUserModule.doc(userId.value).merge(updatedData)
      notifySuccess('更新が完了しました。')
      router.back()
    } catch (error) {
      notifyError('更新に失敗しました。')
      console.error('Update failed:', error)
    }
  })
}

const onCancel = () => {
  router.back()
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div v-if="isLoading" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">ユーザー情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="rm-state-card">
      <p class="rm-error">{{ errorMessage }}</p>
      <RMButton label="戻る" color="primary" @click="onCancel" />
    </div>

    <form v-else class="user-edit-form" @submit.prevent="onSubmit">
      <Card class="user-edit-card">
        <template #content>
          <div class="user-edit-card__content">
            <div class="user-edit-card__hero">
              <div>
                <div class="user-edit-card__title">ユーザー情報編集</div>
                <div v-if="user.charaName" class="user-edit-card__subtitle">
                  {{ user.charaName }}
                </div>
              </div>
            </div>

            <Divider />

            <section>
              <div class="rm-section-title">基本情報</div>
              <div class="rm-form-grid rm-form-grid--two">
                <RMInput v-model="user.charaName" label="キャラクターネーム" shadow />
                <RMInput v-model="user.charaNameKana" label="キャラクターネーム(カナ)" shadow />
                <RMInput v-model="user.guildId" label="所属ギルドID" shadow />
                <RMInput v-model="user.affiliationNum" label="所属No" type="number" shadow />
              </div>
              <div class="user-edit-form__field">
                <div class="user-edit-form__label">プレイヤー状況</div>
                <Dropdown v-model="user.situation" :options="situationOptions" placeholder="状況を選択" class="user-edit-form__dropdown" />
              </div>
            </section>

            <Divider />

            <section>
              <div class="rm-section-title">日付情報</div>
              <div class="rm-form-grid rm-form-grid--three">
                <RMInput v-model="affiliationDateStr" label="ギルド所属日" type="date" :date="true" shadow />
                <RMInput v-model="gameStartDateAtStr" label="ゲーム開始日時" type="date" :date="true" shadow />
                <RMInput v-model="birthDateAtStr" label="誕生日" type="date" :date="true" shadow />
              </div>
            </section>

            <Divider />

            <section>
              <div class="rm-section-title">連絡先</div>
              <div class="rm-form-grid rm-form-grid--two">
                <RMInput v-model="user.contact.email" label="登録メールアドレス" type="email" shadow />
                <RMInput v-model="user.contact.phone" label="登録電話番号" type="tel" shadow />
              </div>
            </section>

            <div class="rm-actions user-edit-card__actions">
              <RMButton label="キャンセル" color="grey-7" outline @click="onCancel" width="160px" />
              <RMButton label="保存" type="submit" color="primary" width="160px" />
            </div>
          </div>
        </template>
      </Card>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.user-edit-form {
  width: min(100%, 860px);
}

.user-edit-card {
  border-radius: 24px;
  overflow: hidden;
}

.user-edit-card__content {
  padding: 28px;
}

.user-edit-card__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.user-edit-card__title {
  font-size: clamp(1.75rem, 4vw, 2.2rem);
  font-weight: 800;
  color: #1f2937;
}

.user-edit-card__subtitle {
  margin-top: 6px;
  color: #64748b;
}

.user-edit-form__field {
  margin-top: 18px;
}

.user-edit-form__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.user-edit-form__dropdown {
  width: 100%;
}

.user-edit-card__actions {
  margin-top: 28px;
}

@media (max-width: 767px) {
  .user-edit-card__content {
    padding: 20px;
  }
}
</style>
