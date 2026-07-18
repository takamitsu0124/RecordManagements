<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Column from 'primevue/column'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import Tag from 'primevue/tag'
import type { AppRole} from '@rm/types'
import { appRoles } from '@rm/types'
import { createUser, dbUserCreate } from '@rm/utils'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'
import { normalizeCsvWhitespace, parseCsv, readTextFile } from 'src/helpers/csv'
import type {
  RegisterInfo} from './register'
import {
  getRegisterErrorMessage,
  globalRegisterForm,
  roleLabels
} from './register'

type UserImportPreviewRow = RegisterInfo & {
  rowNumber: number
  status: 'ready' | 'error'
  message: string
}

type UserImportResultRow = {
  rowNumber: number
  email: string
  name: string
  status: 'success' | 'error'
  message: string
}

// CSV ヘッダを変更したい場合はこの配列だけを更新してください。
// 画面内の案内文と必須ヘッダ判定の両方に反映されます。
const requiredUserCsvHeaders = [
  'email', // Firebase Auth に登録するログイン用メールアドレス
  'password', // 初回作成時に設定するログインパスワード
  'name', // users.displayName に保存する表示名
  'guildId', // users.guildId に保存する所属ギルドID
  'role' // users.role に保存する権限 (admin / guild_admin / member)
]
const userCsvHeaderText = requiredUserCsvHeaders.join(',')
const { registerInfo, defaultRegisterInfo, validateRegisterInfo } =
  globalRegisterForm()
const router = useRouter()
const errors = ref<{ field: string; message: string }>({
  field: '',
  message: ''
})
const onFocus = ref<number>(0)
const userCsvUploadKey = ref(0)
const userCsvFileName = ref('')
const userCsvParseErrors = ref<string[]>([])
const userCsvPreviewRows = ref<UserImportPreviewRow[]>([])
const userCsvImportResults = ref<UserImportResultRow[]>([])
const roleOptions: { label: string; value: AppRole }[] = [
  { label: 'General Member', value: 'member' },
  { label: 'Guild Admin', value: 'guild_admin' },
  { label: 'Admin', value: 'admin' }
]

const validUserCsvRows = computed(() =>
  userCsvPreviewRows.value.filter((row) => row.status === 'ready')
)
const invalidUserCsvRows = computed(() =>
  userCsvPreviewRows.value.filter((row) => row.status === 'error')
)
const canImportUserCsv = computed(
  () =>
    userCsvPreviewRows.value.length > 0 &&
    invalidUserCsvRows.value.length === 0 &&
    userCsvParseErrors.value.length === 0
)
const userCsvStatusLabel = computed(() => {
  if (userCsvPreviewRows.value.length === 0) {
    return 'CSV 未選択'
  }

  return `${validUserCsvRows.value.length} / ${userCsvPreviewRows.value.length} 件準備完了`
})

const getRoleSeverity = (role: AppRole) => {
  if (role === 'admin') return 'danger'
  if (role === 'guild_admin') return 'warn'
  return 'secondary'
}

const getPreviewStatusSeverity = (status: UserImportPreviewRow['status']) =>
  status === 'ready' ? 'success' : 'danger'

const getResultSeverity = (status: UserImportResultRow['status']) =>
  status === 'success' ? 'success' : 'danger'

const normalizeCsvRole = (value: string): AppRole | '' => {
  const normalized = normalizeCsvWhitespace(value).toLowerCase()

  if (!normalized) {
    return 'member'
  }

  const roleAliasMap = new Map<string, AppRole>([
    ['admin', 'admin'],
    ['guild_admin', 'guild_admin'],
    ['guildadmin', 'guild_admin'],
    ['guild-admin', 'guild_admin'],
    ['guild admin', 'guild_admin'],
    ['member', 'member'],
    ['generalmember', 'member'],
    ['general-member', 'member'],
    ['general member', 'member']
  ])

  return roleAliasMap.get(normalized) ?? ''
}

const clearUserCsvSelection = (preserveResults = false) => {
  userCsvFileName.value = ''
  userCsvParseErrors.value = []
  userCsvPreviewRows.value = []
  userCsvUploadKey.value += 1
  if (!preserveResults) {
    userCsvImportResults.value = []
  }
}

const buildUserImportPreviewRows = (records: ReturnType<typeof parseCsv>) => {
  const emailCounts = new Map<string, number>()

  records.forEach((record) => {
    const emailKey = normalizeCsvWhitespace(record.email).toLowerCase()
    if (!emailKey) return

    emailCounts.set(emailKey, (emailCounts.get(emailKey) ?? 0) + 1)
  })

  return records.map((record) => {
    const role = normalizeCsvRole(record.role)
    const nextRow: RegisterInfo = {
      email: normalizeCsvWhitespace(record.email),
      password: normalizeCsvWhitespace(record.password),
      name: normalizeCsvWhitespace(record.name),
      guildId: normalizeCsvWhitespace(record.guildId),
      role: role || 'member'
    }

    let message = ''

    if (!role || !appRoles.includes(role)) {
      message = '権限は admin / guild_admin / member のいずれかを指定してください。'
    }

    if (!message) {
      const validation = validateRegisterInfo(nextRow)
      if (validation) {
        message = validation.message
      }
    }

    if (
      !message &&
      emailCounts.get(nextRow.email.toLowerCase()) &&
      emailCounts.get(nextRow.email.toLowerCase()) > 1
    ) {
      message = '同じメールアドレスが CSV 内で重複しています。'
    }

    return {
      ...nextRow,
      rowNumber: record.__rowNumber,
      status: message ? 'error' : 'ready',
      message
    } satisfies UserImportPreviewRow
  })
}

const onUserCsvSelect = async (event: { files?: File[] }) => {
  const file = event.files?.[0]
  if (!file) {
    return
  }

  userCsvImportResults.value = []
  userCsvFileName.value = file.name
  userCsvParseErrors.value = []
  userCsvPreviewRows.value = []

  try {
    const content = await readTextFile(file)
    const records = parseCsv(content)

    if (records.length === 0) {
      userCsvParseErrors.value = ['CSV にデータ行がありません。']
      return
    }

    const firstRecord = records[0]
    const missingHeaders = requiredUserCsvHeaders.filter(
      (header) => !Object.prototype.hasOwnProperty.call(firstRecord, header)
    )

    if (missingHeaders.length > 0) {
      userCsvParseErrors.value = [
        `CSV ヘッダーが不足しています: ${missingHeaders.join(', ')}`
      ]
      return
    }

    userCsvPreviewRows.value = buildUserImportPreviewRows(records)
  } catch (error) {
    userCsvParseErrors.value = ['CSV の読み込みに失敗しました。']
    console.error('Failed to parse user csv:', error)
  }
}

const importUsersFromCsv = async () => {
  if (!canImportUserCsv.value) {
    notifyError('CSV の内容を修正してから実行してください。')
    return
  }

  const rows = validUserCsvRows.value.map((row) => ({
    rowNumber: row.rowNumber,
    email: row.email,
    password: row.password,
    name: row.name,
    guildId: row.guildId,
    role: row.role
  }))
  const results: UserImportResultRow[] = []

  await useSpinner(async () => {
    for (const row of rows) {
      try {
        const uid = await createUser(row.email, row.password)

        try {
          await dbUserCreate(uid, row)
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            name: row.name,
            status: 'success',
            message: '登録しました。'
          })
        } catch (error) {
          const fallbackMessage =
            error instanceof Error && error.message
              ? `プロフィール保存に失敗しました。${error.message}`
              : 'プロフィール保存に失敗しました。Auth アカウントは作成済みの可能性があります。'

          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            name: row.name,
            status: 'error',
            message: fallbackMessage
          })
        }
      } catch (error) {
        results.push({
          rowNumber: row.rowNumber,
          email: row.email,
          name: row.name,
          status: 'error',
          message: getRegisterErrorMessage(error) || 'ユーザー登録に失敗しました。'
        })
      }
    }
  })

  userCsvImportResults.value = results

  const successCount = results.filter((row) => row.status === 'success').length
  const errorCount = results.length - successCount

  if (successCount > 0) {
    notifySuccess(`${successCount} 件のユーザーを登録しました。`)
  }
  if (errorCount > 0) {
    notifyError(`${errorCount} 件のユーザー登録に失敗しました。`)
  }

  clearUserCsvSelection(true)
}

const registerConfirm = () => {
  errors.value.message = validateRegisterInfo(registerInfo.value)?.message ?? ''
  errors.value.field = validateRegisterInfo(registerInfo.value)?.field ?? ''
  if (errors.value.message === '') {
    router.push({ name: 'RMUserRegisterConfirm' })
  }
}

const resetRegisterForm = () => {
  registerInfo.value = defaultRegisterInfo()
  errors.value = {
    field: '',
    message: ''
  }
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="user-register-shell">
      <Card class="user-register-card">
        <template #content>
          <div class="user-register-card__content">
            <RMPageHeader
              title="ユーザー CSV インポート"
              subtitle="Admin 専用"
              description="問題がない行だけをまとめて登録できます。"
              icon="pi pi-file-import"
            >
              <template #actions>
                <Tag
                  :value="userCsvStatusLabel"
                  :severity="
                    canImportUserCsv
                      ? 'success'
                      : userCsvPreviewRows.length > 0
                        ? 'warn'
                        : 'secondary'
                  "
                />
              </template>
            </RMPageHeader>

            <div class="rm-inline-note">
              ヘッダーは
              <span class="user-register-code">{{ userCsvHeaderText }}</span>
              を使用してください。role が空欄の場合は member として扱います。
            </div>

            <div class="user-register-import-toolbar">
              <FileUpload
                :key="userCsvUploadKey"
                mode="basic"
                accept=".csv,text/csv"
                chooseLabel="CSV を選択"
                class="user-register-import-upload"
                @select="onUserCsvSelect"
              />
              <RMButton
                label="選択をクリア"
                flat
                color="grey"
                :disabled="!userCsvFileName"
                @click="clearUserCsvSelection()"
              />
              <RMButton
                label="この内容で一括登録"
                color="primary"
                :disabled="!canImportUserCsv"
                @click="importUsersFromCsv"
              />
            </div>

            <div v-if="userCsvFileName" class="user-register-file-meta">
              選択中: {{ userCsvFileName }}
            </div>

            <div v-if="userCsvParseErrors.length" class="user-register-error-list">
              <div
                v-for="message in userCsvParseErrors"
                :key="message"
                class="user-register-error-list__item"
              >
                {{ message }}
              </div>
            </div>

            <div v-if="userCsvPreviewRows.length" class="user-register-preview">
              <div
                v-if="invalidUserCsvRows.length"
                class="user-register-preview-note user-register-preview-note--error"
              >
                エラーがある行は登録できません。CSV を修正して再選択してください。
              </div>
              <div
                v-else
                class="user-register-preview-note user-register-preview-note--success"
              >
                すべての行をそのまま一括登録できます。
              </div>

              <DataTable
                :value="userCsvPreviewRows"
                responsiveLayout="scroll"
                class="user-register-table"
              >
                <Column field="rowNumber" header="行" style="width: 72px" />
                <Column field="email" header="メールアドレス" />
                <Column field="name" header="表示名" />
                <Column field="guildId" header="所属ギルドID" />
                <Column header="権限" style="width: 160px">
                  <template #body="{ data }">
                    <Tag
                      :value="roleLabels[data.role]"
                      :severity="getRoleSeverity(data.role)"
                    />
                  </template>
                </Column>
                <Column header="状態" style="width: 140px">
                  <template #body="{ data }">
                    <Tag
                      :value="data.status === 'ready' ? 'OK' : 'NG'"
                      :severity="getPreviewStatusSeverity(data.status)"
                    />
                  </template>
                </Column>
                <Column field="message" header="メッセージ" />
              </DataTable>
            </div>

            <div v-if="userCsvImportResults.length" class="user-register-preview">
              <div class="rm-section-title">直近の実行結果</div>
              <DataTable
                :value="userCsvImportResults"
                responsiveLayout="scroll"
                class="user-register-table"
              >
                <Column field="rowNumber" header="行" style="width: 72px" />
                <Column field="email" header="メールアドレス" />
                <Column field="name" header="表示名" />
                <Column header="結果" style="width: 120px">
                  <template #body="{ data }">
                    <Tag
                      :value="data.status === 'success' ? '成功' : '失敗'"
                      :severity="getResultSeverity(data.status)"
                    />
                  </template>
                </Column>
                <Column field="message" header="メッセージ" />
              </DataTable>
            </div>
          </div>
        </template>
      </Card>

      <Card class="user-register-card">
        <template #content>
          <div class="user-register-card__content">
            <RMPageHeader
              title="ユーザー登録"
              subtitle="Admin 専用"
              icon="pi pi-user-plus"
            />

            <div class="rm-inline-note">
              実際の登録実行は次の確認画面で行います。
            </div>

            <div class="rm-form-grid rm-form-grid--two">
              <RMInput
                v-model="registerInfo.email"
                :class="{ _input_active: onFocus === 1 }"
                label="メールアドレス"
                type="email"
                requiredText="※必須"
                placeholder="sample@gmail.com"
                autocomplete="email"
                shadow
                :error2="errors.field === 'email'"
                @onFocus="onFocus = 1"
                @onBlur="onFocus = 0"
              />
              <RMInput
                v-model="registerInfo.password"
                :class="{ _input_active: onFocus === 2 }"
                label="パスワード"
                type="password"
                requiredText="※必須"
                placeholder="aa1234"
                autocomplete="new-password"
                shadow
                :error2="errors.field === 'password'"
                @onFocus="onFocus = 2"
                @onBlur="onFocus = 0"
              />
              <RMInput
                v-model="registerInfo.name"
                :class="{ _input_active: onFocus === 3 }"
                label="表示名"
                type="text"
                requiredText="※必須"
                placeholder="displayName"
                autocomplete="name"
                shadow
                :error2="errors.field === 'name'"
                @onFocus="onFocus = 3"
                @onBlur="onFocus = 0"
              />
              <RMInput
                v-model="registerInfo.guildId"
                :class="{ _input_active: onFocus === 4 }"
                label="所属ギルドID"
                type="text"
                placeholder="guild-id (任意)"
                autocomplete="off"
                shadow
                @onFocus="onFocus = 4"
                @onBlur="onFocus = 0"
              />
            </div>

            <div class="user-register-role">
              <div class="user-register-role__label">権限</div>
              <div class="user-register-role__help">
                迷った場合は通常メンバーを選び、必要な権限だけ後から付与してください。
              </div>
              <Dropdown
                v-model="registerInfo.role"
                :options="roleOptions"
                optionLabel="label"
                optionValue="value"
                class="user-register-role__dropdown"
                placeholder="権限を選択"
              />
            </div>

            <p v-if="errors.message" class="user-register-error">
              {{ errors.message }}
            </p>

            <div class="rm-actions user-register-actions">
              <RMButton
                label="ホームへ"
                flat
                color="grey"
                @click="router.push({ name: 'RMHome' })"
              />
              <RMButton
                label="入力をクリア"
                flat
                color="grey"
                @click="resetRegisterForm"
              />
              <RMButton
                label="確認へ進む"
                color="primary"
                @click="registerConfirm"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style lang="sass" scoped>
.user-register-shell
	display: flex
	flex-direction: column
	gap: 16px
	width: min(100%, 960px)

.user-register-card
	width: 100%
	overflow: hidden

.user-register-card__content
	display: flex
	flex-direction: column
	gap: 16px
	padding: clamp(16px, 2vw, 22px)

.user-register-code
	display: inline-flex
	padding: 2px 8px
	border-radius: 999px
	background: rgba(15, 23, 42, 0.08)
	font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace
	font-size: 12px

.user-register-import-toolbar
	display: grid
	grid-template-columns: minmax(0, 1fr) auto auto
	gap: 12px
	align-items: center

.user-register-import-upload
	width: 100%

.user-register-file-meta
	padding: 12px 14px
	border-radius: 16px
	background: rgba(15, 23, 42, 0.04)
	color: #475569
	word-break: break-word

.user-register-error-list
	display: grid
	gap: 10px

.user-register-error-list__item
	padding: 12px 14px
	border-radius: 16px
	background: rgba(239, 68, 68, 0.08)
	border: 1px solid rgba(239, 68, 68, 0.16)
	color: #b91c1c
	font-weight: 700

.user-register-preview
	display: flex
	flex-direction: column
	gap: 12px

.user-register-preview-note
	padding: 12px 14px
	border-radius: 16px
	font-weight: 700

.user-register-preview-note--error
	background: rgba(239, 68, 68, 0.08)
	border: 1px solid rgba(239, 68, 68, 0.16)
	color: #b91c1c

.user-register-preview-note--success
	background: rgba(34, 197, 94, 0.1)
	border: 1px solid rgba(34, 197, 94, 0.18)
	color: #166534

.user-register-role
	display: flex
	flex-direction: column
	gap: 8px
	padding: 14px
	border-radius: 18px
	border: 1px solid #e2e8f0
	background: rgba(248, 250, 252, 0.88)

.user-register-role__label
	font-size: 14px
	font-weight: 700
	color: #475569

.user-register-role__help
	font-size: 13px
	line-height: 1.6
	color: #64748b

.user-register-role__dropdown
	width: 100%

.user-register-error
	margin: 0
	padding: 12px 14px
	border-radius: 16px
	background: rgba(239, 68, 68, 0.08)
	border: 1px solid rgba(239, 68, 68, 0.16)
	color: #b91c1c
	font-weight: 700

._input_active::v-deep(._standard_or_shadow_width)
	outline: 1px solid #707070

@media (max-width: 767px)
	.user-register-import-toolbar
		grid-template-columns: 1fr

	.user-register-actions
		flex-direction: column
		align-items: stretch
</style>
