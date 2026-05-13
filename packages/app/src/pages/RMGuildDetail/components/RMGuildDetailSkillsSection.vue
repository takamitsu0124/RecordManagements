<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import {
  AppRole,
  weaponProficiencyDefinitions,
  weaponProficiencyMaxTotalLevel,
} from '@rm/types'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import type {
  GuildMemberSkillSummary,
  GuildSkillRow,
  GuildUserRow,
} from '../types'

const props = defineProps<{
  approvedMembers: GuildUserRow[]
  memberSkillSummaries: GuildMemberSkillSummary[]
  isSkillLoading: boolean
  isEditMode: boolean
  canManageGuildMembers: boolean
  currentUserId: string
  roleLabels: Record<AppRole, string>
  guildSkillRows: GuildSkillRow[]
  filteredGuildSkillRows: GuildSkillRow[]
  skillErrorMessage: string | null
  skillTableFilters: {
    skillName: { value: string; matchMode: string }
    element: { value: string | null; matchMode: string }
    equipmentType: { value: string | null; matchMode: string }
  }
  elementOptions: Array<{ label: string; value: string }>
  equipmentTypeOptions: Array<{ label: string; value: string }>
  searchGuide: string
  roleSeverity: (role: AppRole) => string
  attrSeverity: (attr: string) => string
}>()

const emit = defineEmits<{
  (
    e: 'update:skillTableFilters',
    value: {
      skillName: { value: string; matchMode: string }
      element: { value: string | null; matchMode: string }
      equipmentType: { value: string | null; matchMode: string }
    }
  ): void
  (e: 'clear-filters'): void
  (e: 'edit-member', member: GuildMemberSkillSummary): void
}>()

const updateSkillTableFilters = (
  patch: Partial<typeof props.skillTableFilters>
) => {
  emit('update:skillTableFilters', {
    ...props.skillTableFilters,
    ...patch,
  })
}

const updateSkillNameFilter = (value: string) =>
  updateSkillTableFilters({
    skillName: {
      ...props.skillTableFilters.skillName,
      value,
    },
  })

const updateElementFilter = (value: string | null) =>
  updateSkillTableFilters({
    element: {
      ...props.skillTableFilters.element,
      value,
    },
  })

const updateEquipmentTypeFilter = (value: string | null) =>
  updateSkillTableFilters({
    equipmentType: {
      ...props.skillTableFilters.equipmentType,
      value,
    },
  })

const isMemberSkillDialogVisible = ref(false)
</script>

<template>
  <div class="guild-search-grid">
    <Panel class="guild-search-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">スキル検索</div>
            <div class="guild-panel-header__subtitle">
              名称、技名、自然属性、装備種別で絞り込みながら、攻撃属性とスキル種別も確認できます。
            </div>
          </div>
          <Tag
            :value="`${filteredGuildSkillRows.length} / ${guildSkillRows.length}件`"
            severity="info"
            class="guild-panel-header__tag"
          />
        </div>
      </template>

      <div class="guild-search-toolbar rm-filter-toolbar">
        <InputText
          :modelValue="skillTableFilters.skillName.value"
          placeholder="名称・技名・ID・メンバー名で検索"
          @update:modelValue="updateSkillNameFilter"
        />
        <Dropdown
          :modelValue="skillTableFilters.element.value"
          :options="elementOptions"
          optionLabel="label"
          optionValue="value"
          showClear
          placeholder="自然属性"
          @update:modelValue="updateElementFilter"
        />
        <Dropdown
          :modelValue="skillTableFilters.equipmentType.value"
          :options="equipmentTypeOptions"
          optionLabel="label"
          optionValue="value"
          showClear
          filter
          placeholder="装備種別"
          @update:modelValue="updateEquipmentTypeFilter"
        />
        <Button
          label="条件をクリア"
          severity="secondary"
          outlined
          class="guild-search-toolbar__clear"
          @click="emit('clear-filters')"
        />
      </div>

      <div class="guild-panel-note">
        {{ searchGuide }}
      </div>

      <div class="guild-search-panel__actions">
        <Button
          label="メンバー別スキル状況を確認"
          icon="pi pi-users"
          severity="info"
          class="guild-search-panel__summary-button"
          @click="isMemberSkillDialogVisible = true"
        />
        <Tag
          :value="`検索対象 ${memberSkillSummaries.length}人`"
          severity="contrast"
        />
      </div>

      <div v-if="isSkillLoading" class="guild-detail-card__substate">
        <ProgressSpinner strokeWidth="5" style="width: 40px; height: 40px" />
        <p class="rm-muted">スキル検索用データを読み込み中...</p>
      </div>
      <RMEmptyState
        v-else-if="skillErrorMessage"
        icon="pi pi-exclamation-circle"
        title="スキル検索を表示できません"
        :message="skillErrorMessage"
      />
      <RMEmptyState
        v-else-if="approvedMembers.length === 0"
        icon="pi pi-users"
        title="検索対象メンバーがいません"
        message="承認済みメンバーが追加されるとスキル検索が有効になります。"
      />
      <RMEmptyState
        v-else-if="guildSkillRows.length === 0"
        icon="pi pi-star"
        title="所持スキルがまだ登録されていません"
        message="ギルド内メンバーのスキル登録が進むと、ここで横断検索できます。"
      />
      <template v-else>
        <div class="guild-search-table-shell rm-mobile-scroll">
          <DataTable
            :value="filteredGuildSkillRows"
            paginator
            :rows="12"
            responsiveLayout="scroll"
            class="guild-search-table"
          >
            <template #empty>
              <RMEmptyState
                icon="pi pi-search"
                title="条件に一致するスキルがありません"
                message="検索語やフィルタ条件を見直すと結果がすぐに更新されます。"
              />
            </template>
            <Column field="userName" header="メンバー" style="min-width: 180px">
              <template #body="{ data }">
                <div class="guild-search-table__member">
                  <div class="guild-search-table__member-name">
                    {{ data.userName }}
                  </div>
                  <div class="guild-search-table__member-meta">
                    <Tag
                      :value="roleLabels[data.role]"
                      :severity="roleSeverity(data.role)"
                    />
                    <Tag
                      v-if="data.userId === currentUserId"
                      value="自分"
                      severity="info"
                    />
                  </div>
                </div>
              </template>
            </Column>
            <Column field="skillName" header="スキル" style="min-width: 240px">
              <template #body="{ data }">
                <div class="guild-search-table__skill">
                  <img
                    v-if="data.image"
                    :src="data.image"
                    alt="skill"
                    class="guild-search-table__skill-image"
                  />
                  <div>
                    <div class="guild-search-table__skill-name">
                      {{ data.name }}
                    </div>
                    <div class="guild-search-table__skill-meta">
                      {{ data.effect || data.skillName || '未設定' }} / ID:
                      {{ data.skillId }}
                    </div>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="element" header="自然属性" style="width: 110px">
              <template #body="{ data }">
                <Tag
                  :value="data.element"
                  :severity="attrSeverity(data.element)"
                />
              </template>
            </Column>
            <Column
              field="equipmentType"
              header="装備種別"
              style="min-width: 180px"
            />
            <Column
              field="skillType"
              header="スキル種別"
              style="width: 120px"
            />
            <Column
              field="attackType"
              header="攻撃属性"
              style="width: 110px"
            />
          </DataTable>
        </div>

        <div class="guild-skill-mobile-list">
          <div
            v-for="row in filteredGuildSkillRows"
            :key="row.rowId"
            class="guild-skill-mobile-item"
          >
            <div class="guild-skill-mobile-item__head">
              <div class="guild-skill-mobile-item__summary">
                <div class="guild-skill-mobile-item__skill-row">
                  <img
                    v-if="row.image"
                    :src="row.image"
                    alt="skill"
                    class="guild-skill-mobile-item__image"
                  />
                  <div>
                    <div class="guild-skill-mobile-item__skill">{{ row.name }}</div>
                    <div class="guild-skill-mobile-item__meta">
                      {{ row.userName }} / {{ row.skillName || '技名未設定' }}
                    </div>
                  </div>
                </div>
                <div class="guild-skill-mobile-item__meta">
                  {{ row.effect || `ID: ${row.skillId}` }}
                </div>
              </div>
            </div>
            <div class="guild-skill-mobile-item__tags">
              <Tag :value="row.element" :severity="attrSeverity(row.element)" />
              <Tag :value="row.equipmentType" severity="secondary" />
              <Tag :value="row.skillType" severity="contrast" />
              <Tag :value="row.attackType" severity="warn" />
              <Tag
                :value="roleLabels[row.role]"
                :severity="roleSeverity(row.role)"
              />
              <Tag
                v-if="row.userId === currentUserId"
                value="自分"
                severity="info"
              />
            </div>
            <div class="guild-skill-mobile-item__details">
              <span v-if="row.characterName">対象: {{ row.characterName }}</span>
              <span>ID: {{ row.skillId }}</span>
            </div>
          </div>
        </div>
      </template>
    </Panel>

    <Dialog
      v-model:visible="isMemberSkillDialogVisible"
      modal
      dismissableMask
      :draggable="false"
      :style="{ width: 'min(96vw, 980px)' }"
      :breakpoints="{
        '1200px': '96vw',
        '768px': 'calc(100vw - 1rem)',
      }"
      class="guild-skill-overview-dialog"
    >
      <template #header>
        <div class="guild-panel-header guild-skill-overview-dialog__header">
          <div>
            <div class="guild-panel-header__title">メンバー別スキル状況</div>
            <div class="guild-panel-header__subtitle">
              PC/TAB はポップアップ、SP は全画面表示で、メンバーごとの所持状況を確認できます。
            </div>
          </div>
          <Tag
            :value="`${memberSkillSummaries.length}人`"
            severity="contrast"
            class="guild-panel-header__tag"
          />
        </div>
      </template>

      <div v-if="isSkillLoading" class="guild-detail-card__substate">
        <ProgressSpinner strokeWidth="5" style="width: 40px; height: 40px" />
        <p class="rm-muted">ギルド内スキル状況を読み込み中...</p>
      </div>
      <RMEmptyState
        v-else-if="approvedMembers.length === 0"
        icon="pi pi-user-minus"
        title="承認済みメンバーがいません"
        message="承認済みメンバーが追加されると、ここにスキル状況が表示されます。"
      />
      <div v-else class="guild-skill-overview-list">
        <div
          v-for="member in memberSkillSummaries"
          :key="member.uid"
          class="guild-skill-overview-item"
        >
          <div class="guild-skill-overview-item__head">
            <div>
              <div class="guild-skill-overview-item__name">
                {{ member.displayName }}
              </div>
              <div class="guild-skill-overview-item__meta">
                <Tag
                  :value="roleLabels[member.role]"
                  :severity="roleSeverity(member.role)"
                />
                <Tag
                  v-if="member.uid === currentUserId"
                  value="自分"
                  severity="info"
                />
              </div>
            </div>
            <Button
              v-if="isEditMode && canManageGuildMembers"
              label="スキル・画像を編集"
              outlined
              severity="contrast"
              size="small"
              class="guild-skill-overview-item__edit"
              @click="emit('edit-member', member)"
            />
          </div>
          <div class="guild-skill-overview-item__stats">
            <div class="guild-skill-overview-item__stat">
              <span>所持スキル</span>
              <strong>{{ member.ownedCount }}件</strong>
            </div>
            <div class="guild-skill-overview-item__stat">
              <span>解放率</span>
              <strong>{{ member.unlockRateText }}</strong>
            </div>
            <div class="guild-skill-overview-item__stat">
              <span>熟練度入力</span>
              <strong>
                {{ member.weaponProficiencyCount }} /
                {{ weaponProficiencyDefinitions.length }}種
              </strong>
            </div>
          </div>
          <div class="guild-skill-overview-item__progress">
            <div class="guild-skill-overview-item__progress-head">
              <span>武器熟練度進捗率</span>
              <strong>{{ member.weaponProficiencyProgressRateText }}</strong>
            </div>
            <div
              class="guild-skill-overview-item__progress-track"
              aria-hidden="true"
            >
              <div
                class="guild-skill-overview-item__progress-bar"
                :style="{ width: `${member.weaponProficiencyProgressRate}%` }"
              />
            </div>
            <div class="guild-skill-overview-item__progress-note">
              <span>
                合計Lv {{ member.weaponProficiencyTotalLevel }} /
                {{ weaponProficiencyMaxTotalLevel }}
              </span>
              <span
                v-if="
                  member.weaponProficiencyCount === 0 &&
                  weaponProficiencyDefinitions.length > 0
                "
              >
                未入力のメンバーは 0% として表示します
              </span>
            </div>
          </div>
          <div class="guild-skill-overview-item__skills">
            <span
              v-for="skill in member.topSkills"
              :key="skill"
              class="guild-skill-overview-item__skill"
            >
              {{ skill }}
            </span>
            <span
              v-if="member.topSkills.length === 0"
              class="guild-skill-overview-item__skill guild-skill-overview-item__skill--empty"
            >
              まだスキル未登録です
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.guild-search-grid {
  display: grid;
  gap: 14px;
}

.guild-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.guild-panel-header__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-panel-header__subtitle {
  margin-top: 4px;
  color: #64748b;
  line-height: 1.5;
}

.guild-panel-note {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  line-height: 1.7;
}

.guild-search-panel__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.guild-search-panel__summary-button {
  min-height: 48px;
  padding-inline: 18px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(191, 219, 254, 0.92);
  background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: guild-summary-button-pulse 2s ease-in-out infinite,
    guild-summary-button-float 2s ease-in-out infinite;
}

.guild-search-panel__summary-button :deep(.p-button-label) {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.guild-search-panel__summary-button :deep(.p-button-icon) {
  animation: guild-summary-button-icon-nudge 1.2s ease-in-out infinite;
}

.guild-search-panel__summary-button::after {
  content: '';
  position: absolute;
  inset: -20%;
  z-index: 0;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0.38) 48%,
    rgba(255, 255, 255, 0) 66%
  );
  transform: translateX(-180%) skewX(-18deg);
  animation: guild-summary-button-shine 2.4s ease-in-out infinite;
  pointer-events: none;
}

.guild-search-panel__summary-button :deep(.p-button-label),
.guild-search-panel__summary-button :deep(.p-button-icon) {
  position: relative;
  z-index: 1;
}

.guild-search-panel__summary-button:hover,
.guild-search-panel__summary-button:focus-visible {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 18px 36px rgba(59, 130, 246, 0.26);
}

.guild-search-panel__summary-button:active {
  transform: scale(0.98);
}

.guild-detail-card__substate {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 16px 0;
}

.guild-skill-overview-list {
  display: grid;
  gap: 12px;
}

.guild-skill-overview-item {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
}

.guild-skill-overview-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.guild-skill-overview-item__edit {
  white-space: nowrap;
  flex-shrink: 0;
}

.guild-skill-overview-item__name {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-skill-overview-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.guild-skill-overview-item__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 10px;
}

.guild-skill-overview-item__stat {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.guild-skill-overview-item__stat span {
  font-size: 0.82rem;
  color: #64748b;
}

.guild-skill-overview-item__stat strong {
  font-size: 1rem;
  color: #1f2937;
}

.guild-skill-overview-item__progress {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.guild-skill-overview-item__progress-head,
.guild-skill-overview-item__progress-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.guild-skill-overview-item__progress-head span,
.guild-skill-overview-item__progress-note {
  font-size: 0.82rem;
  color: #64748b;
}

.guild-skill-overview-item__progress-head strong {
  font-size: 0.95rem;
  color: #0f172a;
}

.guild-skill-overview-item__progress-track {
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.guild-skill-overview-item__progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
}

.guild-skill-overview-item__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guild-skill-overview-item__skill {
  padding: 6px 10px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #dbe4f0;
  color: #475569;
  font-size: 0.84rem;
}

.guild-skill-overview-item__skill--empty {
  border-style: dashed;
}

.guild-search-toolbar {
  margin-bottom: 14px;
}

.guild-search-toolbar__clear {
  width: 100%;
}

.guild-search-table__member,
.guild-search-table__skill {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guild-search-table__member-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.guild-search-table__member-name,
.guild-search-table__skill-name {
  font-weight: 700;
  color: #1f2937;
}

.guild-search-table__skill {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.guild-search-table__skill-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid #dbe4f0;
  background: #f8fafc;
}

.guild-search-table__skill-meta {
  font-size: 0.82rem;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.guild-skill-mobile-list {
  display: none;
}

.guild-skill-mobile-item {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
}

.guild-skill-mobile-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.guild-skill-mobile-item__summary {
  display: grid;
  gap: 8px;
}

.guild-skill-mobile-item__skill-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.guild-skill-mobile-item__image {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid #dbe4f0;
  background: #ffffff;
  flex-shrink: 0;
}

.guild-skill-mobile-item__skill {
  font-weight: 700;
  color: #1f2937;
}

.guild-skill-mobile-item__meta {
  margin-top: 4px;
  font-size: 0.84rem;
  color: #64748b;
}

.guild-skill-mobile-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guild-skill-mobile-item__details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  font-size: 0.8rem;
  color: #64748b;
}

.guild-skill-mobile-item__details span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #e2e8f0;
}

@keyframes guild-summary-button-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0),
      0 12px 26px rgba(15, 23, 42, 0.14);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(96, 165, 250, 0.24),
      0 18px 34px rgba(59, 130, 246, 0.24);
  }
}

@keyframes guild-summary-button-icon-nudge {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }

  50% {
    transform: translateX(4px) scale(1.08);
  }
}

@keyframes guild-summary-button-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes guild-summary-button-shine {
  0%,
  100% {
    transform: translateX(-180%) skewX(-18deg);
    opacity: 0;
  }

  18% {
    opacity: 0;
  }

  42% {
    opacity: 1;
  }

  60% {
    transform: translateX(180%) skewX(-18deg);
    opacity: 0;
  }
}

@media (max-width: 1023px) {
  .guild-search-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .guild-skill-overview-item__head {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .guild-search-panel__actions {
    align-items: stretch;
  }

  .guild-search-panel__summary-button {
    width: 100%;
    justify-content: center;
  }

  .guild-search-toolbar {
    grid-template-columns: 1fr;
  }

  .guild-search-table-shell {
    display: none;
  }

  .guild-skill-mobile-list {
    display: grid;
    gap: 12px;
  }

  :deep(.guild-skill-overview-dialog) {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    border-radius: 0;
  }

  :deep(.guild-skill-overview-dialog .p-dialog-header) {
    padding: 16px 16px 12px;
    align-items: flex-start;
  }

  :deep(.guild-skill-overview-dialog .p-dialog-content) {
    padding: 0 16px max(20px, env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .guild-search-panel__summary-button,
  .guild-search-panel__summary-button :deep(.p-button-icon),
  .guild-search-panel__summary-button::after {
    animation: none;
  }

  .guild-search-panel__summary-button {
    transition: none;
  }
}
</style>
