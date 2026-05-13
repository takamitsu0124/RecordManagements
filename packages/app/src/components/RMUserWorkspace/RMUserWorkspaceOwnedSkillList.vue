<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { OwnedSkillRow } from './types'

const props = withDefaults(
  defineProps<{
    isEditMode: boolean
    ownedSkillRows: OwnedSkillRow[]
    showHeader?: boolean
    showSkillActions?: boolean
    showActionHint?: boolean
  }>(),
  {
    showHeader: false,
    showSkillActions: true,
    showActionHint: true,
  }
)

const emit = defineEmits<{
  (e: 'remove-skill', skillId: string): void
}>()

const shouldShowHeader = computed(() => props.showHeader && props.isEditMode)
const shouldShowSkillActions = computed(
  () => props.showSkillActions && props.isEditMode
)
const shouldShowActionHint = computed(
  () => props.showActionHint && shouldShowSkillActions.value
)
</script>

<template>
  <div class="owned-skill-list">
    <div v-if="shouldShowHeader" class="owned-skill-list__header">
      <div class="owned-skill-list__title">チェック済み一覧</div>
      <div class="owned-skill-list__subtitle">
        ここでは登録済みスキルの確認と、不要なスキルのチェック解除ができます。
      </div>
    </div>

    <article
      v-for="skill in ownedSkillRows"
      :key="skill.skillId"
      class="owned-skill-item"
    >
      <div class="owned-skill-item__media">
        <img
          v-if="skill.image"
          :src="skill.image"
          alt=""
          class="owned-skill-item__image"
        />
        <div v-else class="owned-skill-item__placeholder">No image</div>
      </div>
      <div class="owned-skill-item__body">
        <div class="owned-skill-item__head">
          <div>
            <div class="owned-skill-item__name">{{ skill.name }}</div>
            <div class="owned-skill-item__meta">
              {{ skill.skillId }}
            </div>
          </div>
          <Button
            v-if="shouldShowSkillActions"
            type="button"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            aria-label="チェックを外す"
            @click="emit('remove-skill', skill.skillId)"
          />
        </div>
        <div class="owned-skill-item__tags">
          <Tag :value="skill.element" severity="secondary" />
          <Tag :value="skill.equipmentType" severity="secondary" />
          <Tag :value="skill.skillType" severity="secondary" />
          <Tag
            v-if="skill.masterMissing"
            value="master未登録"
            severity="danger"
          />
        </div>
        <div class="owned-skill-item__meta">
          {{ skill.effect || skill.skillName || '未設定' }}
        </div>
        <div v-if="shouldShowActionHint" class="owned-skill-item__action-hint">
          <i class="pi pi-trash" aria-hidden="true" />
          <span>右上のゴミ箱アイコンをタップするとチェックを外せます。</span>
        </div>
      </div>
    </article>
  </div>
</template>

<style lang="scss" scoped>
.owned-skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.owned-skill-list__header {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.owned-skill-list__title {
  font-weight: 800;
  color: #334155;
}

.owned-skill-list__subtitle {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
}

.owned-skill-item {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.owned-skill-item__media {
  display: flex;
  align-items: flex-start;
}

.owned-skill-item__image,
.owned-skill-item__placeholder {
  width: 84px;
  height: 84px;
  border-radius: 18px;
}

.owned-skill-item__image {
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.owned-skill-item__placeholder {
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.owned-skill-item__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.owned-skill-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.owned-skill-item__name {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
  word-break: break-word;
}

.owned-skill-item__meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.82rem;
  word-break: break-all;
}

.owned-skill-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.owned-skill-item__action-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #c2410c;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.owned-skill-item__action-hint .pi {
  font-size: 0.85rem;
}

@media (max-width: 767px) {
  .owned-skill-item {
    grid-template-columns: 1fr;
  }

  .owned-skill-item__action-hint {
    width: 100%;
  }
}
</style>
