<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { User, defaultUser } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const userId = ref<string | null>(null)
// Use defaultUser to initialize to prevent template errors before data is loaded
const user = ref<User>(defaultUser())

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const situationOptions = ['現役', '隠居', '引退', '']

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
      // Create a copy to avoid mutating the original object from the store
      // This handles nested objects and preserves Date objects
      const userCopy = {
        ...fetchedUser,
        contact: { ...fetchedUser.contact },
        skillRecord: JSON.parse(JSON.stringify(fetchedUser.skillRecord)),
        proficiencyLevel: JSON.parse(JSON.stringify(fetchedUser.proficiencyLevel)),
      }
      user.value = userCopy
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

  $q.loading.show({ message: 'ユーザー情報を更新しています...' })

  try {
    // Ensure date values are correctly formatted as Date objects for Firestore
    const updatedData: Partial<User> = {
      charaName: user.value.charaName,
      charaNameKana: user.value.charaNameKana,
      guildId: user.value.guildId,
      affiliationDate: user.value.affiliationDate
        ? new Date(user.value.affiliationDate)
        : null,
      affiliationNum: Number(user.value.affiliationNum),
      situation: user.value.situation,
      gameStartDateAt: user.value.gameStartDateAt
        ? new Date(user.value.gameStartDateAt)
        : null,
      contact: {
        email: user.value.contact.email,
        phone: user.value.contact.phone,
      },
      birthDateAt: user.value.birthDateAt
        ? new Date(user.value.birthDateAt)
        : null,
    }

    await dbUserModule.doc(userId.value).merge(updatedData)
    $q.notify({ type: 'positive', message: '更新が完了しました。' })
    router.back()
  } catch (error) {
    $q.notify({ type: 'negative', message: '更新に失敗しました。' })
    console.error('Update failed:', error)
  } finally {
    $q.loading.hide()
  }
}

const onCancel = () => {
  router.back()
}
</script>

<template>
  <q-page class="q-pa-md user-edit-page">
    <div v-if="isLoading" class="text-center q-pt-xl">
      <q-spinner-hourglass color="primary" size="3em" />
      <p class="text-primary q-mt-md">ユーザー情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="text-center q-pt-xl text-negative">
      <p>{{ errorMessage }}</p>
      <RMButton label="戻る" color="primary" @click="onCancel" class="q-mt-md" />
    </div>

    <div v-else-if="user" class="row justify-center">
      <q-form @submit.prevent="onSubmit" class="col-12" style="max-width: 800px">
        <q-card>
          <q-card-section>
            <div class="text-h6">ユーザー情報編集</div>
          </q-card-section>

          <q-card-section class="q-gutter-y-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="user.charaName"
                  label="キャラクターネーム"
                  outlined
                  dense
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="user.charaNameKana"
                  label="キャラクターネーム(カナ)"
                  outlined
                  dense
                />
              </div>
            </div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="user.guildId" label="所属ギルドID" outlined dense />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="user.affiliationNum"
                  label="所属No"
                  type="number"
                  outlined
                  dense
                />
              </div>
            </div>

            <q-select
              v-model="user.situation"
              :options="situationOptions"
              label="プレイヤー状況"
              outlined
              dense
            />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <q-input
                  filled
                  dense
                  v-model="user.affiliationDate"
                  mask="date"
                  label="ギルド所属日"
                >
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy
                        cover
                        transition-show="scale"
                        transition-hide="scale"
                      >
                        <q-date v-model="user.affiliationDate">
                          <div class="row items-center justify-end">
                            <q-btn
                              v-close-popup
                              label="Close"
                              color="primary"
                              flat
                            />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  filled
                  dense
                  v-model="user.gameStartDateAt"
                  mask="date"
                  label="ゲーム開始日時"
                >
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy
                        cover
                        transition-show="scale"
                        transition-hide="scale"
                      >
                        <q-date v-model="user.gameStartDateAt">
                          <div class="row items-center justify-end">
                            <q-btn
                              v-close-popup
                              label="Close"
                              color="primary"
                              flat
                            />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-4">
                <q-input
                  filled
                  dense
                  v-model="user.birthDateAt"
                  mask="date"
                  label="誕生日"
                >
                  <template v-slot:append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy
                        cover
                        transition-show="scale"
                        transition-hide="scale"
                      >
                        <q-date v-model="user.birthDateAt">
                          <div class="row items-center justify-end">
                            <q-btn
                              v-close-popup
                              label="Close"
                              color="primary"
                              flat
                            />
                          </div>
                        </q-date>
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>

            <q-separator class="q-mt-lg q-mb-md" />
            <div class="text-subtitle1">連絡先</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="user.contact.email"
                  label="登録メールアドレス"
                  type="email"
                  outlined
                  dense
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="user.contact.phone"
                  label="登録電話番号"
                  type="tel"
                  outlined
                  dense
                />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <RMButton label="キャンセル" color="grey" flat @click="onCancel" />
            <RMButton label="保存" type="submit" color="primary" />
          </q-card-actions>
        </q-card>
      </q-form>
    </div>
  </q-page>
</template>

<style lang="scss" scoped>
.user-edit-page {
  background-color: #f0f2f5;
}
</style>

