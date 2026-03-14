<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleButton from 'primevue/togglebutton'
import Button from 'primevue/button'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { User, SkillRecord, ProficiencyLevel } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import { uploadFile, deleteFileByUrl } from '@rm/db/src/fireStorage/fireStorage'
import draggable from 'vuedraggable'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifyInfo, notifySuccess } from 'src/composables/useAppNotifications'

const route = useRoute()
const router = useRouter()

const userId = ref<string | null>(null)
const userDetail = ref<User | null>(null)
const skillRecord = ref<SkillRecord | null>(null)
const proficiencyLevel = ref<ProficiencyLevel | null>(null)
const isEditMode = ref(false)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const deletedImageUrls = ref<string[]>([])

const isCarouselVisible = ref(false)
const activeCarouselImages = ref<string[]>([])
const carouselSlide = ref(0)
const isWheeling = ref(false)
const touchStartX = ref<number | null>(null)

const currentCarouselImage = computed(
  () => activeCarouselImages.value[carouselSlide.value] ?? ''
)

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

const openImageCarousel = (images: string[], clickedIndex: number) => {
  activeCarouselImages.value = images
  carouselSlide.value = clickedIndex
  isCarouselVisible.value = true
}

const previousImage = () => {
  if (!activeCarouselImages.value.length) return
  carouselSlide.value =
    (carouselSlide.value - 1 + activeCarouselImages.value.length) %
    activeCarouselImages.value.length
}

const nextImage = () => {
  if (!activeCarouselImages.value.length) return
  carouselSlide.value =
    (carouselSlide.value + 1) % activeCarouselImages.value.length
}

const handleWheel = (event: WheelEvent) => {
  if (isWheeling.value || activeCarouselImages.value.length <= 1) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (Math.abs(delta) < 2) return
  event.preventDefault()
  if (delta > 0) nextImage()
  else previousImage()
  isWheeling.value = true
  setTimeout(() => {
    isWheeling.value = false
  }, 300)
}

const handleTouchStart = (event: TouchEvent) => {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

const handleTouchEnd = (event: TouchEvent) => {
  if (touchStartX.value === null) return
  const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.value
  if (Math.abs(delta) > 40) {
    if (delta < 0) nextImage()
    else previousImage()
  }
  touchStartX.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isCarouselVisible.value) return
  if (event.key === 'ArrowLeft') previousImage()
  if (event.key === 'ArrowRight') nextImage()
}

watch(isCarouselVisible, (visible) => {
  if (visible) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

const imageKey = (url: string) => url

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
      proficiencyLevel.value = JSON.parse(JSON.stringify(fetchedUser.proficiencyLevel))
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

const onSkillFilesSelect = async (
  weaponType: keyof SkillRecord,
  event: { files?: File[] }
) => {
  const files = event.files ?? []
  if (!files.length) return

  if (!userId.value) {
    notifyError('ユーザーIDがありません。')
    return
  }

  await useSpinner(async () => {
    try {
      const uploadPath = `skill_records/${userId.value}/${String(weaponType)}`
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadFile(file, uploadPath, file.name))
      )
      if (skillRecord.value) {
        skillRecord.value[weaponType].push(...uploadedUrls)
      }
      notifySuccess('アップロード成功')
    } catch (error) {
      notifyError('アップロードに失敗しました。')
      console.error(error)
    }
  })
}

const removeSkillImage = (weaponType: keyof SkillRecord, url: string) => {
  if (!skillRecord.value) return
  const index = skillRecord.value[weaponType].indexOf(url)
  if (index > -1) {
    skillRecord.value[weaponType].splice(index, 1)
    deletedImageUrls.value.push(url)
    notifyInfo('画像をリストから削除しました。保存ボタンを押すと確定します。')
  }
}

const sanitizeProficiencyLevel = () => {
  if (!proficiencyLevel.value) return
  for (const key of proficiencyKeys) {
    if (proficiencyLevel.value[key] === null || proficiencyLevel.value[key] === undefined) {
      proficiencyLevel.value[key] = 0
    }
  }
}

const onSubmit = async () => {
  sanitizeProficiencyLevel()
  if (!userId.value || !proficiencyLevel.value || !skillRecord.value) {
    notifyError('更新対象のデータがありません。')
    return
  }

  const currentUserId = userId.value
  const currentProficiencyLevel = proficiencyLevel.value
  const currentSkillRecord = skillRecord.value

  await useSpinner(async () => {
    try {
      const updatedData = {
        proficiencyLevel: currentProficiencyLevel,
        skillRecord: currentSkillRecord,
      }

      await dbUserModule.doc(currentUserId).merge(updatedData)

      if (deletedImageUrls.value.length > 0) {
        await Promise.all(deletedImageUrls.value.map((url) => deleteFileByUrl(url)))
        deletedImageUrls.value = []
      }

      notifySuccess('更新が完了しました。')
      isEditMode.value = false
    } catch (error) {
      notifyError('更新に失敗しました。')
      console.error('Update failed:', error)
    }
  })
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
  <div class="rm-page skill-post-page">
    <div v-if="isLoading" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">ユーザー情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="rm-state-card">
      <p class="rm-error">{{ errorMessage }}</p>
      <RMButton label="戻る" color="primary" @click="onCancel" />
    </div>

    <div v-else-if="userDetail && skillRecord && proficiencyLevel" class="skill-post-layout">
      <Card class="skill-post-card sticky-header">
        <template #content>
          <div class="skill-post-card__header">
            <div>
              <div class="skill-post-card__title">スキル・熟練度</div>
              <div class="skill-post-card__subtitle">{{ userDetail.charaName }}</div>
            </div>
            <ToggleButton
              v-model="isEditMode"
              onLabel="編集モード"
              offLabel="閲覧モード"
              onIcon="pi pi-pencil"
              offIcon="pi pi-eye"
            />
          </div>
        </template>
      </Card>

      <form class="skill-post-form" @submit.prevent="onSubmit">
        <Card class="skill-post-card">
          <template #content>
            <div class="skill-post-section">
              <div class="rm-section-title">熟練度レベル</div>
              <div class="proficiency-grid">
                <div v-for="key in proficiencyKeys" :key="key" class="proficiency-item">
                  <label class="proficiency-item__label">{{ skillTypeTranslations[key] || key }}</label>
                  <InputNumber
                    v-model="proficiencyLevel[key]"
                    :disabled="!isEditMode"
                    :min="0"
                    showButtons
                    class="proficiency-item__input"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>

        <Card class="skill-post-card">
          <template #content>
            <div class="skill-post-section">
              <div class="rm-section-title">スキルレコード</div>
              <div class="weapon-section" v-for="weapon in weaponTypes" :key="weapon">
                <div class="weapon-section__title">
                  {{ skillTypeTranslations[weapon] || weapon }}
                </div>

                <div v-if="!isEditMode">
                  <div v-if="skillRecord[weapon].length > 0" class="skill-image-grid">
                    <button
                      v-for="(url, index) in skillRecord[weapon]"
                      :key="`${weapon}-${index}`"
                      type="button"
                      class="skill-image-item"
                      @click="openImageCarousel(skillRecord[weapon], index)"
                    >
                      <img :src="url" alt="skill" class="skill-image-item__image" />
                    </button>
                  </div>
                  <div v-else class="rm-muted">登録されていません</div>
                </div>

                <div v-else>
                  <draggable
                    v-if="skillRecord[weapon].length > 0"
                    v-model="skillRecord[weapon]"
                    class="skill-image-grid skill-image-grid--editable"
                    :item-key="imageKey"
                    tag="div"
                  >
                    <template #item="{ element: url, index }">
                      <div class="skill-image-item skill-image-item--editable">
                        <img
                          :src="url"
                          alt="skill"
                          class="skill-image-item__image"
                          @click="openImageCarousel(skillRecord[weapon], index)"
                        />
                        <Button
                          icon="pi pi-times"
                          severity="danger"
                          rounded
                          size="small"
                          class="skill-image-item__remove"
                          @click="removeSkillImage(weapon, url)"
                        />
                      </div>
                    </template>
                  </draggable>
                  <div v-else class="rm-muted">登録されていません</div>

                  <FileUpload
                    mode="basic"
                    customUpload
                    auto
                    multiple
                    accept="image/*"
                    chooseLabel="画像を追加"
                    class="skill-upload"
                    @select="onSkillFilesSelect(weapon, $event)"
                  />
                </div>

                <Divider />
              </div>
            </div>
          </template>
        </Card>

        <div v-if="isEditMode" class="rm-actions skill-post-actions">
          <RMButton label="キャンセル" flat color="grey" @click="onCancel" />
          <RMButton label="保存" type="submit" color="primary" />
        </div>
      </form>
    </div>

    <Dialog
      v-model:visible="isCarouselVisible"
      modal
      header="画像プレビュー"
      :style="{ width: 'min(96vw, 900px)' }"
      :dismissableMask="true"
      class="skill-preview-dialog"
    >
      <div
        class="skill-preview-shell"
        @wheel="handleWheel"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <Button
          v-if="activeCarouselImages.length > 1"
          icon="pi pi-chevron-left"
          rounded
          text
          class="skill-preview-nav"
          @click="previousImage"
        />
        <div class="skill-preview-image-wrap">
          <img :src="currentCarouselImage" alt="preview" class="skill-preview-image" />
        </div>
        <Button
          v-if="activeCarouselImages.length > 1"
          icon="pi pi-chevron-right"
          rounded
          text
          class="skill-preview-nav"
          @click="nextImage"
        />
      </div>
      <div class="skill-preview-count">
        {{ activeCarouselImages.length ? carouselSlide + 1 : 0 }} / {{ activeCarouselImages.length }}
      </div>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.skill-post-layout {
  width: min(100%, 960px);
  margin: 0 auto;
}

.skill-post-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.skill-post-card {
  border-radius: 24px;
  overflow: hidden;
}

.skill-post-card__header,
.skill-post-section {
  padding: 24px;
}

.skill-post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.skill-post-card__title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
}

.skill-post-card__subtitle {
  margin-top: 6px;
  color: #64748b;
}

.sticky-header {
  position: sticky;
  top: 86px;
  z-index: 2;
}

.proficiency-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.proficiency-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proficiency-item__label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.proficiency-item__input {
  width: 100%;
}

.weapon-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.weapon-section__title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #334155;
}

.skill-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 12px;
}

.skill-image-grid--editable {
  align-items: start;
}

.skill-image-item {
  position: relative;
  border: none;
  padding: 0;
  background: transparent;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
}

.skill-image-item--editable {
  cursor: grab;
}

.skill-image-item__image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.skill-image-item__remove {
  position: absolute;
  top: 8px;
  right: 8px;
}

.skill-upload {
  margin-top: 4px;
}

.sortable-ghost {
  opacity: 0.5;
  background: #c8ebfb;
  border-radius: 20px;
}

.skill-post-actions {
  position: sticky;
  bottom: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
}

.skill-preview-shell {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.skill-preview-image-wrap {
  display: grid;
  place-items: center;
  min-height: 320px;
}

.skill-preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 16px;
}

.skill-preview-count {
  margin-top: 12px;
  text-align: center;
  color: #64748b;
}

@media (max-width: 767px) {
  .skill-post-card__header,
  .skill-post-section {
    padding: 18px;
  }

  .sticky-header {
    top: 78px;
  }

  .skill-preview-shell {
    grid-template-columns: 1fr;
  }

  .skill-preview-nav {
    justify-self: center;
  }
}
</style>
