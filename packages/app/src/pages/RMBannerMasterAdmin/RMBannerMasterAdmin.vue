<script lang="ts" setup>
import { genFirebaseRandomId } from '@codelic/datagen'
import { dbBannerMasterModule, uploadFile } from '@rm/db'
import { BannerMaster, defaultBannerMaster } from '@rm/types'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import DatePicker from 'primevue/datepicker'
import Drawer from 'primevue/drawer'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import {
  createBannerUploadFileName,
  formatBannerDateRange,
  isBannerVisibleOnDate,
  normalizeBannerMasterRecord,
  normalizeEndOfDay,
  normalizeStartOfDay,
} from 'src/helpers/bannerMaster'

type BannerStatusFilter = 'all' | 'active' | 'inactive'

type SelectOption<T extends string = string> = {
  label: string
  value: T
}

const statusOptions: SelectOption<BannerStatusFilter>[] = [
  { label: '全て', value: 'all' },
  { label: '表示', value: 'active' },
  { label: '非表示', value: 'inactive' },
]

const createNewBannerForm = (): BannerMaster => ({
  ...defaultBannerMaster(),
  id: genFirebaseRandomId(),
})

const bannerList = ref<BannerMaster[]>([])
const isLoading = ref(true)
const isEditorVisible = ref(false)
const isEditMode = ref(false)
const form = ref<BannerMaster>(createNewBannerForm())
const selectedImageFile = ref<File | null>(null)
const selectedImagePreviewUrl = ref('')
const imageUploadKey = ref(0)
const errorMessage = ref('')
const selectedStatus = ref<BannerStatusFilter>('all')
const filterDate = ref<Date | null>(null)

const isEditingExisting = computed(() => isEditMode.value)
const editorTitle = computed(() =>
  isEditingExisting.value ? 'バナーマスターを編集' : 'バナーマスターを新規登録'
)
const editorDescription = computed(() =>
  isEditingExisting.value
    ? '既存バナーの公開状態、掲載期間、画像を Drawer から更新できます。'
    : 'ギルドダッシュボードに表示するバナーを Drawer から登録できます。'
)
const filteredBannerList = computed(() => {
  return bannerList.value.filter((banner) => {
    if (selectedStatus.value === 'active' && !banner.isActive) return false
    if (selectedStatus.value === 'inactive' && banner.isActive) return false
    if (filterDate.value && !isBannerVisibleOnDate(banner, filterDate.value)) {
      return false
    }
    return true
  })
})
const bannerCountLabel = computed(
  () => `${filteredBannerList.value.length} / ${bannerList.value.length} 件`
)
const activeFilterCount = computed(
  () =>
    [selectedStatus.value !== 'all', filterDate.value !== null].filter(Boolean)
      .length
)
const hasActiveFilters = computed(() => activeFilterCount.value > 0)
const previewImageUrl = computed(
  () => selectedImagePreviewUrl.value || form.value.imageUrl
)

const cleanupSelectedImagePreview = () => {
  if (selectedImagePreviewUrl.value) {
    URL.revokeObjectURL(selectedImagePreviewUrl.value)
  }
  selectedImagePreviewUrl.value = ''
}

const resetForm = () => {
  cleanupSelectedImagePreview()
  form.value = createNewBannerForm()
  selectedImageFile.value = null
  imageUploadKey.value += 1
  isEditMode.value = false
  errorMessage.value = ''
}

const closeEditor = () => {
  isEditorVisible.value = false
  resetForm()
}

const onEditorVisibleChange = (visible: boolean) => {
  isEditorVisible.value = visible
  if (!visible) {
    resetForm()
  }
}

const resetFilters = () => {
  selectedStatus.value = 'all'
  filterDate.value = null
}

const loadBanners = async () => {
  try {
    isLoading.value = true
    await dbBannerMasterModule.fetch()
    bannerList.value = Array.from(dbBannerMasterModule.data.values())
      .map((banner) => normalizeBannerMasterRecord(banner))
      .sort((a, b) => {
        const aStart = a.startAt?.getTime() ?? 0
        const bStart = b.startAt?.getTime() ?? 0
        return bStart - aStart || a.id.localeCompare(b.id, 'ja')
      })
  } catch (error) {
    notifyError('バナーマスターの読み込みに失敗しました。')
    console.error('Failed to fetch banner master:', error)
  } finally {
    isLoading.value = false
  }
}

const startCreate = () => {
  resetForm()
  isEditorVisible.value = true
}

const startEdit = (banner: BannerMaster) => {
  cleanupSelectedImagePreview()
  form.value = {
    ...defaultBannerMaster(),
    ...banner,
  }
  selectedImageFile.value = null
  imageUploadKey.value += 1
  isEditMode.value = true
  errorMessage.value = ''
  isEditorVisible.value = true
}

const onBannerImageSelect = (event: { files?: File[] }) => {
  const file = event.files?.[0]
  if (!file) return

  cleanupSelectedImagePreview()
  selectedImageFile.value = file
  selectedImagePreviewUrl.value = URL.createObjectURL(file)
  imageUploadKey.value += 1
}

const validateForm = () => {
  const nextId = form.value.id.trim()

  if (!nextId) {
    return 'ID は必須です。'
  }

  if (
    !isEditMode.value &&
    bannerList.value.some((banner) => banner.id === nextId)
  ) {
    return '同じ ID のバナーが既に存在します。'
  }

  if (!isEditMode.value && !selectedImageFile.value) {
    return '新規登録時はバナー画像が必須です。'
  }

  if (!selectedImageFile.value && !form.value.imageUrl) {
    return 'バナー画像が登録されていません。'
  }

  const startAt = normalizeStartOfDay(form.value.startAt)
  const endAt = normalizeEndOfDay(form.value.endAt)

  if (startAt && endAt && startAt > endAt) {
    return '開始日は終了日以前の日付を指定してください。'
  }

  return ''
}

const saveBannerMaster = async () => {
  errorMessage.value = validateForm()
  if (errorMessage.value) {
    notifyError(errorMessage.value)
    return
  }

  await useSpinner(async () => {
    try {
      const bannerId = form.value.id.trim()
      let imageUrl = form.value.imageUrl.trim()

      if (selectedImageFile.value) {
        imageUrl = await uploadFile(
          selectedImageFile.value,
          `banner_master/${bannerId}`,
          createBannerUploadFileName(selectedImageFile.value)
        )
      }

      const payload: BannerMaster = {
        ...defaultBannerMaster(),
        ...form.value,
        id: bannerId,
        isActive: Boolean(form.value.isActive),
        startAt: normalizeStartOfDay(form.value.startAt),
        endAt: normalizeEndOfDay(form.value.endAt),
        imageUrl,
      }

      if (isEditMode.value) {
        await dbBannerMasterModule.doc(payload.id).merge(payload)
        notifySuccess('バナーマスターを更新しました。')
      } else {
        await dbBannerMasterModule.doc(payload.id).insert(payload)
        notifySuccess('バナーマスターを登録しました。')
      }

      await loadBanners()
      closeEditor()
    } catch (error) {
      notifyError('バナーマスターの保存に失敗しました。')
      console.error('Failed to save banner master:', error)
    }
  })
}

onMounted(async () => {
  await loadBanners()
})

onBeforeUnmount(() => {
  cleanupSelectedImagePreview()
})
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="banner-master-admin-page">
      <Card class="banner-master-admin-card">
        <template #content>
          <div class="banner-master-admin-card__content">
            <RMPageHeader
              title="バナーマスター管理"
              :subtitle="bannerCountLabel"
              description="ギルドダッシュボードに表示するバナーを管理します。画像は Storage にアップロードし、URL を banner_master に保存します。"
              icon="pi pi-images"
            >
              <template #actions>
                <div class="banner-master-admin-header-actions">
                  <Tag
                    v-if="hasActiveFilters"
                    :value="`絞り込み ${activeFilterCount}件`"
                    severity="info"
                  />
                  <Button
                    v-if="hasActiveFilters"
                    label="絞り込みをクリア"
                    severity="secondary"
                    text
                    @click="resetFilters"
                  />
                  <Button
                    label="新規登録"
                    severity="contrast"
                    @click="startCreate"
                  />
                </div>
              </template>
            </RMPageHeader>

            <div class="rm-inline-note">
              公開状態と掲載期間で絞り込みながら一覧確認できます。画像は保存時に
              Firebase Storage へアップロードされます。
            </div>

            <div class="banner-master-admin-filter-row rm-filter-toolbar">
              <Dropdown
                v-model="selectedStatus"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="ステータス"
              />
              <DatePicker
                v-model="filterDate"
                showIcon
                iconDisplay="input"
                dateFormat="yy/mm/dd"
                showButtonBar
                placeholder="表示対象日"
                inputClass="w-full"
              />
              <Button
                label="絞り込みをクリア"
                severity="secondary"
                outlined
                :disabled="!hasActiveFilters"
                @click="resetFilters"
              />
            </div>

            <div v-if="isLoading" class="banner-master-admin-loading">
              <ProgressSpinner strokeWidth="5" />
              <p class="rm-muted">バナーマスターを読み込み中...</p>
            </div>

            <DataTable
              v-else
              :value="filteredBannerList"
              paginator
              :rows="12"
              stripedRows
              responsiveLayout="scroll"
              class="banner-master-admin-table"
            >
              <template #empty>
                <RMEmptyState
                  icon="pi pi-image"
                  title="条件に一致するバナーがありません"
                  message="ステータスや表示対象日を変更すると、一覧をすぐに再確認できます。"
                />
              </template>

              <Column header="バナー" style="min-width: 320px">
                <template #body="{ data }">
                  <div class="banner-master-admin-banner-cell">
                    <img
                      v-if="data.imageUrl"
                      :src="data.imageUrl"
                      :alt="data.id"
                      loading="lazy"
                      class="banner-master-admin-banner-cell__image"
                    />
                    <div
                      v-else
                      class="banner-master-admin-banner-cell__image banner-master-admin-banner-cell__image--placeholder"
                    >
                      No image
                    </div>
                  </div>
                </template>
              </Column>

              <Column field="id" header="ID" style="min-width: 220px" />

              <Column header="ステータス" style="width: 140px">
                <template #body="{ data }">
                  <Tag
                    :value="data.isActive ? '表示' : '非表示'"
                    :severity="data.isActive ? 'success' : 'secondary'"
                  />
                </template>
              </Column>

              <Column header="掲載期間" style="min-width: 220px">
                <template #body="{ data }">
                  {{ formatBannerDateRange(data) }}
                </template>
              </Column>

              <Column header="操作" style="width: 120px">
                <template #body="{ data }">
                  <Button
                    label="編集"
                    severity="contrast"
                    outlined
                    @click="startEdit(data)"
                  />
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>

      <Drawer
        :visible="isEditorVisible"
        position="right"
        :style="{ width: 'min(96vw, 44rem)' }"
        class="banner-master-admin-drawer"
        @update:visible="onEditorVisibleChange"
      >
        <template #header>
          <div class="banner-master-admin-drawer__header">
            <div>
              <div class="banner-master-admin-drawer__title">
                {{ editorTitle }}
              </div>
              <div class="banner-master-admin-drawer__description">
                {{ editorDescription }}
              </div>
            </div>
            <Tag
              :value="isEditingExisting ? '更新モード' : '新規モード'"
              :severity="isEditingExisting ? 'warn' : 'success'"
            />
          </div>
        </template>

        <div class="banner-master-admin-drawer__content">
          <div class="banner-master-admin-form">
            <div class="banner-master-admin-field">
              <label class="banner-master-admin-label">ID *</label>
              <InputText
                v-model="form.id"
                disabled
                placeholder="新規登録時に自動生成されます"
              />
              <div class="banner-master-admin-help">
                ID は自動採番され、編集時も変更できません。
              </div>
            </div>

            <div class="banner-master-admin-field">
              <label class="banner-master-admin-label">公開状態</label>
              <label class="banner-master-admin-checkbox">
                <Checkbox
                  v-model="form.isActive"
                  binary
                  inputId="banner-active"
                />
                <span>ギルドダッシュボードに表示する</span>
              </label>
            </div>

            <div class="banner-master-admin-grid">
              <div class="banner-master-admin-field">
                <label class="banner-master-admin-label">表示開始日</label>
                <DatePicker
                  v-model="form.startAt"
                  showIcon
                  iconDisplay="input"
                  dateFormat="yy/mm/dd"
                  showButtonBar
                  inputClass="w-full"
                  placeholder="開始制限なし"
                />
              </div>

              <div class="banner-master-admin-field">
                <label class="banner-master-admin-label">表示終了日</label>
                <DatePicker
                  v-model="form.endAt"
                  showIcon
                  iconDisplay="input"
                  dateFormat="yy/mm/dd"
                  showButtonBar
                  inputClass="w-full"
                  placeholder="終了制限なし"
                />
              </div>
            </div>

            <div class="banner-master-admin-field">
              <label class="banner-master-admin-label">バナー画像 *</label>
              <FileUpload
                :key="imageUploadKey"
                mode="basic"
                accept="image/*"
                chooseLabel="画像を選択"
                class="banner-master-admin-upload"
                @select="onBannerImageSelect"
              />
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                alt="banner preview"
                class="banner-master-admin-preview-image"
              />
              <div
                v-else
                class="banner-master-admin-preview-image banner-master-admin-preview-image--placeholder"
              >
                画像を選択するとここにプレビューを表示します
              </div>
            </div>
          </div>

          <p v-if="errorMessage" class="banner-master-admin-error">
            {{ errorMessage }}
          </p>

          <div class="rm-actions banner-master-admin-drawer__actions">
            <RMButton label="閉じる" flat color="grey" @click="closeEditor" />
            <RMButton
              label="入力をクリア"
              flat
              color="grey"
              @click="resetForm"
            />
            <RMButton
              :label="isEditingExisting ? '更新する' : '登録する'"
              color="primary"
              @click="saveBannerMaster"
            />
          </div>
        </div>
      </Drawer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.banner-master-admin-page {
  width: min(100%, 1440px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-master-admin-card {
  border-radius: 24px;
  overflow: hidden;
}

.banner-master-admin-card__content {
  padding: clamp(16px, 2vw, 20px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-master-admin-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.banner-master-admin-filter-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.banner-master-admin-loading {
  min-height: 240px;
  display: grid;
  place-items: center;
  gap: 12px;
}

.banner-master-admin-banner-cell {
  display: flex;
  align-items: center;
}

.banner-master-admin-banner-cell__image {
  width: min(100%, 280px);
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.banner-master-admin-banner-cell__image--placeholder {
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-weight: 700;
}

.banner-master-admin-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.banner-master-admin-drawer__title {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.banner-master-admin-drawer__description {
  margin-top: 4px;
  color: #64748b;
  line-height: 1.6;
}

.banner-master-admin-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-master-admin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-master-admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.banner-master-admin-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.banner-master-admin-label {
  font-weight: 700;
  color: #334155;
}

.banner-master-admin-help {
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.6;
}

.banner-master-admin-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #334155;
  font-weight: 500;
}

.banner-master-admin-preview-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.banner-master-admin-preview-image--placeholder {
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-weight: 700;
  text-align: center;
  padding: 16px;
}

.banner-master-admin-error {
  color: #dc2626;
  font-weight: 700;
}

@media (max-width: 767px) {
  .banner-master-admin-filter-row,
  .banner-master-admin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
