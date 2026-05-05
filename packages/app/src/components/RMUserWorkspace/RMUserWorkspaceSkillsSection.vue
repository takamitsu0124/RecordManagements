<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import type { OwnedSkill, SkillMaster } from '@rm/types'
import RMInput from 'src/components/RMInput/RMInput.vue'
import type {
  OwnedSkillRow,
  SkillCatalogRow,
  SkillCatalogStatus,
} from './types'

const props = defineProps<{
  isEditMode: boolean
  ownedSkills: OwnedSkill[]
  ownedSkillRows: OwnedSkillRow[]
  filteredSkillCatalogRows: SkillCatalogRow[]
  visibleSkillCatalogRows: SkillCatalogRow[]
  hiddenSkillCatalogCount: number
  skillCatalogQuery: string
  skillCatalogElement: string
  skillCatalogEquipmentType: string
  skillCatalogStatus: SkillCatalogStatus
  skillCatalogElementOptions: string[]
  skillCatalogEquipmentTypeOptions: string[]
}>()

const emit = defineEmits<{
  (e: 'update:ownedSkills', value: OwnedSkill[]): void
  (e: 'update:skillCatalogQuery', value: string): void
  (e: 'update:skillCatalogElement', value: string): void
  (e: 'update:skillCatalogEquipmentType', value: string): void
  (e: 'update:skillCatalogStatus', value: SkillCatalogStatus): void
  (e: 'toggle-skill', skill: SkillMaster): void
  (e: 'remove-skill', skillId: string): void
  (e: 'reset-filters'): void
}>()

const skillCatalogQueryModel = computed({
  get: () => props.skillCatalogQuery,
  set: (value: string) => emit('update:skillCatalogQuery', value),
})

const setSkillCatalogElement = (value: string) =>
  emit('update:skillCatalogElement', value)
const setSkillCatalogEquipmentType = (value: string) =>
  emit('update:skillCatalogEquipmentType', value)
const setSkillCatalogStatus = (value: SkillCatalogStatus) =>
  emit('update:skillCatalogStatus', value)

const setOwnedSkillLevel = (index: number, value: number | null) => {
  const nextOwnedSkills = props.ownedSkills.map((skill, skillIndex) =>
    skillIndex === index ? { ...skill, level: value ?? 0 } : skill
  )

  emit('update:ownedSkills', nextOwnedSkills)
}
</script>

<template>
  <Card class="user-workspace-card">
    <template #content>
      <div class="user-workspace-section">
        <div class="user-workspace-section__header">
          <div>
            <div class="rm-section-title">所持スキル</div>
            <div class="user-workspace-section__description">
              編集モードでは一覧を見ながら所持スキルをチェックでき、同じ画面で熟練度も更新できます。
            </div>
          </div>
          <Tag :value="`${ownedSkillRows.length}件`" severity="info" />
        </div>

        <Divider />

        <div v-if="isEditMode" class="skill-checker">
          <div class="skill-checker__intro">
            <div class="skill-checker__title">一覧からチェック</div>
            <p class="skill-checker__description">
              持っているスキルをタップすると追加、もう一度タップすると解除できます。細かい熟練度は下の一覧でまとめて調整してください。
            </p>
          </div>

          <RMInput
            v-model="skillCatalogQueryModel"
            search
            shadow
            class="skill-checker__search"
            placeholder="名称・技名・ID・キャラ名で検索"
          />

          <div class="skill-checker__filter-group">
            <div class="skill-checker__filter-label">表示</div>
            <div class="skill-checker__filter-actions">
              <Button
                type="button"
                label="未チェック"
                size="small"
                :severity="
                  skillCatalogStatus === 'unowned' ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogStatus !== 'unowned'"
                @click="setSkillCatalogStatus('unowned')"
              />
              <Button
                type="button"
                label="チェック済み"
                size="small"
                :severity="
                  skillCatalogStatus === 'owned' ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogStatus !== 'owned'"
                @click="setSkillCatalogStatus('owned')"
              />
              <Button
                type="button"
                label="すべて"
                size="small"
                :severity="
                  skillCatalogStatus === 'all' ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogStatus !== 'all'"
                @click="setSkillCatalogStatus('all')"
              />
            </div>
          </div>

          <div class="skill-checker__filter-group">
            <div class="skill-checker__filter-label">自然属性</div>
            <div class="skill-checker__filter-actions">
              <Button
                type="button"
                label="すべて"
                size="small"
                :severity="
                  skillCatalogElement === 'all' ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogElement !== 'all'"
                @click="setSkillCatalogElement('all')"
              />
              <Button
                v-for="element in skillCatalogElementOptions"
                :key="element"
                type="button"
                :label="element"
                size="small"
                :severity="
                  skillCatalogElement === element ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogElement !== element"
                @click="setSkillCatalogElement(element)"
              />
            </div>
          </div>

          <div class="skill-checker__filter-group">
            <div class="skill-checker__filter-label">装備種別</div>
            <div class="skill-checker__filter-actions">
              <Button
                type="button"
                label="すべて"
                size="small"
                :severity="
                  skillCatalogEquipmentType === 'all' ? 'contrast' : 'secondary'
                "
                :outlined="skillCatalogEquipmentType !== 'all'"
                @click="setSkillCatalogEquipmentType('all')"
              />
              <Button
                v-for="equipmentType in skillCatalogEquipmentTypeOptions"
                :key="equipmentType"
                type="button"
                :label="equipmentType"
                size="small"
                :severity="
                  skillCatalogEquipmentType === equipmentType
                    ? 'contrast'
                    : 'secondary'
                "
                :outlined="skillCatalogEquipmentType !== equipmentType"
                @click="setSkillCatalogEquipmentType(equipmentType)"
              />
            </div>
          </div>

          <div class="skill-checker__summary">
            <div class="skill-checker__summary-tags">
              <Tag
                :value="`候補 ${filteredSkillCatalogRows.length}件`"
                severity="secondary"
              />
              <Tag
                :value="`チェック済み ${ownedSkillRows.length}件`"
                severity="success"
              />
            </div>
            <Button
              type="button"
              label="絞り込みをクリア"
              text
              size="small"
              @click="emit('reset-filters')"
            />
          </div>

          <div
            v-if="visibleSkillCatalogRows.length === 0"
            class="user-workspace-empty"
          >
            条件に合うスキルがありません。検索条件をゆるめてください。
          </div>

          <div v-else class="skill-catalog-grid">
            <button
              v-for="skill in visibleSkillCatalogRows"
              :key="skill.id"
              type="button"
              class="skill-catalog-card"
              :class="{ 'skill-catalog-card--owned': skill.isOwned }"
              :aria-pressed="skill.isOwned"
              @click="emit('toggle-skill', skill)"
            >
              <div class="skill-catalog-card__media">
                <div class="skill-catalog-card__status">
                  <i
                    :class="[
                      'pi',
                      skill.isOwned ? 'pi-check-circle' : 'pi-circle',
                    ]"
                  />
                  <span>{{
                    skill.isOwned ? 'チェック済み' : '未チェック'
                  }}</span>
                </div>
                <img
                  v-if="skill.image"
                  :src="skill.image"
                  alt=""
                  class="skill-catalog-card__image"
                />
                <div v-else class="skill-catalog-card__placeholder">
                  No image
                </div>
              </div>
              <div class="skill-catalog-card__body">
                <div class="skill-catalog-card__name">
                  {{ skill.name }}
                </div>
                <div class="skill-catalog-card__attributes">
                  <span class="skill-catalog-card__attribute">
                    {{ skill.equipmentType || '未設定' }}
                  </span>
                  <span class="skill-catalog-card__attribute">
                    {{ skill.element || '未設定' }}
                  </span>
                </div>
                <div class="skill-catalog-card__skill-name">
                  {{ skill.skillName || '未設定' }}
                </div>
              </div>
            </button>
          </div>

          <p v-if="hiddenSkillCatalogCount > 0" class="skill-checker__help">
            候補が多いため先頭
            {{ visibleSkillCatalogRows.length }}
            件だけ表示しています。検索や絞り込みを追加すると探しやすくなります。
          </p>
        </div>

        <div v-if="ownedSkillRows.length === 0" class="user-workspace-empty">
          {{
            isEditMode
              ? 'まだ所持スキルは選ばれていません。上の一覧から持っているスキルをチェックしてください。'
              : 'まだ所持スキルは登録されていません。'
          }}
        </div>

        <div v-else class="owned-skill-list">
          <div v-if="isEditMode" class="owned-skill-list__header">
            <div class="owned-skill-list__title">チェック済み一覧</div>
            <div class="owned-skill-list__subtitle">
              ここでは熟練度の調整と不要なスキルの削除ができます。
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
                  v-if="isEditMode"
                  type="button"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
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
              <div class="owned-skill-item__level">
                <div class="user-workspace-field__label">熟練度</div>
                <InputNumber
                  :modelValue="ownedSkills[skill.index].level"
                  :min="0"
                  showButtons
                  :disabled="!isEditMode"
                  class="owned-skill-item__input"
                  @update:modelValue="setOwnedSkillLevel(skill.index, $event)"
                />
              </div>
            </div>
          </article>
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

.user-workspace-field__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.skill-checker__search,
.owned-skill-item__input {
  width: 100%;
}

.skill-checker {
  padding: 14px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skill-checker__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-checker__title {
  font-size: 1rem;
  font-weight: 800;
  color: #334155;
}

.skill-checker__description,
.skill-checker__help {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.skill-checker__filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-checker__filter-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.skill-checker__filter-actions,
.skill-checker__summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-checker__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.skill-catalog-card {
  width: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.skill-catalog-card:hover {
  transform: translateY(-2px);
  border-color: #94a3b8;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.skill-catalog-card--owned {
  border-color: #60a5fa;
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.12);
}

.skill-catalog-card__media {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  aspect-ratio: 10 / 11;
  background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%);
}

.skill-catalog-card__status {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  backdrop-filter: blur(6px);
}

.skill-catalog-card__status .pi {
  font-size: 0.9rem;
}

.skill-catalog-card__image,
.skill-catalog-card__placeholder {
  width: 100%;
  height: 100%;
}

.skill-catalog-card__image {
  display: block;
  object-fit: cover;
  object-position: left center;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
}

.skill-catalog-card__placeholder {
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #64748b;
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: uppercase;
}

.skill-catalog-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-catalog-card__name {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
  word-break: break-word;
  line-height: 1.4;
}

.skill-catalog-card__attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-catalog-card__attribute {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.skill-catalog-card__skill-name {
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.6;
  word-break: break-word;
}

.user-workspace-empty {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  text-align: center;
  background: #fff;
}

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

@media (max-width: 767px) {
  .user-workspace-section {
    padding: 16px;
  }

  .skill-checker {
    padding: 12px;
  }

  .skill-checker__summary {
    align-items: stretch;
  }

  .skill-checker__summary :deep(.p-button) {
    width: 100%;
  }

  .skill-catalog-card {
    padding: 12px;
    border-radius: 20px;
  }

  .skill-catalog-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .skill-catalog-card__status {
    top: 10px;
    right: 10px;
    padding: 6px 10px;
  }

  .owned-skill-item {
    grid-template-columns: 1fr;
  }
}
</style>
