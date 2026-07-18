<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import {
  normalizeWeaponProficiencySkillProgress,
  summarizeWeaponProficiencySkillUnlockRate,
  weaponProficiencySkillMasterRows,
  weaponProficiencySkillWeaponDefinitions
} from '@rm/types'
import type {
  WeaponProficiencySkillMasterRow,
  WeaponProficiencySkillProgress,
  WeaponProficiencySkillWeaponKey
} from '@rm/types'
import { notifyError } from 'src/composables/useAppNotifications'
import RMSectionEdit from 'src/components/RMSectionEdit/RMSectionEdit.vue'
import RMConfirmDialog from 'src/components/RMConfirmDialog/RMConfirmDialog.vue'

const props = defineProps<{
  progress: WeaponProficiencySkillProgress
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:progress', value: WeaponProficiencySkillProgress): void
  (e: 'update:editing', value: boolean): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const selectedWeaponKey = ref<WeaponProficiencySkillWeaponKey>('sword')
const pendingAction = ref<{
  type: 'unlock' | 'lock'
  row: WeaponProficiencySkillMasterRow
  index: number
} | null>(null)

const weaponOptions = weaponProficiencySkillWeaponDefinitions.map(
  ({ key, label }) => ({
    label,
    value: key
  })
)

const selectedWeaponDefinition = computed(
  () =>
    weaponProficiencySkillWeaponDefinitions.find(
      ({ key }) => key === selectedWeaponKey.value
    ) ?? weaponProficiencySkillWeaponDefinitions[0]
)

const selectedWeaponRows = computed(() =>
  weaponProficiencySkillMasterRows.filter(
    (row) => row.weaponKey === selectedWeaponKey.value
  )
)

const selectedWeaponRowById = computed(
  () => new Map(selectedWeaponRows.value.map((row) => [row.id, row]))
)

const normalizedProgress = computed(() =>
  normalizeWeaponProficiencySkillProgress(props.progress)
)

const overallSummary = computed(() =>
  summarizeWeaponProficiencySkillUnlockRate(
    normalizedProgress.value,
    weaponProficiencySkillMasterRows
  )
)

const selectedWeaponSummary = computed(
  () => overallSummary.value.byWeapon[selectedWeaponKey.value]
)

const formatSkillRowTitle = (row: WeaponProficiencySkillMasterRow) =>
  row.skillName || `Lv.${row.requiredLevel}`

const cloneProgress = (
  payload: WeaponProficiencySkillProgress
): WeaponProficiencySkillProgress => {
  const normalized = normalizeWeaponProficiencySkillProgress(payload)

  return Object.fromEntries(
    weaponProficiencySkillWeaponDefinitions.map(({ key }) => [
      key,
      Object.fromEntries(
        Object.entries(normalized[key]).map(([rowId, values]) => [
          rowId,
          [...values]
        ])
      )
    ])
  ) as WeaponProficiencySkillProgress
}

const getRowProgress = (row: WeaponProficiencySkillMasterRow) => {
  const stored = normalizedProgress.value[row.weaponKey][row.id] ?? []
  return Array.from(
    { length: row.values.length },
    (_, index) => stored[index] === true
  )
}

const ensureRowProgress = (
  progress: WeaponProficiencySkillProgress,
  weaponKey: WeaponProficiencySkillWeaponKey,
  rowId: string,
  length: number
) => {
  const stored = progress[weaponKey][rowId] ?? []
  const nextValues = Array.from(
    { length },
    (_, index) => stored[index] === true
  )
  progress[weaponKey][rowId] = nextValues
  return nextValues
}

const canToggleStep = (rowId: string, index: number) => {
  if (!props.editing) return false

  const row = selectedWeaponRowById.value.get(rowId)
  if (!row) return false

  const rowProgress = getRowProgress(row)
  if (rowProgress[index]) return true
  if (index === 0) return true

  return rowProgress[index - 1] === true
}

const countUnlockedSteps = (row: WeaponProficiencySkillMasterRow) =>
  getRowProgress(row).filter(Boolean).length

const openConfirmDialog = (
  row: WeaponProficiencySkillMasterRow,
  index: number,
  type: 'unlock' | 'lock'
) => {
  pendingAction.value = { type, row, index }
}

const unlockStep = (row: WeaponProficiencySkillMasterRow, index: number) => {
  if (!canToggleStep(row.id, index)) {
    void notifyError('前の段階から順番に登録してください。')
    return
  }

  openConfirmDialog(row, index, 'unlock')
}

const lockStep = (row: WeaponProficiencySkillMasterRow, index: number) => {
  openConfirmDialog(row, index, 'lock')
}

const requestStepToggle = (
  row: WeaponProficiencySkillMasterRow,
  index: number
) => {
  if (getRowProgress(row)[index]) {
    lockStep(row, index)
    return
  }

  unlockStep(row, index)
}

const requestSheetToggle = (
  row: WeaponProficiencySkillMasterRow,
  index: number,
  nextValue: boolean
) => {
  if (nextValue) {
    unlockStep(row, index)
    return
  }

  lockStep(row, index)
}

const applyUnlock = (row: WeaponProficiencySkillMasterRow, index: number) => {
  const next = cloneProgress(props.progress)
  const rowProgress = ensureRowProgress(
    next,
    row.weaponKey,
    row.id,
    row.values.length
  )
  rowProgress[index] = true
  emit('update:progress', normalizeWeaponProficiencySkillProgress(next))
}

const applyLock = (row: WeaponProficiencySkillMasterRow, index: number) => {
  const next = cloneProgress(props.progress)
  const rowProgress = ensureRowProgress(
    next,
    row.weaponKey,
    row.id,
    row.values.length
  )

  for (
    let currentIndex = index;
    currentIndex < rowProgress.length;
    currentIndex += 1
  ) {
    rowProgress[currentIndex] = false
  }

  emit('update:progress', normalizeWeaponProficiencySkillProgress(next))
}

const applyPendingAction = () => {
  if (!pendingAction.value) return

  const { row, index, type } = pendingAction.value
  if (type === 'unlock') applyUnlock(row, index)
  else applyLock(row, index)

  pendingAction.value = null
}

const pendingActionMessage = computed(() => {
  if (!pendingAction.value) return ''

  const { row, index, type } = pendingAction.value
  const label = `${row.weaponType} / ${formatSkillRowTitle(row)}`

  if (type === 'unlock') {
    return `「${label}」の ${index + 1}段階目（大瓶 ${
      row.values[index]
    }個）は解放済みですか？ 解放済みであれば登録します。`
  }

  return `「${label}」の ${index + 1}段階目以降を解除しますか？`
})

// 一括登録モード: スキルの所持チェックと同様、タップごとの確認ポップアップを出さず、
// 選択後にまとめて1回だけ確認して登録する。
const isBulkMode = ref(false)
const bulkSelection = ref<Set<string>>(new Set())
const isBulkConfirmVisible = ref(false)

const bulkKey = (
  weaponKey: WeaponProficiencySkillWeaponKey,
  rowId: string,
  index: number
) => `${weaponKey}::${rowId}::${index}`

const isBulkSelected = (row: WeaponProficiencySkillMasterRow, index: number) =>
  bulkSelection.value.has(bulkKey(row.weaponKey, row.id, index))

const bulkSelectionCount = computed(() => bulkSelection.value.size)

const canBulkSelectStep = (
  row: WeaponProficiencySkillMasterRow,
  index: number
) => {
  const rowProgress = getRowProgress(row)
  if (rowProgress[index]) return false
  if (index === 0) return true
  if (rowProgress[index - 1]) return true

  return isBulkSelected(row, index - 1)
}

const toggleBulkSelection = (
  row: WeaponProficiencySkillMasterRow,
  index: number
) => {
  const next = new Set(bulkSelection.value)
  const key = bulkKey(row.weaponKey, row.id, index)

  if (next.has(key)) {
    for (let i = index; i < row.values.length; i += 1) {
      next.delete(bulkKey(row.weaponKey, row.id, i))
    }
  } else {
    if (!canBulkSelectStep(row, index)) return
    next.add(key)
  }

  bulkSelection.value = next
}

const enterBulkMode = () => {
  isBulkMode.value = true
}

const exitBulkMode = () => {
  isBulkMode.value = false
  bulkSelection.value = new Set()
}

const openBulkConfirm = () => {
  if (bulkSelectionCount.value === 0) return
  isBulkConfirmVisible.value = true
}

const bulkConfirmMessage = computed(
  () => `選択した ${bulkSelectionCount.value}件の段階を登録します。よろしいですか？`
)

const applyBulkSelection = () => {
  const next = cloneProgress(props.progress)

  for (const key of bulkSelection.value) {
    const [weaponKey, rowId, indexText] = key.split('::') as [
      WeaponProficiencySkillWeaponKey,
      string,
      string
    ]
    const row = weaponProficiencySkillMasterRows.find(
      (candidate) =>
        candidate.weaponKey === weaponKey && candidate.id === rowId
    )
    if (!row) continue

    const rowProgress = ensureRowProgress(next, weaponKey, rowId, row.values.length)
    rowProgress[Number(indexText)] = true
  }

  emit('update:progress', normalizeWeaponProficiencySkillProgress(next))
  isBulkConfirmVisible.value = false
  exitBulkMode()
}

watch(
  () => props.editing,
  (next) => {
    if (!next) exitBulkMode()
  }
)
</script>

<template>
  <Card class="proficiency-skill-card">
    <template #content>
      <div class="proficiency-skill">
        <div class="proficiency-skill__toolbar">
          <div class="proficiency-skill__field">
            <label class="proficiency-skill__field-label">武器種</label>
            <Dropdown
              v-model="selectedWeaponKey"
              :options="weaponOptions"
              optionLabel="label"
              optionValue="value"
              class="proficiency-skill__weapon-select"
            />
          </div>

          <div class="proficiency-skill__summary-grid">
            <div class="proficiency-skill__summary-card">
              <span>全体解放率</span>
              <strong>{{ overallSummary.unlockRate.toFixed(1) }}%</strong>
              <div class="proficiency-skill__summary-note">
                登録済み {{ overallSummary.unlockedCount }} /
                {{ overallSummary.totalCount }}
              </div>
              <div class="proficiency-skill__summary-note">
                残り大瓶
                {{ overallSummary.remainingBottleCount.toLocaleString() }}個
              </div>
              <div class="proficiency-skill__progress-track" aria-hidden="true">
                <div
                  class="proficiency-skill__progress-bar"
                  :style="{ width: `${overallSummary.unlockRate}%` }"
                />
              </div>
            </div>

            <div class="proficiency-skill__summary-card">
              <span>{{ selectedWeaponDefinition.label }}</span>
              <strong>{{ selectedWeaponSummary.unlockRate.toFixed(1) }}%</strong>
              <div class="proficiency-skill__summary-note">
                登録済み {{ selectedWeaponSummary.unlockedCount }} /
                {{ selectedWeaponSummary.totalCount }}
              </div>
              <div class="proficiency-skill__summary-note">
                残り大瓶
                {{
                  selectedWeaponSummary.remainingBottleCount.toLocaleString()
                }}個
              </div>
              <div class="proficiency-skill__progress-track" aria-hidden="true">
                <div
                  class="proficiency-skill__progress-bar"
                  :style="{ width: `${selectedWeaponSummary.unlockRate}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="selectedWeaponRows.length === 0"
          class="proficiency-skill__empty-state"
        >
          この武器の熟練度スキル定義は未設定です。
        </div>

        <RMSectionEdit
          v-else
          :editing="editing"
          :canEdit="true"
          title="段階登録"
          @update:editing="(value) => emit('update:editing', value)"
          @cancel="emit('cancel')"
          @save="emit('save')"
        >
          <template #footer-extra>
            <div v-if="isBulkMode" class="proficiency-skill-bulk-bar">
              <span class="proficiency-skill-bulk-bar__count">
                {{ bulkSelectionCount }}件選択中
              </span>
              <Button
                type="button"
                label="まとめて登録する"
                size="small"
                :disabled="bulkSelectionCount === 0"
                @click="openBulkConfirm"
              />
            </div>
          </template>

          <template #view>
            <div class="proficiency-skill-mobile">
              <div
                v-for="row in selectedWeaponRows"
                :key="row.id"
                class="proficiency-skill-mobile__card"
              >
                <div class="proficiency-skill-mobile__head">
                  <div>
                    <div class="proficiency-skill-mobile__title">
                      {{ formatSkillRowTitle(row) }}
                    </div>
                    <div class="proficiency-skill-mobile__meta">
                      {{ row.weaponType }} / 必要Lv {{ row.requiredLevel }}
                    </div>
                  </div>
                  <Tag
                    :value="`${countUnlockedSteps(row)} / ${row.values.length}`"
                    severity="info"
                  />
                </div>
              </div>
            </div>
          </template>

          <template #edit>
        <div class="proficiency-skill__mode-toolbar">
          <div class="proficiency-skill__mode-note">
            <template v-if="isBulkMode">
              タップして選択し、まとめて登録できます。連続する段階のみ選択できます。
            </template>
            <template v-else>
              未登録の次段階は、直前の段階を登録すると選べるようになります。
            </template>
          </div>
          <Button
            v-if="!isBulkMode"
            type="button"
            label="一括登録モード"
            icon="pi pi-check-square"
            size="small"
            class="proficiency-skill__bulk-mode-button"
            @click="enterBulkMode"
          />
          <Button
            v-else
            type="button"
            label="通常モードに戻る"
            text
            size="small"
            severity="secondary"
            @click="exitBulkMode"
          />
        </div>

          <div class="proficiency-skill-mobile">
            <div
              v-for="row in selectedWeaponRows"
              :key="row.id"
              class="proficiency-skill-mobile__card"
            >
              <div class="proficiency-skill-mobile__head">
                <div>
                  <div class="proficiency-skill-mobile__title">
                    {{ formatSkillRowTitle(row) }}
                  </div>
                  <div class="proficiency-skill-mobile__meta">
                    {{ row.weaponType }} / 必要Lv {{ row.requiredLevel }}
                  </div>
                </div>
                <Tag
                  :value="`${countUnlockedSteps(row)} / ${row.values.length}`"
                  severity="info"
                />
              </div>

              <div class="proficiency-skill-mobile__steps">
                <button
                  v-for="(value, index) in row.values"
                  :key="`${row.id}-${index}`"
                  type="button"
                  class="proficiency-skill-step"
                  :class="{
                    'proficiency-skill-step--active':
                      getRowProgress(row)[index],
                    'proficiency-skill-step--bulk-selected':
                      isBulkMode &&
                      !getRowProgress(row)[index] &&
                      isBulkSelected(row, index),
                    'proficiency-skill-step--locked': isBulkMode
                      ? !getRowProgress(row)[index] &&
                        !isBulkSelected(row, index) &&
                        !canBulkSelectStep(row, index)
                      : !getRowProgress(row)[index] &&
                        !canToggleStep(row.id, index),
                  }"
                  :disabled="
                    isBulkMode
                      ? getRowProgress(row)[index] ||
                        (!isBulkSelected(row, index) &&
                          !canBulkSelectStep(row, index))
                      : !getRowProgress(row)[index] &&
                        !canToggleStep(row.id, index)
                  "
                  @click="
                    isBulkMode
                      ? toggleBulkSelection(row, index)
                      : requestStepToggle(row, index)
                  "
                >
                  <span>{{ index + 1 }}段階目</span>
                  <strong>大瓶 {{ value }}</strong>
                </button>
              </div>
            </div>
          </div>

          <div class="proficiency-skill-sheet rm-mobile-scroll">
            <table class="proficiency-skill-sheet__table">
              <thead>
                <tr>
                  <th>必要Lv</th>
                  <th>スキル名</th>
                  <th
                    v-for="(_, index) in selectedWeaponRows[0]?.values ?? []"
                    :key="`head-${index}`"
                  >
                    {{ index + 1 }}段階目
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedWeaponRows" :key="row.id">
                  <td class="proficiency-skill-sheet__level">
                    Lv.{{ row.requiredLevel }}
                  </td>
                  <td class="proficiency-skill-sheet__skill">
                    <div class="proficiency-skill-sheet__skill-title">
                      {{ formatSkillRowTitle(row) }}
                    </div>
                    <div class="proficiency-skill-sheet__skill-meta">
                      {{ row.weaponType }}
                    </div>
                  </td>
                  <td
                    v-for="(value, index) in row.values"
                    :key="`${row.id}-${index}`"
                    class="proficiency-skill-sheet__cell"
                    :class="{
                      'proficiency-skill-sheet__cell--active':
                        getRowProgress(row)[index],
                      'proficiency-skill-sheet__cell--pending':
                        isBulkMode &&
                        !getRowProgress(row)[index] &&
                        isBulkSelected(row, index),
                      'proficiency-skill-sheet__cell--disabled': isBulkMode
                        ? !getRowProgress(row)[index] &&
                          !isBulkSelected(row, index) &&
                          !canBulkSelectStep(row, index)
                        : !getRowProgress(row)[index] &&
                          !canToggleStep(row.id, index),
                    }"
                  >
                    <label class="proficiency-skill-sheet__checkbox">
                      <Checkbox
                        :modelValue="
                          isBulkMode
                            ? getRowProgress(row)[index] ||
                              isBulkSelected(row, index)
                            : getRowProgress(row)[index]
                        "
                        binary
                        :disabled="
                          isBulkMode
                            ? getRowProgress(row)[index] ||
                              (!isBulkSelected(row, index) &&
                                !canBulkSelectStep(row, index))
                            : !getRowProgress(row)[index] &&
                              !canToggleStep(row.id, index)
                        "
                        @update:modelValue="
                          isBulkMode
                            ? toggleBulkSelection(row, index)
                            : requestSheetToggle(row, index, $event)
                        "
                      />
                      <span>大瓶 {{ value }}</span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </template>
        </RMSectionEdit>
      </div>
    </template>
  </Card>

  <Dialog
    :visible="pendingAction !== null"
    modal
    dismissableMask
    :draggable="false"
    header="熟練度スキルの更新確認"
    :style="{ width: 'min(92vw, 34rem)' }"
    @update:visible="
      (visible) => {
        if (!visible) pendingAction = null
      }
    "
  >
    <div class="proficiency-skill-dialog__message">
      {{ pendingActionMessage }}
    </div>

    <template #footer>
      <div class="proficiency-skill-dialog__actions">
        <Button
          type="button"
          label="キャンセル"
          severity="secondary"
          outlined
          @click="pendingAction = null"
        />
        <Button
          type="button"
          :label="
            pendingAction?.type === 'lock' ? '解除する' : '解放済みとして登録'
          "
          @click="applyPendingAction"
        />
      </div>
    </template>
  </Dialog>

  <RMConfirmDialog
    :visible="isBulkConfirmVisible"
    title="一括登録の確認"
    :message="bulkConfirmMessage"
    confirmLabel="登録する"
    @update:visible="(value) => (isBulkConfirmVisible = value)"
    @cancel="isBulkConfirmVisible = false"
    @confirm="applyBulkSelection"
  />
</template>

<style lang="scss" scoped>
.proficiency-skill {
  display: grid;
  gap: 16px;
}

.proficiency-skill__toolbar {
  display: grid;
  gap: 14px;
}

.proficiency-skill__field {
  display: grid;
  gap: 8px;
}

.proficiency-skill__field-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
}

.proficiency-skill__weapon-select,
.proficiency-skill__weapon-select :deep(.p-dropdown) {
  width: 100%;
}

.proficiency-skill__summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.proficiency-skill__summary-card {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.proficiency-skill__summary-card span {
  font-size: 0.84rem;
  color: #64748b;
}

.proficiency-skill__summary-card strong {
  font-size: 1.2rem;
  color: #0f172a;
}

.proficiency-skill__summary-note {
  font-size: 0.82rem;
  color: #475569;
}

.proficiency-skill__progress-track {
  height: 10px;
  border-radius: 999px;
  background: #dbe4f0;
  overflow: hidden;
}

.proficiency-skill__progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
}

.proficiency-skill__mode-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.proficiency-skill__mode-note,
.proficiency-skill__empty-state {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  line-height: 1.7;
  flex: 1;
  min-width: 220px;
}

.proficiency-skill__bulk-mode-button {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding-inline: 16px;
  border: 1px solid rgba(191, 219, 254, 0.92);
  background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: proficiency-bulk-button-pulse 2s ease-in-out infinite,
    proficiency-bulk-button-float 2s ease-in-out infinite;
}

.proficiency-skill__bulk-mode-button :deep(.p-button-icon) {
  animation: proficiency-bulk-button-icon-nudge 1.2s ease-in-out infinite;
}

.proficiency-skill__bulk-mode-button::after {
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
  animation: proficiency-bulk-button-shine 2.4s ease-in-out infinite;
  pointer-events: none;
}

.proficiency-skill__bulk-mode-button :deep(.p-button-label),
.proficiency-skill__bulk-mode-button :deep(.p-button-icon) {
  position: relative;
  z-index: 1;
}

.proficiency-skill__bulk-mode-button:hover,
.proficiency-skill__bulk-mode-button:focus-visible {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.28);
}

.proficiency-skill__bulk-mode-button:active {
  transform: scale(0.98);
}

@keyframes proficiency-bulk-button-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0), 0 8px 18px rgba(15, 23, 42, 0.12);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(96, 165, 250, 0.24),
      0 12px 24px rgba(59, 130, 246, 0.24);
  }
}

@keyframes proficiency-bulk-button-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes proficiency-bulk-button-icon-nudge {
  0%,
  100% {
    transform: translateX(0) scale(1);
  }

  50% {
    transform: translateX(3px) scale(1.08);
  }
}

@keyframes proficiency-bulk-button-shine {
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

.proficiency-skill-mobile {
  display: grid;
  gap: 12px;
}

.proficiency-skill-mobile__card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.proficiency-skill-mobile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.proficiency-skill-mobile__title {
  font-size: 0.98rem;
  font-weight: 800;
  color: #1f2937;
}

.proficiency-skill-mobile__meta,
.proficiency-skill-sheet__skill-meta {
  margin-top: 4px;
  font-size: 0.82rem;
  color: #64748b;
}

.proficiency-skill-mobile__steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.proficiency-skill-step {
  display: grid;
  gap: 4px;
  padding: 12px;
  text-align: left;
  border-radius: 16px;
  border: 1px solid #dbe4f0;
  background: #ffffff;
  color: #334155;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.proficiency-skill-step strong {
  font-size: 0.98rem;
}

.proficiency-skill-step:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: #60a5fa;
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.12);
}

.proficiency-skill-step:disabled {
  cursor: not-allowed;
}

.proficiency-skill-step--active {
  border-color: #2563eb;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  color: #1d4ed8;
}

.proficiency-skill-step--locked {
  opacity: 0.55;
}

.proficiency-skill-step--bulk-selected {
  border-color: #f59e0b;
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
  color: #92400e;
}

.proficiency-skill-bulk-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.proficiency-skill-bulk-bar__count {
  font-size: 0.85rem;
  font-weight: 700;
  color: #92400e;
  white-space: nowrap;
}

.proficiency-skill-sheet {
  display: none;
}

.proficiency-skill-sheet__table {
  width: 100%;
  min-width: 1120px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.proficiency-skill-sheet__table th,
.proficiency-skill-sheet__table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  vertical-align: middle;
}

.proficiency-skill-sheet__table th {
  background: #f8fafc;
  font-size: 0.82rem;
  font-weight: 800;
  color: #475569;
  white-space: nowrap;
}

.proficiency-skill-sheet__table th:last-child,
.proficiency-skill-sheet__table td:last-child {
  border-right: none;
}

.proficiency-skill-sheet__table tbody tr:last-child td {
  border-bottom: none;
}

.proficiency-skill-sheet__level,
.proficiency-skill-sheet__skill-title {
  font-weight: 700;
  color: #1f2937;
}

.proficiency-skill-sheet__cell {
  min-width: 92px;
  text-align: center;
}

.proficiency-skill-sheet__cell--disabled {
  opacity: 0.5;
}

.proficiency-skill-sheet__cell--active {
  background: #eff6ff;
}

.proficiency-skill-sheet__cell--pending {
  background: #fffbeb;
}

.proficiency-skill-sheet__cell--pending :deep(.p-checkbox-box) {
  border-color: #f59e0b;
  background: #fef3c7;
}

.proficiency-skill-sheet__checkbox {
  display: grid;
  gap: 6px;
  justify-items: center;
  font-size: 0.8rem;
  color: #475569;
}

.proficiency-skill-dialog__message {
  color: #334155;
  line-height: 1.7;
}

.proficiency-skill-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .proficiency-skill-mobile__steps {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .proficiency-skill-mobile {
    display: none;
  }

  .proficiency-skill-sheet {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .proficiency-skill__bulk-mode-button,
  .proficiency-skill__bulk-mode-button :deep(.p-button-icon),
  .proficiency-skill__bulk-mode-button::after {
    animation: none;
  }

  .proficiency-skill__bulk-mode-button {
    transition: none;
  }
}
</style>
