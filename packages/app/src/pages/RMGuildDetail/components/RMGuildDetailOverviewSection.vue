<script setup lang="ts">
import Panel from 'primevue/panel'
import type { Guild } from '@rm/types'

type SummaryItem = {
  label: string
  value: string
  icon: string
  tone: string
}

defineProps<{
  guildDetail: Guild
  canManageGuildMembers: boolean
  managerGuide: string
  guildFoundingDateLabel: string
  summaryItems: SummaryItem[]
}>()
</script>

<template>
  <div class="guild-detail-hero">
    <div
      class="guild-detail-card__notice"
      :class="{
        'guild-detail-card__notice--manager': canManageGuildMembers,
      }"
    >
      {{
        canManageGuildMembers
          ? managerGuide
          : 'この画面は閲覧専用です。メンバー承認・権限変更・ギルド編集は Guild Admin 以上が実行できます。'
      }}
    </div>

    <div class="guild-summary-grid">
      <div
        v-for="item in summaryItems"
        :key="item.label"
        class="guild-summary-card"
        :class="`guild-summary-card--${item.tone}`"
      >
        <div class="guild-summary-card__icon">
          <i :class="item.icon" />
        </div>
        <div class="guild-summary-card__body">
          <div class="guild-summary-card__label">{{ item.label }}</div>
          <div class="guild-summary-card__value">{{ item.value }}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="guild-detail-overview-grid">
    <Panel class="guild-overview-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">ギルド概要</div>
            <div class="guild-panel-header__subtitle">
              運営に必要な基本情報を一覧で確認できます。
            </div>
          </div>
        </div>
      </template>
      <div class="guild-detail-grid">
        <div class="guild-detail-field guild-detail-field--memo">
          <div class="guild-detail-label">ギルド説明</div>
          <div class="guild-detail-value guild-detail-value--memo">
            {{ guildDetail.guildMemo || '説明なし' }}
          </div>
        </div>
        <div class="guild-detail-field">
          <div class="guild-detail-label">状況</div>
          <div class="guild-detail-value">
            {{ guildDetail.situation || '不明' }}
          </div>
        </div>
        <div class="guild-detail-field">
          <div class="guild-detail-label">創設日</div>
          <div class="guild-detail-value">
            {{ guildFoundingDateLabel }}
          </div>
        </div>
        <div class="guild-detail-field">
          <div class="guild-detail-label">ゲーム内ギルドID</div>
          <div class="guild-detail-value">
            {{ guildDetail.guildIdInGame || '未登録' }}
          </div>
        </div>
        <div class="guild-detail-field">
          <div class="guild-detail-label">公式メンバー数</div>
          <div class="guild-detail-value">
            {{ guildDetail.officialMembers }}人
          </div>
        </div>
      </div>
    </Panel>

    <Panel class="guild-overview-panel">
      <template #header>
        <div class="guild-panel-header">
          <div>
            <div class="guild-panel-header__title">スキル検索の使い方</div>
            <div class="guild-panel-header__subtitle">
              最優先要件のスキル横断検索を使いやすくまとめています。
            </div>
          </div>
        </div>
      </template>
      <div class="guild-operations">
        <div class="guild-operations__item">
          <div class="guild-operations__title">リアクティブ検索</div>
          <p class="guild-operations__text">
            スキル名は 1
            文字入力するごとに即時反映されます。自然属性と装備種別で絞り込みながら、攻撃属性とスキル種別も一覧で確認できます。
          </p>
        </div>
        <div class="guild-operations__item">
          <div class="guild-operations__title">メンバー概要</div>
          <p class="guild-operations__text">
            「メンバー別スキル状況を確認」ボタンから、所持数、解放率、武器熟練度の入力進捗率、大瓶解放率をポップアップでまとめて確認できます。
          </p>
        </div>
        <div class="guild-operations__item">
          <div class="guild-operations__title">管理モード</div>
          <p class="guild-operations__text">
            承認済みメンバーごとに、所持スキルと武器熟練度の管理画面を開けます。
          </p>
        </div>
      </div>
    </Panel>
  </div>
</template>

<style lang="scss" scoped>
.guild-detail-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guild-detail-card__notice {
  padding: 12px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #dbe4f0;
  color: #475569;
}

.guild-detail-card__notice--manager {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.guild-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.guild-summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.96),
    rgba(248, 250, 252, 0.92)
  );
}

.guild-summary-card__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(75, 105, 130, 0.12);
  color: var(--rm-primary);
  font-size: 1.2rem;
}

.guild-summary-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guild-summary-card__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
}

.guild-summary-card__value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-summary-card--approved {
  border-color: #bbf7d0;
}

.guild-summary-card--pending {
  border-color: #fde68a;
}

.guild-summary-card--skills {
  border-color: #bfdbfe;
}

.guild-summary-card--unlock {
  border-color: #c4b5fd;
}

.guild-summary-card--progress {
  border-color: #93c5fd;
}

.guild-detail-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.guild-overview-panel {
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

.guild-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.guild-detail-field {
  padding: 12px 13px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.guild-detail-field--memo {
  grid-column: 1 / -1;
}

.guild-detail-label {
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.guild-detail-value {
  color: #1f2937;
  line-height: 1.7;
}

.guild-detail-value--memo {
  min-height: 64px;
}

.guild-operations {
  display: grid;
  gap: 12px;
}

.guild-operations__item {
  padding: 12px 13px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.guild-operations__title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-operations__text {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.7;
}
</style>
