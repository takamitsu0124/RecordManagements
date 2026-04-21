<script setup lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import type { AppRole } from '@rm/types'
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
    attr: { value: string | null; matchMode: string }
    type: { value: string | null; matchMode: string }
    level: { value: number | null; matchMode: string }
  }
  attrOptions: Array<{ label: string; value: string }>
  typeOptions: Array<{ label: string; value: string }>
  searchGuide: string
  roleSeverity: (role: AppRole) => string
  attrSeverity: (attr: string) => string
}>()

const emit = defineEmits<{
  (
    e: 'update:skillTableFilters',
    value: {
      skillName: { value: string; matchMode: string }
      attr: { value: string | null; matchMode: string }
      type: { value: string | null; matchMode: string }
      level: { value: number | null; matchMode: string }
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

const updateAttrFilter = (value: string | null) =>
  updateSkillTableFilters({
    attr: {
      ...props.skillTableFilters.attr,
      value,
    },
  })

const updateTypeFilter = (value: string | null) =>
  updateSkillTableFilters({
    type: {
      ...props.skillTableFilters.type,
      value,
    },
  })

const updateLevelFilter = (value: number | null) =>
  updateSkillTableFilters({
    level: {
      ...props.skillTableFilters.level,
      value,
    },
  })
</script>

<template>
  <div class="guild-search-grid">
    <Panel class="guild-skill-overview-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">メンバー別スキル状況</div>
            <div class="guild-panel-header__subtitle">
              所持数と解放率を見ながら、誰を深掘りするか判断できます。
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
    </Panel>

    <Panel class="guild-search-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">スキル検索</div>
            <div class="guild-panel-header__subtitle">
              スキル名、属性、種別、熟練度を組み合わせて絞り込めます。
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
          placeholder="スキル名・ID・メンバー名で検索"
          @update:modelValue="updateSkillNameFilter"
        />
        <Dropdown
          :modelValue="skillTableFilters.attr.value"
          :options="attrOptions"
          optionLabel="label"
          optionValue="value"
          showClear
          placeholder="属性"
          @update:modelValue="updateAttrFilter"
        />
        <Dropdown
          :modelValue="skillTableFilters.type.value"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          showClear
          filter
          placeholder="種別"
          @update:modelValue="updateTypeFilter"
        />
        <InputNumber
          :modelValue="skillTableFilters.level.value"
          :min="0"
          :useGrouping="false"
          placeholder="熟練度以上"
          @update:modelValue="updateLevelFilter"
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
            :sortField="'level'"
            :sortOrder="-1"
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
                      {{ data.skillName }}
                    </div>
                    <div class="guild-search-table__skill-meta">
                      ID: {{ data.skillId }}
                    </div>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="attr" header="属性" style="width: 110px">
              <template #body="{ data }">
                <Tag :value="data.attr" :severity="attrSeverity(data.attr)" />
              </template>
            </Column>
            <Column field="type" header="種別" style="min-width: 180px" />
            <Column field="level" header="熟練度" style="width: 120px">
              <template #body="{ data }">
                <Tag :value="`Lv.${data.level}`" severity="contrast" />
              </template>
            </Column>
            <Column
              field="unlockRateText"
              header="解放率"
              style="width: 120px"
            />
            <Column field="ownedCount" header="所持数" style="width: 100px" />
          </DataTable>
        </div>

        <div class="guild-skill-mobile-list">
          <div
            v-for="row in filteredGuildSkillRows"
            :key="row.rowId"
            class="guild-skill-mobile-item"
          >
            <div class="guild-skill-mobile-item__head">
              <div>
                <div class="guild-skill-mobile-item__skill">
                  {{ row.skillName }}
                </div>
                <div class="guild-skill-mobile-item__meta">
                  {{ row.userName }} / {{ row.type }}
                </div>
              </div>
              <Tag :value="`Lv.${row.level}`" severity="contrast" />
            </div>
            <div class="guild-skill-mobile-item__tags">
              <Tag :value="row.attr" :severity="attrSeverity(row.attr)" />
              <Tag
                :value="roleLabels[row.role]"
                :severity="roleSeverity(row.role)"
              />
              <Tag :value="`解放率 ${row.unlockRateText}`" severity="info" />
            </div>
          </div>
        </div>
      </template>
    </Panel>
  </div>
</template>

<style lang="scss" scoped>
.guild-search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  align-items: start;
}

.guild-skill-overview-panel,
.guild-search-panel {
  height: 100%;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

@media (max-width: 1023px) {
  .guild-skill-overview-item__head {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .guild-search-table-shell {
    display: none;
  }

  .guild-skill-mobile-list {
    display: grid;
    gap: 12px;
  }
}
</style>
