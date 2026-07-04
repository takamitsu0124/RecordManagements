<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Paginator from 'primevue/paginator'
import Tag from 'primevue/tag'
import Tooltip from 'primevue/tooltip'
import type { SkillMaster } from '@rm/types'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMSectionEdit from 'src/components/RMSectionEdit/RMSectionEdit.vue'
import RMUserWorkspaceOwnedSkillList from './RMUserWorkspaceOwnedSkillList.vue'
import type {
  OwnedSkillRow,
  SkillCatalogRow,
  SkillCatalogStatus,
} from './types'

const props = defineProps<{
  editing: boolean
  ownedSkillRows: OwnedSkillRow[]
  filteredSkillCatalogRows: SkillCatalogRow[]
  visibleSkillCatalogRows: SkillCatalogRow[]
  skillCatalogPage: number
  skillCatalogPageSize: number
  skillCatalogQuery: string
  skillCatalogElement: string
  skillCatalogEquipmentType: string
  skillCatalogStatus: SkillCatalogStatus
  skillCatalogElementOptions: string[]
  skillCatalogEquipmentTypeOptions: string[]
}>()

const emit = defineEmits<{
  (e: 'update:skillCatalogPage', value: number): void
  (e: 'update:skillCatalogQuery', value: string): void
  (e: 'update:skillCatalogElement', value: string): void
  (e: 'update:skillCatalogEquipmentType', value: string): void
  (e: 'update:skillCatalogStatus', value: SkillCatalogStatus): void
  (e: 'toggle-skill', skill: SkillMaster): void
  (e: 'remove-skill', skillId: string): void
  (e: 'reset-filters'): void
  (e: 'update:editing', value: boolean): void
  (e: 'save'): void
  (e: 'cancel'): void
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
const setSkillCatalogPage = (event: { page: number }) =>
  emit('update:skillCatalogPage', event.page)
const skillCatalogGridRef = ref<HTMLElement | null>(null)
let shouldScrollOnMobilePageChange = false

const isMobilePagerViewport = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 767px)').matches

const scrollSkillCatalogGridIntoView = () => {
  if (!skillCatalogGridRef.value || !isMobilePagerViewport()) return

  const behavior =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'

  skillCatalogGridRef.value.scrollIntoView({
    behavior,
    block: 'start',
  })
}

const updateSkillCatalogPage = (page: number) => {
  const nextPage = Math.min(Math.max(page, 0), skillCatalogTotalPages.value - 1)
  if (nextPage === props.skillCatalogPage) return

  shouldScrollOnMobilePageChange = isMobilePagerViewport()
  emit('update:skillCatalogPage', nextPage)
}

const vTooltip = Tooltip

const equipmentTypeToneMap: Record<string, string> = {
  片手直剣: 'sword',
  細剣: 'rapier',
  短剣: 'dagger',
  弓: 'bow',
  槍: 'spear',
  斧: 'axe',
  棍棒: 'club',
  盾: 'shield',
}

const elementToneMap: Record<string, string> = {
  火: 'fire',
  水: 'water',
  風: 'wind',
  土: 'earth',
  光: 'light',
  聖: 'light',
  闇: 'dark',
  無: 'none',
}

const getEquipmentTypeClass = (value: string) => {
  const tone = equipmentTypeToneMap[value] || 'default'
  return ['skill-catalog-card__attribute--equipment', `is-${tone}`]
}

const getElementClass = (value: string) => {
  const tone = elementToneMap[value] || 'default'
  return ['skill-catalog-card__attribute--element', `is-${tone}`]
}

const skillCatalogTotalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(
      props.filteredSkillCatalogRows.length / props.skillCatalogPageSize
    )
  )
)

watch(
  () => props.skillCatalogPage,
  async (nextPage, previousPage) => {
    if (!shouldScrollOnMobilePageChange || nextPage === previousPage) return

    shouldScrollOnMobilePageChange = false
    await nextTick()
    scrollSkillCatalogGridIntoView()
  }
)
</script>

<template>
  <Card class="user-workspace-card">
    <template #content>
      <div class="user-workspace-section">
        <RMSectionEdit
          :editing="editing"
          :can-edit="true"
          @update:editing="(value) => emit('update:editing', value)"
          @cancel="emit('cancel')"
          @save="emit('save')"
        >
          <template #header>
            <div class="workspace-section-heading">
              <span class="rm-section-title">所持スキル</span>
              <Tag :value="`${ownedSkillRows.length}件`" severity="info" />
            </div>
          </template>

          <template #view>
            <div v-if="ownedSkillRows.length === 0" class="user-workspace-empty">
              まだ所持スキルは登録されていません。
            </div>
            <div v-else class="owned-skill-list">
              <RMUserWorkspaceOwnedSkillList
                :ownedSkillRows="ownedSkillRows"
                :show-skill-actions="false"
                :show-action-hint="false"
              />
            </div>
          </template>

          <template #edit>
        <div class="skill-checker">
          <div class="skill-checker__intro">
            <i class="pi pi-chevron-right" aria-hidden="true" />
            <span>タップしてチェック、もう一度タップで解除できます。</span>
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

          <div v-else ref="skillCatalogGridRef" class="skill-catalog-grid">
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
                  loading="lazy"
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
                  <span
                    v-tooltip.bottom="
                      `装備種別: ${skill.equipmentType || '未設定'}`
                    "
                    class="skill-catalog-card__attribute"
                    :class="getEquipmentTypeClass(skill.equipmentType)"
                  >
                    {{ skill.equipmentType || '未設定' }}
                  </span>
                  <span
                    v-tooltip.bottom="`自然属性: ${skill.element || '未設定'}`"
                    class="skill-catalog-card__attribute"
                    :class="getElementClass(skill.element)"
                  >
                    {{ skill.element || '未設定' }}
                  </span>
                </div>
                <div class="skill-catalog-card__skill-name">
                  {{ skill.skillName || '未設定' }}
                </div>
                <div
                  class="skill-catalog-card__tap-hint"
                  :class="{
                    'skill-catalog-card__tap-hint--owned': skill.isOwned,
                  }"
                >
                  <i class="pi pi-chevron-right" aria-hidden="true" />
                  <span>{{
                    skill.isOwned ? 'もう一度タップで解除' : 'タップでチェック'
                  }}</span>
                </div>
              </div>
            </button>
          </div>

          <div
            v-if="filteredSkillCatalogRows.length > skillCatalogPageSize"
            class="skill-checker__pagination"
          >
            <p class="skill-checker__help">
              {{ filteredSkillCatalogRows.length }} 件を
              {{ skillCatalogPageSize }} 件ずつ表示しています。
            </p>
            <div class="skill-checker__pager-status">
              {{ skillCatalogPage + 1 }} / {{ skillCatalogTotalPages }}
            </div>
            <div class="skill-checker__pager-mobile">
              <button
                type="button"
                class="skill-checker__pager-button"
                :disabled="skillCatalogPage === 0"
                @click="updateSkillCatalogPage(0)"
              >
                &lt;&lt;
              </button>
              <button
                type="button"
                class="skill-checker__pager-button"
                :disabled="skillCatalogPage === 0"
                @click="updateSkillCatalogPage(skillCatalogPage - 1)"
              >
                &lt;
              </button>
              <div
                class="skill-checker__pager-status skill-checker__pager-status--mobile"
              >
                {{ skillCatalogPage + 1 }} / {{ skillCatalogTotalPages }}
              </div>
              <button
                type="button"
                class="skill-checker__pager-button"
                :disabled="skillCatalogPage >= skillCatalogTotalPages - 1"
                @click="updateSkillCatalogPage(skillCatalogPage + 1)"
              >
                &gt;
              </button>
              <button
                type="button"
                class="skill-checker__pager-button"
                :disabled="skillCatalogPage >= skillCatalogTotalPages - 1"
                @click="updateSkillCatalogPage(skillCatalogTotalPages - 1)"
              >
                &gt;&gt;
              </button>
            </div>
            <Paginator
              class="skill-checker__paginator"
              :first="skillCatalogPage * skillCatalogPageSize"
              :rows="skillCatalogPageSize"
              :totalRecords="filteredSkillCatalogRows.length"
              template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
              @page="setSkillCatalogPage"
            />
          </div>
        </div>

        <div v-if="ownedSkillRows.length === 0" class="user-workspace-empty">
          まだ所持スキルは選ばれていません。上の一覧から持っているスキルをチェックしてください。
        </div>

        <div v-else class="owned-skill-list">
          <RMUserWorkspaceOwnedSkillList
            :ownedSkillRows="ownedSkillRows"
            show-header
            @remove-skill="emit('remove-skill', $event)"
          />
        </div>
          </template>
        </RMSectionEdit>
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

.workspace-section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-workspace-field__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.skill-checker__search {
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

.skill-checker__help {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.skill-checker__intro {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid rgba(96, 165, 250, 0.4);
  color: #1d4ed8;
  font-size: 0.84rem;
  font-weight: 700;
}

.skill-checker__intro .pi {
  font-size: 0.9rem;
  animation: skill-checker-tap-guide-bounce 1.5s ease-in-out infinite;
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

.skill-checker__pagination {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-checker__pager-status {
  display: none;
}

.skill-checker__pager-mobile {
  display: none;
}

.skill-checker__paginator :deep(.p-paginator) {
  justify-content: center;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
}

.skill-checker__pager-button {
  min-width: 40px;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, opacity 0.18s ease;
}

.skill-checker__pager-button:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.skill-checker__pager-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.skill-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  scroll-margin-top: calc(var(--rm-header-height, 0px) + 16px);
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

.skill-catalog-card:hover,
.skill-catalog-card:focus-visible {
  transform: translateY(-2px);
  border-color: #94a3b8;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.skill-catalog-card:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 3px;
}

.skill-catalog-card:active {
  transform: scale(0.985);
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
  top: 1px;
  right: 1px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  backdrop-filter: blur(6px);
  opacity: 0.8;
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
  border: 1px solid transparent;
  background: #f8fafc;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.skill-catalog-card__attribute:hover {
  transform: translateY(-1px);
}

.skill-catalog-card__attribute--equipment.is-sword {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.skill-catalog-card__attribute--equipment.is-rapier {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6d28d9;
}

.skill-catalog-card__attribute--equipment.is-dagger {
  background: #fdf2f8;
  border-color: #fbcfe8;
  color: #be185d;
}

.skill-catalog-card__attribute--equipment.is-bow {
  background: #ecfeff;
  border-color: #a5f3fc;
  color: #0f766e;
}

.skill-catalog-card__attribute--equipment.is-spear {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
}

.skill-catalog-card__attribute--equipment.is-axe {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.skill-catalog-card__attribute--equipment.is-club {
  background: #fef3c7;
  border-color: #fde68a;
  color: #a16207;
}

.skill-catalog-card__attribute--equipment.is-shield {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}

.skill-catalog-card__attribute--element.is-fire {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.skill-catalog-card__attribute--element.is-water {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #2563eb;
}

.skill-catalog-card__attribute--element.is-wind {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}

.skill-catalog-card__attribute--element.is-earth {
  background: #fefce8;
  border-color: #fde68a;
  color: #a16207;
}

.skill-catalog-card__attribute--element.is-light {
  background: #fffbea;
  border-color: #fde68a;
  color: #ca8a04;
}

.skill-catalog-card__attribute--element.is-dark {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #7c3aed;
}

.skill-catalog-card__attribute--element.is-none {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

.skill-catalog-card__attribute.is-default {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

@keyframes skill-checker-tap-guide-bounce {
  0%,
  100% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skill-checker__intro .pi {
    animation: none;
  }

  .skill-catalog-card {
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
}

.skill-catalog-card__skill-name {
  color: #475569;
  font-size: 0.88rem;
  line-height: 1.6;
  word-break: break-word;
}

.skill-catalog-card__tap-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px dashed #93c5fd;
  color: #1d4ed8;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.skill-catalog-card__tap-hint--owned {
  background: rgba(219, 234, 254, 0.82);
  border-style: solid;
  border-color: #60a5fa;
  color: #1e40af;
}

.skill-catalog-card__tap-hint .pi {
  font-size: 0.82rem;
}

.user-workspace-empty {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  text-align: center;
  background: #fff;
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

  .skill-checker__paginator :deep(.p-paginator) {
    display: none;
  }

  .skill-checker__pager-mobile {
    display: grid;
    grid-template-columns: 40px 40px minmax(72px, auto) 40px 40px;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .skill-checker__pager-status {
    font-size: 0.85rem;
    font-weight: 700;
    color: #475569;
  }

  .skill-checker__pager-status--mobile {
    display: flex;
    align-items: center;
    justify-content: center;
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
}
</style>
