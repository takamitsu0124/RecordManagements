<script setup lang="ts">
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import type { AppRole } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import type { GuildUserRow } from '../types'

const props = defineProps<{
  approvedMembers: GuildUserRow[]
  pendingMembers: GuildUserRow[]
  isEditMode: boolean
  canManageGuildMembers: boolean
  isMemberLoading: boolean
  currentUserId: string
  roleDrafts: Record<string, AppRole>
  roleOptions: Array<{ label: string; value: AppRole }>
  roleLabels: Record<AppRole, string>
  canChangeRole: (member: GuildUserRow) => boolean
  roleSeverity: (role: AppRole) => string
}>()

const emit = defineEmits<{
  (e: 'update:roleDrafts', value: Record<string, AppRole>): void
  (e: 'edit-member', member: GuildUserRow): void
  (e: 'save-role', member: GuildUserRow): void
  (e: 'revoke-approval', member: GuildUserRow): void
  (e: 'approve-member', member: GuildUserRow): void
}>()

const updateRoleDraft = (uid: string, role: AppRole | null) => {
  if (!role) return

  emit('update:roleDrafts', {
    ...props.roleDrafts,
    [uid]: role,
  })
}
</script>

<template>
  <div class="guild-member-sections">
    <Panel class="guild-members-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">承認済みメンバー運用</div>
            <div class="guild-panel-header__subtitle">
              ロール管理と承認解除をここから行えます。
            </div>
          </div>
          <Tag
            :value="`${approvedMembers.length}人`"
            severity="success"
            class="guild-panel-header__tag"
          />
        </div>
      </template>
      <div class="guild-panel-note">
        管理モード中は、各メンバーのスキル・熟練度管理画面を開けます。
      </div>
      <div v-if="approvedMembers.length > 0" class="guild-member-list">
        <div
          v-for="member in approvedMembers"
          :key="member.uid"
          class="guild-member-item"
          :class="{ 'guild-member-item--editable': isEditMode }"
        >
          <div class="guild-member-item__main">
            <div class="guild-member-item__identity">
              <div class="guild-member-item__icon">
                <RMIcon name="person" />
              </div>
              <div class="guild-member-item__body">
                <div class="guild-member-item__head">
                  <div class="guild-member-item__name">
                    {{ member.displayName }}
                  </div>
                  <div class="guild-member-item__meta">
                    <Tag value="承認済み" severity="success" />
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
                <div class="guild-member-item__subtext">
                  {{
                    isEditMode && canManageGuildMembers
                      ? '管理モード中は、このメンバーのスキル・熟練度管理画面へ進めます。'
                      : '承認済みメンバーとして運用対象に含まれています。'
                  }}
                </div>
              </div>
            </div>
            <Button
              v-if="isEditMode && canManageGuildMembers"
              label="スキル・熟練度を編集"
              outlined
              severity="contrast"
              class="guild-member-item__link"
              @click="emit('edit-member', member)"
            />
          </div>

          <div
            v-if="canManageGuildMembers"
            class="guild-member-item__management"
          >
            <Dropdown
              :modelValue="roleDrafts[member.uid]"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="ロールを選択"
              class="guild-member-item__dropdown"
              :disabled="!canChangeRole(member)"
              @update:modelValue="updateRoleDraft(member.uid, $event)"
            />
            <RMButton
              label="権限を保存"
              color="primary"
              width="140px"
              :isDisable="
                !canChangeRole(member) || roleDrafts[member.uid] === member.role
              "
              @click="emit('save-role', member)"
            />
            <RMButton
              label="承認解除"
              flat
              color="grey"
              width="120px"
              @click="emit('revoke-approval', member)"
            />
          </div>
        </div>
      </div>
      <RMEmptyState
        v-else
        icon="pi pi-user-minus"
        title="承認済みメンバーがいません"
        message="guildMember に追加されると、この一覧に表示されます。"
      />
    </Panel>

    <Panel v-if="canManageGuildMembers" class="guild-members-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">承認待ちメンバー</div>
            <div class="guild-panel-header__subtitle">
              users.guildId はあるが guildMember に未登録のユーザーです。
            </div>
          </div>
          <Tag
            :value="`${pendingMembers.length}人`"
            severity="warn"
            class="guild-panel-header__tag"
          />
        </div>
      </template>
      <div v-if="isMemberLoading" class="guild-detail-card__substate">
        <ProgressSpinner strokeWidth="5" style="width: 40px; height: 40px" />
        <p class="rm-muted">承認待ちメンバーを読み込み中...</p>
      </div>
      <div v-else-if="pendingMembers.length > 0" class="guild-member-list">
        <div
          v-for="member in pendingMembers"
          :key="member.uid"
          class="guild-member-item guild-member-item--pending"
        >
          <div class="guild-member-item__main">
            <div class="guild-member-item__identity">
              <div
                class="guild-member-item__icon guild-member-item__icon--pending"
              >
                <RMIcon name="pending" />
              </div>
              <div class="guild-member-item__body">
                <div class="guild-member-item__head">
                  <div class="guild-member-item__name">
                    {{ member.displayName }}
                  </div>
                  <div class="guild-member-item__meta">
                    <Tag value="承認待ち" severity="warn" />
                    <Tag
                      :value="roleLabels[member.role]"
                      :severity="roleSeverity(member.role)"
                    />
                  </div>
                </div>
                <div class="guild-member-item__subtext">
                  ロールを確認してから承認すると、そのまま運用対象に追加されます。
                </div>
              </div>
            </div>
          </div>

          <div class="guild-member-item__management">
            <Dropdown
              :modelValue="roleDrafts[member.uid]"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="ロールを選択"
              class="guild-member-item__dropdown"
              :disabled="!canChangeRole(member)"
              @update:modelValue="updateRoleDraft(member.uid, $event)"
            />
            <RMButton
              label="権限を保存"
              color="primary"
              width="140px"
              :isDisable="
                !canChangeRole(member) || roleDrafts[member.uid] === member.role
              "
              @click="emit('save-role', member)"
            />
            <RMButton
              label="承認"
              color="primary"
              width="120px"
              @click="emit('approve-member', member)"
            />
          </div>
        </div>
      </div>
      <RMEmptyState
        v-else
        icon="pi pi-check-circle"
        title="承認待ちメンバーはいません"
        message="新しく同じ guildId を持つユーザーが作成されると、ここに表示されます。"
      />
    </Panel>
  </div>
</template>

<style lang="scss" scoped>
.guild-member-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.guild-members-panel {
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

.guild-member-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.guild-member-item {
  display: grid;
  gap: 14px;
  padding: 13px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
  text-align: left;
}

.guild-member-item--pending {
  background: rgba(255, 251, 235, 0.96);
  border-color: #fcd34d;
}

.guild-member-item--editable {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.guild-member-item--editable:hover,
.guild-member-item--pending:hover {
  transform: translateY(-1px);
  border-color: #a1c2e1;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
}

.guild-member-item__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.guild-member-item__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.guild-member-item__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 14px;
  background: #e2e8f0;
  color: #475569;
}

.guild-member-item__icon--pending {
  background: #fef3c7;
  color: #92400e;
}

.guild-member-item__body {
  flex: 1;
  min-width: 0;
}

.guild-member-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.guild-member-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guild-member-item__name {
  font-weight: 700;
  color: #1f2937;
}

.guild-member-item__subtext {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.6;
}

.guild-member-item__link {
  flex: 0 0 auto;
  min-width: 120px;
}

.guild-member-item__management {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
}

.guild-member-item__dropdown {
  width: min(240px, 100%);
}

@media (max-width: 1023px) {
  .guild-member-item__main {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .guild-member-list {
    grid-template-columns: 1fr;
  }

  .guild-member-item__identity,
  .guild-member-item__link,
  .guild-member-item__dropdown {
    width: 100%;
  }

  .guild-member-item__management {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
