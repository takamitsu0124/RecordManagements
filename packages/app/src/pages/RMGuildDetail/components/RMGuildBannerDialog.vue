<script setup lang="ts">
import { dbBannerMasterModule } from '@rm/db'
import { BannerMaster } from '@rm/types'
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import { notifyError } from 'src/composables/useAppNotifications'
import {
  formatBannerDateRange,
  isBannerVisibleOnDate,
  normalizeBannerMasterRecord,
} from 'src/helpers/bannerMaster'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const banners = ref<BannerMaster[]>([])
const isLoading = ref(false)
const filterDate = ref<Date | null>(new Date())

const visibleBanners = computed(() => {
  const targetDate = filterDate.value ?? new Date()

  return banners.value.filter((banner) =>
    isBannerVisibleOnDate(banner, targetDate)
  )
})

const visibleBannerCountLabel = computed(
  () => `${visibleBanners.value.length}件`
)

const loadBanners = async () => {
  try {
    isLoading.value = true
    await dbBannerMasterModule.fetch()
    banners.value = Array.from(dbBannerMasterModule.data.values())
      .map((banner) => normalizeBannerMasterRecord(banner))
      .sort((a, b) => {
        const aStart = a.startAt?.getTime() ?? 0
        const bStart = b.startAt?.getTime() ?? 0
        return bStart - aStart || a.id.localeCompare(b.id, 'ja')
      })
  } catch (error) {
    notifyError('バナーの読み込みに失敗しました。')
    console.error('Failed to fetch banners:', error)
  } finally {
    isLoading.value = false
  }
}

const resetFilterDateToToday = () => {
  filterDate.value = new Date()
}

watch(
  () => props.visible,
  async (nextVisible) => {
    if (!nextVisible) return

    resetFilterDateToToday()
    await loadBanners()
  },
  { immediate: true }
)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="バナー一覧"
    :style="{ width: 'min(96vw, 64rem)' }"
    class="guild-banner-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="guild-banner-dialog__content">
      <div class="guild-banner-dialog__toolbar">
        <DatePicker
          v-model="filterDate"
          showIcon
          iconDisplay="input"
          dateFormat="yy/mm/dd"
          placeholder="表示対象日"
        />
        <Button
          label="今日の表示対象"
          severity="secondary"
          outlined
          @click="resetFilterDateToToday"
        />
        <Tag :value="visibleBannerCountLabel" severity="info" />
      </div>

      <div v-if="isLoading" class="guild-banner-dialog__loading">
        <ProgressSpinner strokeWidth="5" />
        <p class="rm-muted">バナーを読み込み中...</p>
      </div>

      <RMEmptyState
        v-else-if="visibleBanners.length === 0"
        icon="pi pi-image"
        title="表示対象のバナーがありません"
        message="表示対象日、公開状態、掲載期間に一致するバナーが登録されていません。"
      />

      <div v-else class="guild-banner-dialog__grid">
        <article
          v-for="banner in visibleBanners"
          :key="banner.id"
          class="guild-banner-dialog__item"
        >
          <img
            :src="banner.imageUrl"
            :alt="banner.id"
            loading="lazy"
            class="guild-banner-dialog__image"
          />
          <div class="guild-banner-dialog__meta">
            <div class="guild-banner-dialog__id">{{ banner.id }}</div>
            <div class="guild-banner-dialog__period">
              {{ formatBannerDateRange(banner) }}
            </div>
          </div>
        </article>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.guild-banner-dialog__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guild-banner-dialog__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.guild-banner-dialog__loading {
  min-height: 220px;
  display: grid;
  place-items: center;
  gap: 12px;
}

.guild-banner-dialog__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.guild-banner-dialog__item {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
}

.guild-banner-dialog__image {
  width: 100%;
  object-fit: contain;
  display: block;
  background: #f8fafc;
}

.guild-banner-dialog__meta {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guild-banner-dialog__id {
  font-weight: 700;
  color: #0f172a;
}

.guild-banner-dialog__period {
  font-size: 13px;
  color: #64748b;
}
</style>
