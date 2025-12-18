<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, QCarousel } from 'quasar'

import { dbUserModule } from '@rm/db/src/fireStore/User'
import { User, SkillRecord, ProficiencyLevel } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import { uploadFile, deleteFileByUrl } from '@rm/db/src/fireStorage/fireStorage'
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const carouselRef = ref<QCarousel | null>(null)

const userId = ref<string | null>(null)
const userDetail = ref<User | null>(null)
const skillRecord = ref<SkillRecord | null>(null)
const proficiencyLevel = ref<ProficiencyLevel | null>(null)
const isEditMode = ref(false) // 編集モード
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const deletedImageUrls = ref<string[]>([]) // 削除対象の画像URLリスト

// --- Carousel State ---
const isCarouselVisible = ref(false)
const carouselInitialIndex = ref(0)
const activeCarouselImages = ref<string[]>([])
const carouselSlide = ref(0)
const isWheeling = ref(false)

const openImageCarousel = (images: string[], clickedIndex: number) => {
  activeCarouselImages.value = images
  carouselInitialIndex.value = clickedIndex
  carouselSlide.value = clickedIndex // v-model for QCarousel needs to be updated
  isCarouselVisible.value = true
}

const handleWheel = (e: WheelEvent) => {
  if (isWheeling.value) {
    return
  }
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault()
    if (carouselRef.value) {
      if (e.deltaX > 2) {
        carouselRef.value.next()
      } else if (e.deltaX < -2) {
        carouselRef.value.previous()
      }
      isWheeling.value = true
      setTimeout(() => {
        isWheeling.value = false
      }, 300) // 300ms cooldown to prevent rapid firing
    }
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (carouselRef.value) {
    if (e.key === 'ArrowLeft') {
      carouselRef.value.previous()
    } else if (e.key === 'ArrowRight') {
      carouselRef.value.next()
    }
  }
}

watch(isCarouselVisible, (isVisible) => {
  if (isVisible) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})



const skillTypeTranslations: Record<string, string> = {
  sword: '片手直剣',
  rapier: '細剣',
  club: '棍棒',
  dagger: '短剣',
  axe: '斧',
  spear: '槍',
  bow: '弓',
  shield: '盾',
  ability: 'アビリティ',
  abilityRecollection: 'アビリティ(覚醒)',
  abilityAccele: 'アビリティ(アクセル)',
  weaponRecollection: '武器(覚醒)',
  weaponMod: 'MOD',
  weaponConnect: 'コネクト',
  weaponAccele: 'アクセル',
  burst_FullBurst: 'バースト/フルバースト',
  free: 'フリー',
}

// テンプレートでのループ用 (型情報と同じ順序)
const weaponTypes: Array<keyof SkillRecord> = [
  'sword',
  'rapier',
  'club',
  'dagger',
  'axe',
  'spear',
  'bow',
  'shield',
  'ability',
  'abilityRecollection',
  'abilityAccele',
  'weaponRecollection',
  'weaponMod',
  'weaponConnect',
  'weaponAccele',
  'burst_FullBurst',
  'free',
]
const proficiencyKeys: Array<keyof ProficiencyLevel> = [
  'sword',
  'rapier',
  'club',
  'dagger',
  'axe',
  'spear',
  'bow',
  'shield',
]

// QUploaderのfactory関数
const uploaderFactory = (weaponType: keyof SkillRecord) => {
  return (files: readonly File[]) => {
    return new Promise<{ url: string }>((resolve) => {
      const file = files[0]
      if (!userId.value) {
        $q.notify({ type: 'negative', message: 'ユーザーIDがありません。' })
        // QUploaderに失敗を伝えるためにreject
        // reject('User ID not found');
        return
      }
      const uploadPath = `skill_records/${userId.value}/${String(weaponType)}`

      $q.loading.show({ message: `${file.name} をアップロード中...` })
      uploadFile(file, uploadPath, file.name)
        .then((url) => {
          $q.loading.hide()
          $q.notify({ type: 'positive', message: 'アップロード成功' })

          if (skillRecord.value) {
            skillRecord.value[weaponType].push(url)
          }
          // 成功を伝えるために、ダミーのURLでresolve
          resolve({ url: 'data:text/plain,' })
        })
        .catch((err) => {
          $q.loading.hide()
          $q.notify({
            type: 'negative',
            message: 'アップロードに失敗しました。',
          })
          console.error(err)
          // 失敗を伝えるために、ダミーのURLでresolveし、QUploader自体はエラーにしない
          resolve({ url: 'data:text/plain,' })
        })
    })
  }
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
      userDetail.value = fetchedUser as User
      skillRecord.value = JSON.parse(JSON.stringify(fetchedUser.skillRecord))
      proficiencyLevel.value = JSON.parse(
        JSON.stringify(fetchedUser.proficiencyLevel)
      )
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

// skillRecordから画像を削除する関数
const removeSkillImage = (weaponType: keyof SkillRecord, url: string) => {
  if (skillRecord.value) {
    const index = skillRecord.value[weaponType].indexOf(url)
    if (index > -1) {
      skillRecord.value[weaponType].splice(index, 1)
      deletedImageUrls.value.push(url) // 削除リストに追加
      $q.notify({
        type: 'info',
        message: '画像をリストから削除しました。保存ボタンを押すと確定します。',
      })
    }
  }
}

const sanitizeProficiencyLevel = () => {
  if (proficiencyLevel.value) {
    for (const key of proficiencyKeys) {
      if (
        proficiencyLevel.value[key] === null ||
        proficiencyLevel.value[key] === undefined
      ) {
        proficiencyLevel.value[key] = 0
      }
    }
  }
}

const onSubmit = async () => {
  sanitizeProficiencyLevel()
  if (!userId.value || !proficiencyLevel.value || !skillRecord.value) {
    $q.notify({ type: 'negative', message: '更新対象のデータがありません。' })
    return
  }

  $q.loading.show({ message: '情報を更新しています...' })

  try {
    // ここでの画像アップロードはfactoryで行われるため、onSubmitではデータの保存のみ
    const updatedData = {
      proficiencyLevel: proficiencyLevel.value,
      skillRecord: skillRecord.value,
    }

    await dbUserModule.doc(userId.value).merge(updatedData)

    // 削除対象の画像をFirebase Storageから削除
    if (deletedImageUrls.value.length > 0) {
      await Promise.all(
        deletedImageUrls.value.map((url) => deleteFileByUrl(url))
      )
      deletedImageUrls.value = [] // 削除リストをクリア
    }

    $q.notify({ type: 'positive', message: '更新が完了しました。' })
    isEditMode.value = false // 閲覧モードに戻る
  } catch (error) {
    $q.notify({ type: 'negative', message: '更新に失敗しました。' })
    console.error('Update failed:', error)
  } finally {
    $q.loading.hide()
  }
}

const onCancel = () => {
  if (route.params.guildId) {
    router.push({
      name: 'RMGuildDetail',
      params: { guildId: route.params.guildId as string },
    })
  } else {
    router.go(-1)
  }
}
</script>

<template>
  <q-page class="q-pa-md _skill_post_page">
    <div v-if="isLoading" class="text-center q-pt-xl">
      <q-spinner-hourglass color="primary" size="3em" />
      <p class="text-primary q-mt-md">ユーザー情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="text-center q-pt-xl text-negative">
      <p>{{ errorMessage }}</p>
      <RMButton
        label="戻る"
        color="primary"
        @click="onCancel"
        class="q-mt-md"
      />
    </div>

    <div v-else-if="userDetail && skillRecord && proficiencyLevel">
      <q-card class="_skill_post_card sticky-header">
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-h6">スキル・熟練度</div>
            <div class="text-subtitle1">{{ userDetail.charaName }}</div>
          </div>
          <q-toggle
            v-model="isEditMode"
            checked-icon="edit"
            unchecked-icon="visibility"
            label="編集モード"
            color="primary"
          />
        </q-card-section>
      </q-card>

      <q-form @submit.prevent="onSubmit">
        <!-- 熟練度レベル -->
        <q-card class="_skill_post_card q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-sm">熟練度レベル</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="row q-col-gutter-md">
              <div
                v-for="key in proficiencyKeys"
                :key="key"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-input
                  v-model.number="proficiencyLevel[key]"
                  :label="skillTypeTranslations[key] || key"
                  type="number"
                  :readonly="!isEditMode"
                  :outlined="isEditMode"
                  :filled="!isEditMode"
                  dense
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- スキルレコード -->
        <q-card class="_skill_post_card q-mt-md">
          <q-card-section>
            <div class="text-h6 q-mb-sm">スキルレコード</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="q-gutter-y-lg">
              <div v-for="weapon in weaponTypes" :key="weapon">
                <div class="text-subtitle1 q-mb-sm">
                  {{ skillTypeTranslations[weapon] || weapon }}
                </div>
                <!-- 閲覧モード -->
                <div v-if="!isEditMode">
                  <div
                    v-if="skillRecord[weapon].length > 0"
                    class="row q-col-gutter-sm"
                  >
                    <div
                      v-for="(url, index) in skillRecord[weapon]"
                      :key="index"
                      class="col-6 col-sm-4 col-md-3"
                    >
                      <q-img
                        :src="url"
                        ratio="1"
                        class="rounded-borders cursor-pointer"
                        @click="openImageCarousel(skillRecord[weapon], index)"
                      />
                    </div>
                  </div>
                  <div v-else class="text-grey">登録されていません</div>
                </div>
                <!-- 編集モード -->
                <div v-else>
                  <!-- 既存画像のプレビューと削除ボタン -->
                  <draggable
                    v-if="skillRecord[weapon].length > 0"
                    v-model="skillRecord[weapon]"
                    class="row q-col-gutter-sm q-mb-md"
                    item-key="url"
                    tag="div"
                  >
                    <template #item="{ element: url, index }">
                      <div class="col-6 col-sm-4 col-md-3">
                        <div class="relative-position draggable-item">
                          <q-img
                            :src="url"
                            ratio="1"
                            class="rounded-borders cursor-pointer"
                            @click="
                              openImageCarousel(skillRecord[weapon], index)
                            "
                          />
                          <q-btn
                            icon="close"
                            color="negative"
                            size="sm"
                            round
                            dense
                            class="absolute-top-right"
                            style="top: -8px; right: -8px"
                            @click="removeSkillImage(weapon, url)"
                          />
                        </div>
                      </div>
                    </template>
                  </draggable>
                  <!-- 新規アップロード -->
                  <q-uploader
                    label="画像を追加"
                    multiple
                    :factory="uploaderFactory(weapon)"
                    accept="image/*"
                    auto-upload
                    hide-upload-btn
                    style="width: 100%"
                  />
                </div>
                <q-separator class="q-mt-lg" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-footer v-if="isEditMode" elevated class="bg-white q-pa-sm">
          <q-toolbar class="justify-end">
            <RMButton
              label="キャンセル"
              flat
              color="grey"
              @click="onCancel"
              class="q-mr-sm"
            />
            <RMButton label="保存" type="submit" color="primary" />
          </q-toolbar>
        </q-footer>
      </q-form>
    </div>
  </q-page>

  <q-dialog v-model="isCarouselVisible" maximized>
    <q-card class="bg-black text-white">
      <q-header class="bg-primary">
        <q-toolbar>
          <q-toolbar-title> 画像プレビュー </q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
      </q-header>

      <q-card-section class="flex flex-center">
        <q-carousel
          ref="carouselRef"
          @wheel="handleWheel"
          v-model="carouselSlide"
          swipeable
          animated
          navigation
          arrows
          control-color="white"
          class="bg-transparent"
          style="width: 100%; max-width: 80vh; height: 80vh"
        >
          <q-carousel-slide
            v-for="(imgUrl, i) in activeCarouselImages"
            :key="i"
            :name="i"
            class="flex flex-center"
          >
            <q-img
              :src="imgUrl"
              fit="contain"
              style="max-width: 100%; max-height: 100%"
            />
          </q-carousel-slide>
        </q-carousel>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style lang="sass" scoped>
._skill_post_page
  background-color: #f0f2f5

.sticky-header
  position: sticky
  top: 50px // レイアウトのヘッダーの高さに合わせる
  z-index: 1 // ページ内の他の要素より手前に表示

._skill_post_card
  width: 100%
  max-width: 900px
  margin-left: auto
  margin-right: auto

.draggable-item
  cursor: move

.sortable-ghost
  opacity: 0.5
  background: #c8ebfb
</style>
