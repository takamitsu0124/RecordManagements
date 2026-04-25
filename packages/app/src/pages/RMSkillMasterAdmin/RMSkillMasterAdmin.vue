<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { dbSkillMasterModule } from '@rm/db'
import { SkillMaster, defaultSkillMaster } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import { parseCsv, readTextFile } from 'src/helpers/csv'
import {
  getSkillMasterImportChangeType,
  normalizeSkillMasterCsvRecords,
  SkillMasterImportChangeType,
  SkillMasterImportPayload,
} from 'src/helpers/skillMasterCsv'
import {
  attackTypeOptions,
  buildSkillMasterSearchText,
  normalizeSkillMasterRecord,
  skillElements,
  skillEquipmentTypes,
  skillTypeOptions,
} from 'src/helpers/skillMasterSchema'

type SelectOption = {
  label: string
  value: string
}

type SkillMasterImportPreviewRow = SkillMasterImportPayload & {
  changeType: SkillMasterImportChangeType
}

type SkillMasterImportResultRow = {
  rowNumber: number
  id: string
  name: string
  action: Exclude<SkillMasterImportChangeType, 'unchanged'>
  status: 'success' | 'error'
  message: string
}

type SkillMasterImportStats = {
  total: number
  valid: number
  normalizedElementCount: number
  normalizedEquipmentTypeCount: number
  normalizedSkillTypeCount: number
  normalizedAttackTypeCount: number
}

// CSV ヘッダを変更したい場合はこの配列だけを更新してください。
// 画面内の案内文と必須ヘッダ判定の両方に反映されます。
const requiredSkillMasterCsvHeaders = [
  'id', // skill_master ドキュメントID
  'name', // カードの表示名 (例: 【記死回生の一撃】キリト)
  'rarity', // レアリティ
  'cost', // コスト数値
  'equipmentType', // 装備種別 (例: 片手直剣)
  'sp', // 消費SP数値
  'element', // 自然属性 (火 / 水 / 土 / 聖 / 闇 / 風 / 無)
  'skillType', // スキル種別 (通常 / コネクト / チェイン / MOD / 覚醒 / アクセル / バースト など)
  'attackType', // 攻撃属性 (斬 / 突 / 打)
  'breakGauge', // ブレイクゲージ増加量
  'switchGauge', // スイッチゲージ増加量
  'cooldown', // クールダウン数値
  'skillName', // 技名 (例: スターバースト・ストリーム)
  'image', // スキル画像URL
]
const skillMasterCsvHeaderText = requiredSkillMasterCsvHeaders.join(',')

const rarityOptions: SelectOption[] = ['N', 'R', 'RR', 'RRR', 'SR', 'SSR', 'UR'].map(
  (value) => ({ label: value, value })
)
const elementOptions: SelectOption[] = skillElements.map((value) => ({
  label: value,
  value,
}))
const equipmentTypeOptions: SelectOption[] = skillEquipmentTypes.map((value) => ({
  label: value,
  value,
}))
const skillTypeSelectOptions: SelectOption[] = skillTypeOptions.map((value) => ({
  label: value,
  value,
}))
const attackTypeSelectOptions: SelectOption[] = attackTypeOptions.map((value) => ({
  label: value,
  value,
}))

const skillMasterList = ref<SkillMaster[]>([])
const isLoading = ref(true)
const searchText = ref('')
const selectedElement = ref('')
const selectedEquipmentType = ref('')
const selectedSkillType = ref('')
const selectedAttackType = ref('')
const minBreakGauge = ref<number | null>(null)
const minSwitchGauge = ref<number | null>(null)
const isEditMode = ref(false)
const form = ref<SkillMaster>(defaultSkillMaster())
const errorMessage = ref('')
const skillCsvUploadKey = ref(0)
const skillCsvFileName = ref('')
const skillCsvParseErrors = ref<string[]>([])
const skillCsvPreviewRows = ref<SkillMasterImportPreviewRow[]>([])
const skillCsvImportResults = ref<SkillMasterImportResultRow[]>([])
const skillCsvStats = ref<SkillMasterImportStats | null>(null)

const isEditingExisting = computed(() => isEditMode.value)
const skillCountLabel = computed(
  () =>
    `${filteredSkillMasterList.value.length} / ${skillMasterList.value.length} 件`
)
const existingSkillMap = computed(
  () => new Map(skillMasterList.value.map((skill) => [skill.id, skill]))
)
const skillCsvInsertCount = computed(
  () =>
    skillCsvPreviewRows.value.filter((row) => row.changeType === 'insert').length
)
const skillCsvUpdateCount = computed(
  () =>
    skillCsvPreviewRows.value.filter((row) => row.changeType === 'update').length
)
const skillCsvUnchangedCount = computed(
  () =>
    skillCsvPreviewRows.value.filter((row) => row.changeType === 'unchanged').length
)
const canImportSkillCsv = computed(
  () =>
    skillCsvPreviewRows.value.length > 0 &&
    skillCsvParseErrors.value.length === 0 &&
    skillCsvPreviewRows.value.some((row) => row.changeType !== 'unchanged')
)
const skillCsvStatusLabel = computed(() => {
  if (skillCsvPreviewRows.value.length === 0) {
    return 'CSV 未選択'
  }

  return `新規 ${skillCsvInsertCount.value} / 更新 ${skillCsvUpdateCount.value} / 変更なし ${skillCsvUnchangedCount.value}`
})

const filteredSkillMasterList = computed(() => {
  const query = searchText.value.trim().toLowerCase()

  return skillMasterList.value.filter((skill) => {
    const matchesText =
      query === '' || buildSkillMasterSearchText(skill).includes(query)

    const matchesElement =
      selectedElement.value === '' || skill.element === selectedElement.value
    const matchesEquipmentType =
      selectedEquipmentType.value === '' ||
      skill.equipmentType === selectedEquipmentType.value
    const matchesSkillType =
      selectedSkillType.value === '' || skill.skillType === selectedSkillType.value
    const matchesAttackType =
      selectedAttackType.value === '' || skill.attackType === selectedAttackType.value
    const matchesBreakGauge =
      minBreakGauge.value === null ||
      (skill.breakGauge ?? Number.NEGATIVE_INFINITY) >= minBreakGauge.value
    const matchesSwitchGauge =
      minSwitchGauge.value === null ||
      (skill.switchGauge ?? Number.NEGATIVE_INFINITY) >= minSwitchGauge.value

    return (
      matchesText &&
      matchesElement &&
      matchesEquipmentType &&
      matchesSkillType &&
      matchesAttackType &&
      matchesBreakGauge &&
      matchesSwitchGauge
    )
  })
})

const resetForm = () => {
  form.value = defaultSkillMaster()
  isEditMode.value = false
  errorMessage.value = ''
}

const clearSkillCsvSelection = (preserveResults = false) => {
  skillCsvFileName.value = ''
  skillCsvParseErrors.value = []
  skillCsvPreviewRows.value = []
  skillCsvStats.value = null
  skillCsvUploadKey.value += 1
  if (!preserveResults) {
    skillCsvImportResults.value = []
  }
}

const getChangeSeverity = (changeType: SkillMasterImportChangeType) => {
  if (changeType === 'insert') return 'success'
  if (changeType === 'update') return 'warn'
  return 'secondary'
}

const getChangeLabel = (changeType: SkillMasterImportChangeType) => {
  if (changeType === 'insert') return '新規'
  if (changeType === 'update') return '更新'
  return '変更なし'
}

const getImportResultSeverity = (status: SkillMasterImportResultRow['status']) =>
  status === 'success' ? 'success' : 'danger'

const getImportResultLabel = (row: SkillMasterImportResultRow) =>
  row.status === 'success'
    ? row.action === 'insert'
      ? '登録'
      : '更新'
    : '失敗'

const loadSkillMaster = async () => {
  try {
    isLoading.value = true
    await dbSkillMasterModule.fetch()
    skillMasterList.value = Array.from(dbSkillMasterModule.data.values())
      .map((skill) => normalizeSkillMasterRecord(skill))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  } catch (error) {
    notifyError('スキルマスターの読み込みに失敗しました。')
    console.error('Failed to fetch skill master:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadSkillMaster()
})

const startCreate = () => {
  resetForm()
}

const startEdit = (skill: SkillMaster) => {
  form.value = {
    ...defaultSkillMaster(),
    ...skill,
  }
  isEditMode.value = true
  errorMessage.value = ''
}

const validateForm = () => {
  const nextId = form.value.id.trim()
  const nextName = form.value.name.trim()

  if (
    !nextId ||
    !nextName ||
    !form.value.element ||
    !form.value.equipmentType ||
    !form.value.skillName.trim()
  ) {
    return 'ID、名称、自然属性、装備種別、技名は必須です。'
  }

  if (
    !isEditingExisting.value &&
    skillMasterList.value.some((skill) => skill.id === nextId)
  ) {
    return '同じIDのスキルが既に存在します。'
  }

  return ''
}

const saveSkillMaster = async () => {
  errorMessage.value = validateForm()
  if (errorMessage.value) {
    notifyError(errorMessage.value)
    return
  }

  const payload: SkillMaster = {
    ...defaultSkillMaster(),
    ...form.value,
    id: form.value.id.trim(),
    name: form.value.name.trim(),
    rarity: form.value.rarity.trim(),
    equipmentType: form.value.equipmentType.trim(),
    element: form.value.element.trim(),
    skillType: form.value.skillType.trim() || '通常',
    attackType: form.value.attackType.trim(),
    skillName: form.value.skillName.trim(),
    image: form.value.image.trim(),
  }

  await useSpinner(async () => {
    try {
      if (isEditingExisting.value) {
        await dbSkillMasterModule.doc(payload.id).merge(payload)
        notifySuccess('スキルマスターを更新しました。')
      } else {
        await dbSkillMasterModule.doc(payload.id).insert(payload)
        notifySuccess('スキルマスターを登録しました。')
      }

      await loadSkillMaster()
      resetForm()
    } catch (error) {
      notifyError('スキルマスターの保存に失敗しました。')
      console.error('Failed to save skill master:', error)
    }
  })
}

const onSkillCsvSelect = async (event: { files?: File[] }) => {
  const file = event.files?.[0]
  if (!file) {
    return
  }

  skillCsvImportResults.value = []
  skillCsvFileName.value = file.name
  skillCsvParseErrors.value = []
  skillCsvPreviewRows.value = []
  skillCsvStats.value = null

  try {
    const content = await readTextFile(file)
    const records = parseCsv(content)

    if (records.length === 0) {
      skillCsvParseErrors.value = ['CSV にデータ行がありません。']
      return
    }

    const firstRecord = records[0]
    const missingHeaders = requiredSkillMasterCsvHeaders.filter(
      (header) => !Object.prototype.hasOwnProperty.call(firstRecord, header)
    )

    if (missingHeaders.length > 0) {
      skillCsvParseErrors.value = [
        `CSV ヘッダーが不足しています: ${missingHeaders.join(', ')}`,
      ]
      return
    }

    const { normalized, errors, stats } = normalizeSkillMasterCsvRecords(records)
    skillCsvStats.value = stats
    skillCsvParseErrors.value = errors
    skillCsvPreviewRows.value = normalized.map((payload) => ({
      ...payload,
      changeType: getSkillMasterImportChangeType(payload, existingSkillMap.value),
    }))
  } catch (error) {
    skillCsvParseErrors.value = ['CSV の読み込みに失敗しました。']
    console.error('Failed to parse skill master csv:', error)
  }
}

const importSkillMasterCsv = async () => {
  if (skillCsvParseErrors.value.length > 0) {
    notifyError('CSV のエラーを解消してから実行してください。')
    return
  }

  const rows = skillCsvPreviewRows.value.filter(
    (row) => row.changeType !== 'unchanged'
  )

  if (rows.length === 0) {
    notifySuccess('変更対象のスキルはありません。')
    return
  }

  const results: SkillMasterImportResultRow[] = []

  await useSpinner(async () => {
    for (const row of rows) {
      const payload: SkillMaster = {
        ...defaultSkillMaster(),
        id: row.id,
        name: row.name,
        rarity: row.rarity,
        cost: row.cost,
        equipmentType: row.equipmentType,
        sp: row.sp,
        element: row.element,
        skillType: row.skillType,
        attackType: row.attackType,
        breakGauge: row.breakGauge,
        switchGauge: row.switchGauge,
        cooldown: row.cooldown,
        skillName: row.skillName,
        image: row.image,
      }

      try {
        const action: Exclude<SkillMasterImportChangeType, 'unchanged'> =
          row.changeType === 'insert' ? 'insert' : 'update'
        if (row.changeType === 'insert') {
          await dbSkillMasterModule.doc(payload.id).insert(payload)
        } else {
          await dbSkillMasterModule.doc(payload.id).merge(payload)
        }

        results.push({
          rowNumber: row.rowNumber,
          id: row.id,
          name: row.name,
          action,
          status: 'success',
          message: action === 'insert' ? '登録しました。' : '更新しました。',
        })
      } catch (error) {
        const action: Exclude<SkillMasterImportChangeType, 'unchanged'> =
          row.changeType === 'insert' ? 'insert' : 'update'
        results.push({
          rowNumber: row.rowNumber,
          id: row.id,
          name: row.name,
          action,
          status: 'error',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'スキルマスターの保存に失敗しました。',
        })
      }
    }
  })

  skillCsvImportResults.value = results

  const successCount = results.filter((row) => row.status === 'success').length
  const errorCount = results.length - successCount

  if (successCount > 0) {
    await loadSkillMaster()
    notifySuccess(`${successCount} 件のスキルを反映しました。`)
  }
  if (errorCount > 0) {
    notifyError(`${errorCount} 件のスキル反映に失敗しました。`)
  }

  clearSkillCsvSelection(true)
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="skill-master-admin-page">
      <Card class="skill-master-admin-card skill-master-admin-card--import">
        <template #content>
          <div class="skill-master-admin-card__content">
            <RMPageHeader
              title="スキルマスター CSV インポート"
              subtitle="Admin が skill_master を一括反映するページです。"
              description="CSV を解析して正規化・差分判定したあとに、新規登録または更新だけをまとめて反映できます。"
              icon="pi pi-file-import"
            >
              <template #actions>
                <Tag
                  :value="skillCsvStatusLabel"
                  :severity="
                    canImportSkillCsv
                      ? 'success'
                      : skillCsvPreviewRows.length > 0
                        ? 'warn'
                        : 'secondary'
                  "
                />
              </template>
            </RMPageHeader>

            <div class="rm-inline-note">
              ヘッダーは
              <span class="skill-master-admin-code">{{
                skillMasterCsvHeaderText
              }}</span>
              を使用してください。UI からは削除を行わず、新規登録と更新のみを反映します。
            </div>

            <div class="skill-master-admin-import-toolbar">
              <FileUpload
                :key="skillCsvUploadKey"
                mode="basic"
                accept=".csv,text/csv"
                chooseLabel="CSV を選択"
                class="skill-master-admin-import-upload"
                @select="onSkillCsvSelect"
              />
              <RMButton
                label="選択をクリア"
                flat
                color="grey"
                :disabled="!skillCsvFileName"
                @click="clearSkillCsvSelection()"
              />
              <RMButton
                label="この内容で反映"
                color="primary"
                :disabled="!canImportSkillCsv"
                @click="importSkillMasterCsv"
              />
            </div>

            <div v-if="skillCsvFileName" class="skill-master-admin-file-meta">
              選択中: {{ skillCsvFileName }}
            </div>

            <div v-if="skillCsvStats" class="skill-master-admin-import-metrics">
              <div class="skill-master-admin-metric">
                <div class="skill-master-admin-metric__label">有効行</div>
                <div class="skill-master-admin-metric__value">
                  {{ skillCsvStats.valid }} / {{ skillCsvStats.total }}
                </div>
              </div>
              <div class="skill-master-admin-metric">
                <div class="skill-master-admin-metric__label">自然属性正規化</div>
                <div class="skill-master-admin-metric__value">
                  {{ skillCsvStats.normalizedElementCount }}
                </div>
              </div>
              <div class="skill-master-admin-metric">
                <div class="skill-master-admin-metric__label">装備種別正規化</div>
                <div class="skill-master-admin-metric__value">
                  {{ skillCsvStats.normalizedEquipmentTypeCount }}
                </div>
              </div>
              <div class="skill-master-admin-metric">
                <div class="skill-master-admin-metric__label">スキル種別正規化</div>
                <div class="skill-master-admin-metric__value">
                  {{ skillCsvStats.normalizedSkillTypeCount }}
                </div>
              </div>
              <div class="skill-master-admin-metric">
                <div class="skill-master-admin-metric__label">攻撃属性正規化</div>
                <div class="skill-master-admin-metric__value">
                  {{ skillCsvStats.normalizedAttackTypeCount }}
                </div>
              </div>
            </div>

            <div
              v-if="skillCsvParseErrors.length"
              class="skill-master-admin-error-list"
            >
              <div
                v-for="message in skillCsvParseErrors"
                :key="message"
                class="skill-master-admin-error-list__item"
              >
                {{ message }}
              </div>
            </div>

            <div
              v-if="skillCsvPreviewRows.length"
              class="skill-master-admin-import-preview"
            >
              <div
                v-if="skillCsvParseErrors.length"
                class="skill-master-admin-preview-note skill-master-admin-preview-note--error"
              >
                エラーが残っているためまだ反映できません。CSV を修正して再選択してください。
              </div>
              <div
                v-else
                class="skill-master-admin-preview-note skill-master-admin-preview-note--success"
              >
                差分判定が完了しました。新規登録と更新だけが反映対象です。
              </div>

              <DataTable
                :value="skillCsvPreviewRows"
                responsiveLayout="scroll"
                class="skill-master-admin-table"
              >
                <Column field="rowNumber" header="行" style="width: 72px" />
                <Column field="id" header="ID" />
                <Column field="name" header="名称" />
                <Column field="skillName" header="技名" />
                <Column field="element" header="自然属性" style="width: 110px" />
                <Column field="equipmentType" header="装備種別" />
                <Column field="skillType" header="スキル種別" style="width: 120px" />
                <Column field="attackType" header="攻撃属性" style="width: 110px" />
                <Column header="差分" style="width: 140px">
                  <template #body="{ data }">
                    <Tag
                      :value="getChangeLabel(data.changeType)"
                      :severity="getChangeSeverity(data.changeType)"
                    />
                  </template>
                </Column>
              </DataTable>
            </div>

            <div
              v-if="skillCsvImportResults.length"
              class="skill-master-admin-import-preview"
            >
              <div class="rm-section-title">直近の実行結果</div>
              <DataTable
                :value="skillCsvImportResults"
                responsiveLayout="scroll"
                class="skill-master-admin-table"
              >
                <Column field="rowNumber" header="行" style="width: 72px" />
                <Column field="id" header="ID" />
                <Column field="name" header="名称" />
                <Column header="結果" style="width: 120px">
                  <template #body="{ data }">
                    <Tag
                      :value="getImportResultLabel(data)"
                      :severity="getImportResultSeverity(data.status)"
                    />
                  </template>
                </Column>
                <Column field="message" header="メッセージ" />
              </DataTable>
            </div>
          </div>
        </template>
      </Card>

      <div class="skill-master-admin-layout">
        <Card class="skill-master-admin-card skill-master-admin-card--form">
          <template #content>
            <div class="skill-master-admin-card__content">
              <RMPageHeader
                title="スキルマスター管理"
                subtitle="Admin が skill_master を単体登録・更新するページです。"
                description="検索・登録・更新の導線を分け、DataTable 側と入力フォーム側で視線が迷わないようにしています。"
                icon="pi pi-database"
              >
                <template #actions>
                  <Button
                    label="新規入力"
                    severity="secondary"
                    outlined
                    @click="startCreate"
                  />
                </template>
              </RMPageHeader>

              <Divider />

              <div class="skill-master-admin-form">
                <div class="skill-master-admin-field">
                  <label class="skill-master-admin-label">ID *</label>
                  <InputText
                    v-model="form.id"
                    :disabled="isEditingExisting"
                    placeholder="skill-fire-sword-link-001"
                  />
                </div>

                <div class="skill-master-admin-field">
                  <label class="skill-master-admin-label">名称 *</label>
                  <InputText
                    v-model="form.name"
                    placeholder="【記死回生の一撃】キリト"
                  />
                </div>

                <div class="skill-master-admin-grid">
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">レアリティ</label>
                    <Dropdown
                      v-model="form.rarity"
                      :options="rarityOptions"
                      optionLabel="label"
                      optionValue="value"
                      showClear
                      placeholder="レアリティを選択"
                    />
                  </div>

                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">自然属性 *</label>
                    <Dropdown
                      v-model="form.element"
                      :options="elementOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="自然属性を選択"
                    />
                  </div>
                </div>

                <div class="skill-master-admin-grid">
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">装備種別 *</label>
                    <Dropdown
                      v-model="form.equipmentType"
                      :options="equipmentTypeOptions"
                      optionLabel="label"
                      optionValue="value"
                      filter
                      placeholder="装備種別を選択"
                    />
                  </div>
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">スキル種別</label>
                    <Dropdown
                      v-model="form.skillType"
                      :options="skillTypeSelectOptions"
                      optionLabel="label"
                      optionValue="value"
                      filter
                      placeholder="スキル種別を選択"
                    />
                  </div>
                </div>

                <div class="skill-master-admin-grid">
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">攻撃属性</label>
                    <Dropdown
                      v-model="form.attackType"
                      :options="attackTypeSelectOptions"
                      optionLabel="label"
                      optionValue="value"
                      showClear
                      placeholder="攻撃属性を選択"
                    />
                  </div>
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">技名 *</label>
                    <InputText
                      v-model="form.skillName"
                      placeholder="スターバースト・ストリーム"
                    />
                  </div>
                </div>

                <div
                  class="skill-master-admin-grid skill-master-admin-grid--gauge"
                >
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">cost</label>
                    <InputNumber
                      v-model="form.cost"
                      :useGrouping="false"
                      inputClass="w-full"
                      placeholder="24"
                    />
                  </div>
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">sp</label>
                    <InputNumber
                      v-model="form.sp"
                      :useGrouping="false"
                      inputClass="w-full"
                      placeholder="35"
                    />
                  </div>
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">cooldown</label>
                    <InputNumber
                      v-model="form.cooldown"
                      :useGrouping="false"
                      :minFractionDigits="0"
                      :maxFractionDigits="1"
                      inputClass="w-full"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div
                  class="skill-master-admin-grid skill-master-admin-grid--gauge"
                >
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">switchGauge</label>
                    <InputNumber
                      v-model="form.switchGauge"
                      :useGrouping="false"
                      inputClass="w-full"
                      placeholder="80"
                    />
                  </div>
                  <div class="skill-master-admin-field">
                    <label class="skill-master-admin-label">breakGauge</label>
                    <InputNumber
                      v-model="form.breakGauge"
                      :useGrouping="false"
                      inputClass="w-full"
                      placeholder="62"
                    />
                  </div>
                </div>

                <div class="skill-master-admin-field">
                  <label class="skill-master-admin-label">image</label>
                  <InputText
                    v-model="form.image"
                    placeholder="https://example.com/skill.png"
                  />
                  <img
                    v-if="form.image"
                    :src="form.image"
                    alt="skill preview"
                    class="skill-master-admin-image"
                  />
                </div>
              </div>

              <p v-if="errorMessage" class="skill-master-admin-error">
                {{ errorMessage }}
              </p>

              <div class="rm-actions">
                <RMButton
                  label="入力をクリア"
                  flat
                  color="grey"
                  @click="resetForm"
                />
                <RMButton
                  :label="isEditingExisting ? '更新する' : '登録する'"
                  color="primary"
                  @click="saveSkillMaster"
                />
              </div>
            </div>
          </template>
        </Card>

        <Card class="skill-master-admin-card skill-master-admin-card--table">
          <template #content>
            <div class="skill-master-admin-card__content">
              <RMPageHeader
                title="登録済みスキル"
                :subtitle="skillCountLabel"
                description="名称、技名、自然属性、装備種別、スキル種別、攻撃属性、ゲージ量で絞り込めます。"
                icon="pi pi-search"
              />

              <div class="skill-master-admin-filter-row rm-filter-toolbar">
                <InputText
                  v-model="searchText"
                  placeholder="ID・名称・技名・キャラ名で検索"
                />
                <Dropdown
                  v-model="selectedElement"
                  :options="elementOptions"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  placeholder="自然属性"
                />
                <Dropdown
                  v-model="selectedEquipmentType"
                  :options="equipmentTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  filter
                  showClear
                  placeholder="装備種別"
                />
              </div>

              <div class="skill-master-admin-filter-row rm-filter-toolbar">
                <Dropdown
                  v-model="selectedSkillType"
                  :options="skillTypeSelectOptions"
                  optionLabel="label"
                  optionValue="value"
                  filter
                  showClear
                  placeholder="スキル種別"
                />
                <Dropdown
                  v-model="selectedAttackType"
                  :options="attackTypeSelectOptions"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  placeholder="攻撃属性"
                />
                <InputNumber
                  v-model="minSwitchGauge"
                  :useGrouping="false"
                  inputClass="w-full"
                  placeholder="Switch Gauge 以上"
                />
                <InputNumber
                  v-model="minBreakGauge"
                  :useGrouping="false"
                  inputClass="w-full"
                  placeholder="Break Gauge 以上"
                />
              </div>

              <div v-if="isLoading" class="skill-master-admin-loading">
                <ProgressSpinner strokeWidth="5" />
                <p class="rm-muted">スキルマスターを読み込み中...</p>
              </div>

              <DataTable
                v-else
                :value="filteredSkillMasterList"
                paginator
                :rows="15"
                responsiveLayout="scroll"
                class="skill-master-admin-table"
              >
                <template #empty>
                  <RMEmptyState
                    icon="pi pi-search"
                    title="条件に一致するスキルがありません"
                    message="検索文字や各フィルタ条件を見直すと、結果がすぐに再表示されます。"
                  />
                </template>
                <Column field="id" header="ID" />
                <Column field="name" header="名称" />
                <Column field="skillName" header="技名" />
                <Column field="rarity" header="レア" style="width: 100px" />
                <Column field="element" header="自然属性" style="width: 110px" />
                <Column field="equipmentType" header="装備種別" />
                <Column field="skillType" header="スキル種別" style="width: 120px" />
                <Column field="attackType" header="攻撃属性" style="width: 110px" />
                <Column field="cost" header="Cost" style="width: 100px" />
                <Column field="sp" header="SP" style="width: 100px" />
                <Column field="cooldown" header="Cooldown" style="width: 120px" />
                <Column field="switchGauge" header="Switch" style="width: 110px" />
                <Column field="breakGauge" header="Break" style="width: 110px" />
                <Column header="操作" style="width: 110px">
                  <template #body="{ data }">
                    <Button
                      label="編集"
                      severity="contrast"
                      text
                      @click="startEdit(data)"
                    />
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.skill-master-admin-page {
  width: min(100%, 1320px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-master-admin-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.skill-master-admin-card {
  border-radius: 24px;
  overflow: hidden;
}

.skill-master-admin-card__content {
  padding: clamp(16px, 2vw, 20px);
}

.skill-master-admin-card__hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.skill-master-admin-code {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  vertical-align: middle;
}

.skill-master-admin-import-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
}

.skill-master-admin-import-upload {
  width: 100%;
}

.skill-master-admin-file-meta {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.04);
  color: #475569;
  word-break: break-word;
}

.skill-master-admin-import-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.skill-master-admin-metric {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.skill-master-admin-metric__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
}

.skill-master-admin-metric__value {
  margin-top: 6px;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1f2937;
}

.skill-master-admin-error-list {
  display: grid;
  gap: 10px;
}

.skill-master-admin-error-list__item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.16);
  color: #b91c1c;
  font-weight: 700;
}

.skill-master-admin-import-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-master-admin-preview-note {
  padding: 12px 14px;
  border-radius: 16px;
  font-weight: 700;
}

.skill-master-admin-preview-note--error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.16);
  color: #b91c1c;
}

.skill-master-admin-preview-note--success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.18);
  color: #166534;
}

.skill-master-admin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-master-admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.skill-master-admin-grid--gauge {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.skill-master-admin-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-master-admin-label {
  font-size: 0.92rem;
  font-weight: 700;
  color: #475569;
}

.skill-master-admin-image {
  margin-top: 8px;
  width: 100%;
  max-width: 200px;
  border-radius: 16px;
  border: 1px solid #dbe4f0;
  background: #f8fafc;
  object-fit: contain;
}

.skill-master-admin-error {
  margin-top: 14px;
  color: #dc2626;
  font-weight: 700;
}

.skill-master-admin-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(120px, 180px) minmax(
      180px,
      280px
    );
  gap: 12px;
  margin-bottom: 16px;
}

.skill-master-admin-loading {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 18px 0;
}

@media (max-width: 1200px) {
  .skill-master-admin-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .skill-master-admin-filter-row,
  .skill-master-admin-import-toolbar,
  .skill-master-admin-import-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .skill-master-admin-code {
    display: block;
    width: 100%;
    margin: 6px 0;
    border-radius: 14px;
  }

  .skill-master-admin-card__hero {
    flex-direction: column;
  }

  .skill-master-admin-grid,
  .skill-master-admin-grid--gauge {
    grid-template-columns: 1fr;
  }
}
</style>
