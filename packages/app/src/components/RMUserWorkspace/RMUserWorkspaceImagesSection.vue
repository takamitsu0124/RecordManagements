<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import FileUpload from 'primevue/fileupload'
import OrderList from 'primevue/orderlist'
import Tag from 'primevue/tag'
import Draggable from 'vuedraggable'
import type { ImageItem } from './types'

const props = defineProps<{
  isEditMode: boolean
  imageItems: ImageItem[]
  selectedImageItems: ImageItem[]
  imageUploadKey: number
  imageCountLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:imageItems', value: ImageItem[]): void
  (e: 'update:selectedImageItems', value: ImageItem[]): void
  (e: 'select-files', event: { files?: File[] }): void
  (e: 'remove-image', imageId: string): void
  (e: 'open-carousel', index: number): void
  (e: 'open-carousel-by-id', imageId: string): void
}>()

const imageItemsModel = computed({
  get: () => props.imageItems,
  set: (value: ImageItem[]) => emit('update:imageItems', value),
})

const selectedImageItemsModel = computed({
  get: () => props.selectedImageItems,
  set: (value: ImageItem[]) => emit('update:selectedImageItems', value),
})
</script>

<template>
  <Card class="user-workspace-card">
    <template #content>
      <div class="user-workspace-section">
        <div class="user-workspace-section__header">
          <div>
            <div class="rm-section-title">画像管理</div>
            <div class="user-workspace-section__description">
              画像 URL
              は表示せず、プレビューと順序だけを管理します。保存時は現在の順序のまま
              Firestore に反映されます。
            </div>
          </div>
          <Tag
            :value="imageCountLabel"
            :severity="imageItems.length > 0 ? 'success' : 'secondary'"
          />
        </div>

        <Divider />

        <div v-if="isEditMode" class="image-toolbox">
          <FileUpload
            :key="imageUploadKey"
            mode="basic"
            multiple
            accept="image/*"
            chooseLabel="画像を追加"
            class="image-toolbox__upload"
            @select="emit('select-files', $event)"
          />
          <div class="image-toolbox__help">
            ドラッグ＆ドロップで大まかに並び替え、細かい調整は `OrderList`
            の上下ボタンで行えます。
          </div>
        </div>

        <div v-if="imageItems.length === 0" class="user-workspace-empty">
          まだ画像は登録されていません。
        </div>

        <div v-else-if="isEditMode" class="image-order-layout">
          <OrderList
            v-model="imageItemsModel"
            v-model:selection="selectedImageItemsModel"
            dataKey="id"
            :metaKeySelection="false"
            :listStyle="{ height: 'auto' }"
            scrollHeight="22rem"
            class="image-order-list"
          >
            <template #header>
              <div class="image-order-list__header">
                <div class="image-order-list__title">並び替え一覧</div>
                <div class="image-order-list__subtitle">
                  画像を選択して上下ボタンで順序を調整します。
                </div>
              </div>
            </template>
            <template #option="{ option, index }">
              <div class="image-order-item">
                <button
                  type="button"
                  class="image-order-item__preview"
                  @click.stop="emit('open-carousel-by-id', option.id)"
                >
                  <img
                    :src="option.previewUrl"
                    alt=""
                    loading="lazy"
                    class="image-order-item__image"
                  />
                </button>
                <div class="image-order-item__meta">
                  <div class="image-order-item__title">
                    画像 {{ index + 1 }}
                  </div>
                  <div class="image-order-item__subtitle">
                    {{ option.label }}
                  </div>
                  <Tag v-if="option.isNew" value="未保存" severity="warn" />
                </div>
                <Button
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  @click.stop="emit('remove-image', option.id)"
                />
              </div>
            </template>
          </OrderList>

          <div class="image-sort-grid">
            <div class="image-sort-grid__title">ドラッグで並び替え</div>
            <div class="image-sort-grid__description">
              ハンドルをつかんで順序を変更すると、その並びのまま保存されます。
            </div>
            <Draggable
              v-model="imageItemsModel"
              item-key="id"
              handle=".image-sort-grid__handle"
              :animation="180"
              class="image-preview-grid image-preview-grid--sortable"
            >
              <template #item="{ element, index }">
                <div
                  class="image-preview-grid__item image-preview-grid__item--sortable"
                >
                  <button
                    type="button"
                    class="image-sort-grid__handle"
                    aria-label="画像の順序を変更"
                  >
                    <span class="pi pi-bars" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="image-preview-grid__preview"
                    @click="emit('open-carousel', index)"
                  >
                    <img
                      :src="element.previewUrl"
                      alt=""
                      loading="lazy"
                      class="image-preview-grid__image"
                    />
                    <span class="image-preview-grid__badge">{{
                      index + 1
                    }}</span>
                  </button>
                </div>
              </template>
            </Draggable>
          </div>
        </div>

        <div v-else class="image-preview-grid">
          <button
            v-for="(item, index) in imageItems"
            :key="item.id"
            type="button"
            class="image-preview-grid__item"
            @click="emit('open-carousel', index)"
          >
            <img
              :src="item.previewUrl"
              alt=""
              loading="lazy"
              class="image-preview-grid__image"
            />
            <span class="image-preview-grid__badge">{{ index + 1 }}</span>
          </button>
        </div>
      </div>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.user-workspace-card {
  border-radius: 24px;
  overflow: hidden;
}

.user-workspace-section {
  padding: clamp(16px, 2.2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.user-workspace-section__description {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.7;
}

.user-workspace-empty {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  text-align: center;
  background: #fff;
}

.image-toolbox {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.image-toolbox__help {
  color: #64748b;
  line-height: 1.6;
}

.image-order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 16px;
  align-items: start;
}

.image-order-list__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-order-list__title {
  font-weight: 800;
  color: #334155;
}

.image-order-list__subtitle {
  font-size: 0.85rem;
  color: #64748b;
}

.image-order-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.image-order-item__preview {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 16px;
  cursor: pointer;
}

.image-order-item__image {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.image-order-item__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.image-order-item__title {
  font-weight: 700;
  color: #334155;
}

.image-order-item__subtitle {
  color: #64748b;
  font-size: 0.82rem;
  word-break: break-word;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(124px, 1fr));
  gap: 12px;
}

.image-sort-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-sort-grid__title {
  font-weight: 800;
  color: #334155;
}

.image-sort-grid__description {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
}

.image-preview-grid__item {
  position: relative;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
}

.image-preview-grid__item--sortable {
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid #e2e8f0;
  padding: 8px;
  cursor: default;
}

.image-preview-grid__preview {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
}

.image-sort-grid__handle {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: grab;
}

.image-sort-grid__handle:active {
  cursor: grabbing;
}

.image-preview-grid__image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.image-preview-grid__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
}

@media (max-width: 960px) {
  .image-order-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .user-workspace-section {
    padding: 16px;
  }

  .image-toolbox {
    padding: 12px;
  }

  .image-preview-dialog__shell {
    grid-template-columns: 1fr;
  }
}
</style>
