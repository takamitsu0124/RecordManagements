<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, dbUsersModule } from '@rm/db'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { AppRole, AppUser, Guild } from '@rm/types'
import {
  canManageGuildMembers,
  globalLoginUserData,
  hasAdmin,
} from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import {
  notifyError,
  notifyInfo,
  notifySuccess,
} from 'src/composables/useAppNotifications'
import { useSkillStore } from 'src/store'

const route = useRoute()
const router = useRouter()
const skillStore = useSkillStore()

const guildId = ref<string | string[] | null>(null)
const guildDetail = ref<Guild | null>(null)
const guildUsers = ref<AppUser[]>([])
const isLoading = ref(true)
const isMemberLoading = ref(false)
const isSkillLoading = ref(false)
const errorMessage = ref<string | null>(null)
const skillErrorMessage = ref<string | null>(null)
const isEditMode = ref(false)
const roleDrafts = ref<Record<string, AppRole>>({})
const skillTableFilters = ref({
  skillName: { value: '', matchMode: 'contains' },
  attr: { value: null as string | null, matchMode: 'equals' },
  type: { value: null as string | null, matchMode: 'equals' },
  level: { value: null as number | null, matchMode: 'gte' },
})

type GuildUserRow = {
  uid: string
  displayName: string
  role: AppRole
  hasUserDocument: boolean
}

type GuildSkillRow = {
  rowId: string
  userId: string
  userName: string
  role: AppRole
  skillId: string
  skillName: string
  attr: string
  type: string
  level: number
  unlockRate: number
  unlockRateText: string
  ownedCount: number
  image: string
  masterMissing: boolean
}

type GuildMemberSkillSummary = {
  uid: string
  displayName: string
  role: AppRole
  ownedCount: number
  unlockRate: number
  unlockRateText: string
  topSkills: string[]
}

const currentGuildId = computed(() =>
  typeof guildId.value === 'string' ? guildId.value : ''
)

const canEditGuild = computed(() => canManageGuildMembers.value)

const guildScopedUsers = computed(() =>
  guildUsers.value.filter((user) => user.guildId === currentGuildId.value)
)

const roleOptions = computed(() => {
  if (hasAdmin.value) {
    return [
      { label: 'Admin', value: 'admin' as AppRole },
      { label: 'Guild Admin', value: 'guild_admin' as AppRole },
      { label: 'Member', value: 'member' as AppRole },
    ]
  }

  return [
    { label: 'Guild Admin', value: 'guild_admin' as AppRole },
    { label: 'Member', value: 'member' as AppRole },
  ]
})

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  guild_admin: 'Guild Admin',
  member: 'Member',
}

const guildUsersByUid = computed(() => {
  return new Map(
    guildUsers.value
      .filter((user) => user.guildId === currentGuildId.value)
      .map((user) => [user.uid || user.id, user])
  )
})

const approvedMembers = computed<GuildUserRow[]>(() => {
  const guildMember = guildDetail.value?.guildMember ?? {}

  return Object.entries(guildMember)
    .map(([uid, member]) => {
      const appUser = guildUsersByUid.value.get(uid)

      return {
        uid,
        displayName: appUser?.displayName || member.name || '未設定',
        role: appUser?.role || 'member',
        hasUserDocument: Boolean(appUser),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
})

const pendingMembers = computed<GuildUserRow[]>(() => {
  const guildMember = guildDetail.value?.guildMember ?? {}

  return guildScopedUsers.value
    .filter(
      (user) =>
        user.guildId === currentGuildId.value &&
        !(user.uid in guildMember) &&
        user.uid !== ''
    )
    .map((user) => ({
      uid: user.uid,
      displayName: user.displayName || '未設定',
      role: user.role,
      hasUserDocument: true,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
})

const approvedMemberIds = computed(() =>
  approvedMembers.value.map((member) => member.uid)
)

const masterCount = computed(() => skillStore.state.masterData.length)

const userSkillsByUserId = computed(() => {
  return new Map(
    skillStore.state.currentUserSkills.map((userSkill) => [
      userSkill.userId,
      userSkill,
    ])
  )
})

const memberSkillSummaries = computed<GuildMemberSkillSummary[]>(() => {
  return approvedMembers.value.map((member) => {
    const userSkill = userSkillsByUserId.value.get(member.uid)
    const ownedSkills = userSkill?.ownedSkills ?? []
    const ownedCount = ownedSkills.length
    const unlockRate =
      masterCount.value > 0 ? (ownedCount / masterCount.value) * 100 : 0
    const topSkills = ownedSkills
      .map((ownedSkill) => {
        const master = skillStore.masterDataById.value.get(ownedSkill.skillId)
        return {
          name: master?.name || ownedSkill.skillId,
          level: ownedSkill.level,
        }
      })
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'ja'))
      .slice(0, 3)
      .map((skill) => `${skill.name} Lv.${skill.level}`)

    return {
      uid: member.uid,
      displayName: member.displayName,
      role: member.role,
      ownedCount,
      unlockRate,
      unlockRateText: `${unlockRate.toFixed(1)}%`,
      topSkills,
    }
  })
})

const averageUnlockRate = computed(() => {
  if (!memberSkillSummaries.value.length) return 0
  return (
    memberSkillSummaries.value.reduce(
      (total, member) => total + member.unlockRate,
      0
    ) / memberSkillSummaries.value.length
  )
})

const guildSkillRows = computed<GuildSkillRow[]>(() => {
  const memberMap = new Map(
    approvedMembers.value.map((member) => [member.uid, member])
  )

  return skillStore.userSkillDetails.value
    .filter((detail) => memberMap.has(detail.userId))
    .map((detail) => {
      const member = memberMap.get(detail.userId)!
      const memberSummary = memberSkillSummaries.value.find(
        (summary) => summary.uid === detail.userId
      )

      return {
        rowId: `${detail.userId}:${detail.skillId}`,
        userId: detail.userId,
        userName: member.displayName,
        role: member.role,
        skillId: detail.skillId,
        skillName: detail.name || detail.skillId,
        attr: detail.attr || '未設定',
        type: detail.type || '未設定',
        level: detail.level,
        unlockRate: memberSummary?.unlockRate ?? 0,
        unlockRateText: memberSummary?.unlockRateText ?? '0.0%',
        ownedCount: memberSummary?.ownedCount ?? 0,
        image: detail.image,
        masterMissing: detail.masterMissing,
      }
    })
    .sort(
      (a, b) =>
        b.level - a.level ||
        a.userName.localeCompare(b.userName, 'ja') ||
        a.skillName.localeCompare(b.skillName, 'ja')
    )
})

const normalizedSkillNameFilter = computed(() =>
  String(skillTableFilters.value.skillName.value || '')
    .trim()
    .toLowerCase()
)

const selectedAttrFilter = computed(
  () => skillTableFilters.value.attr.value || ''
)
const selectedTypeFilter = computed(
  () => skillTableFilters.value.type.value || ''
)
const selectedLevelFilter = computed(() =>
  Number(skillTableFilters.value.level.value || 0)
)

const filteredGuildSkillRows = computed(() => {
  return guildSkillRows.value.filter((row) => {
    const matchesSkillName =
      normalizedSkillNameFilter.value === '' ||
      [row.skillName, row.skillId, row.userName].some((value) =>
        value.toLowerCase().includes(normalizedSkillNameFilter.value)
      )

    const matchesAttr =
      selectedAttrFilter.value === '' || row.attr === selectedAttrFilter.value
    const matchesType =
      selectedTypeFilter.value === '' || row.type === selectedTypeFilter.value
    const matchesLevel =
      selectedLevelFilter.value <= 0 || row.level >= selectedLevelFilter.value

    return matchesSkillName && matchesAttr && matchesType && matchesLevel
  })
})

const attrOptions = computed(() => {
  return [
    ...new Set(
      skillStore.state.masterData.map((skill) => skill.attr).filter(Boolean)
    ),
  ]
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((attr) => ({ label: attr, value: attr }))
})

const typeOptions = computed(() => {
  return [
    ...new Set(
      skillStore.state.masterData.map((skill) => skill.type).filter(Boolean)
    ),
  ]
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((type) => ({ label: type, value: type }))
})

const activeFilterCount = computed(() => {
  return [
    normalizedSkillNameFilter.value !== '',
    selectedAttrFilter.value !== '',
    selectedTypeFilter.value !== '',
    selectedLevelFilter.value > 0,
  ].filter(Boolean).length
})

const summaryItems = computed(() => [
  {
    label: '承認済みメンバー',
    value: `${approvedMembers.value.length}人`,
    icon: 'pi pi-check-circle',
    tone: 'approved',
  },
  {
    label: '承認待ち',
    value: `${pendingMembers.value.length}人`,
    icon: 'pi pi-clock',
    tone: 'pending',
  },
  {
    label: '検索対象スキル',
    value: `${guildSkillRows.value.length}件`,
    icon: 'pi pi-search',
    tone: 'skills',
  },
  {
    label: '平均解放率',
    value: `${averageUnlockRate.value.toFixed(1)}%`,
    icon: 'pi pi-chart-line',
    tone: 'unlock',
  },
  {
    label: '現在の表示モード',
    value:
      isEditMode.value && canManageGuildMembers.value
        ? '管理モード'
        : '閲覧モード',
    icon:
      isEditMode.value && canManageGuildMembers.value
        ? 'pi pi-pencil'
        : 'pi pi-eye',
    tone: 'mode',
  },
])

const managerGuide = computed(() =>
  hasAdmin.value
    ? 'Admin は承認、権限変更、ギルド編集に加え、スキル検索結果からメンバーの状況を横断確認できます。'
    : 'Guild Admin は自ギルドの承認・権限変更と、所持スキルの横断検索をこの画面から管理できます。'
)

const searchGuide = computed(() => {
  if (activeFilterCount.value === 0) {
    return '検索条件が空の間は、ギルド内メンバーの全スキル一覧をそのまま確認できます。'
  }

  return `${activeFilterCount.value} 件の条件で ${filteredGuildSkillRows.value.length} 件を表示しています。`
})

const syncRoleDrafts = () => {
  const nextDrafts: Record<string, AppRole> = {}

  for (const user of guildUsers.value) {
    if (user.uid) {
      nextDrafts[user.uid] = user.role
    }
  }

  roleDrafts.value = nextDrafts
}

const updateLocalGuildMembers = (guildMember: Guild['guildMember']) => {
  if (!guildDetail.value) return

  guildDetail.value = {
    ...guildDetail.value,
    guildMember,
    officialMembers: Object.keys(guildMember).length,
  }
}

const loadGuildUsers = async () => {
  if (!currentGuildId.value) return

  isMemberLoading.value = true

  try {
    const guildUsersQuery = query(
      collection(db, 'users'),
      where('guildId', '==', currentGuildId.value)
    )
    const guildUsersSnapshot = await getDocs(guildUsersQuery)
    guildUsers.value = guildUsersSnapshot.docs.map((doc) => {
      const data = doc.data() as AppUser
      return {
        ...data,
        id: data.id || doc.id,
        uid: data.uid || doc.id,
      }
    })
    syncRoleDrafts()
  } catch (error) {
    notifyError('ギルドメンバー管理情報の取得に失敗しました。')
    console.error('Error fetching guild users:', error)
  } finally {
    isMemberLoading.value = false
  }
}

const loadGuildSkillSearch = async () => {
  isSkillLoading.value = true
  skillErrorMessage.value = null

  try {
    await skillStore.fetchMasterData()
    await skillStore.fetchUsersSkills(approvedMemberIds.value)
  } catch (error) {
    skillErrorMessage.value = 'スキル検索用データの取得に失敗しました。'
    notifyError(skillErrorMessage.value)
    console.error('Error fetching guild skill search data:', error)
  } finally {
    isSkillLoading.value = false
  }
}

onMounted(async () => {
  guildId.value = route.params.guildId
  if (!guildId.value) {
    errorMessage.value = 'ギルドIDが指定されていません。'
    isLoading.value = false
    notifyError(errorMessage.value)
    router.push('/')
    return
  }

  try {
    isLoading.value = true
    await dbGuildModule.doc(guildId.value as string).fetch()
    const fetchedGuild = dbGuildModule.doc(guildId.value as string).data

    if (fetchedGuild) {
      guildDetail.value = fetchedGuild as Guild
      await loadGuildUsers()
      await loadGuildSkillSearch()
    } else {
      errorMessage.value = '指定されたギルドが見つかりませんでした。'
      notifyError(errorMessage.value)
      router.push('/')
    }
  } catch (error) {
    errorMessage.value = 'ギルド情報の取得中にエラーが発生しました。'
    notifyError(errorMessage.value)
    console.error('Error fetching guild detail:', error)
    router.push('/')
  } finally {
    isLoading.value = false
  }
})

const formatGuildFoundingDate = (date: Date | null) => {
  if (!date) return '不明'
  return new Intl.DateTimeFormat('ja-JP').format(date)
}

const clearSkillFilters = () => {
  skillTableFilters.value = {
    skillName: { value: '', matchMode: 'contains' },
    attr: { value: null, matchMode: 'equals' },
    type: { value: null, matchMode: 'equals' },
    level: { value: null, matchMode: 'gte' },
  }
}

const goToGuildSchedule = () => {
  if (!currentGuildId.value) {
    notifyError('ギルド日程調整を開くための guildId が見つかりません。')
    return
  }

  router.push({
    name: 'RMGuildSchedule',
    params: { guildId: currentGuildId.value },
  })
}

const goToEditGuild = () => {
  if (!canEditGuild.value) {
    notifyError('ギルド情報を編集する権限がありません。')
    return
  }

  if (guildId.value) {
    router.push({
      name: 'RMGuildEdit',
      params: { guildId: guildId.value as string },
    })
  } else {
    notifyError('編集するギルドのIDが見つかりません。')
  }
}

const goBack = () => {
  router.go(-1)
}

const goToPostSkill = (member: { uid: string; displayName: string; role: AppRole }) => {
  if (!isEditMode.value) return

  if (guildId.value) {
    router.push({
      name: 'RMSkillPost',
      params: { guildId: guildId.value as string, userId: member.uid },
      query: {
        displayName: member.displayName,
        role: member.role,
      },
    })
  }
}

const approveMember = async (member: GuildUserRow) => {
  if (!guildDetail.value || !currentGuildId.value) {
    notifyError('承認対象のギルド情報が見つかりません。')
    return
  }

  await useSpinner(async () => {
    try {
      const guildMember = {
        ...guildDetail.value?.guildMember,
        [member.uid]: {
          name: member.displayName,
        },
      }

      await dbGuildModule.doc(currentGuildId.value).merge({
        guildMember,
        officialMembers: Object.keys(guildMember).length,
      })

      updateLocalGuildMembers(guildMember)
      await loadGuildSkillSearch()
      notifySuccess(`${member.displayName} さんを承認しました。`)
    } catch (error) {
      notifyError('メンバー承認に失敗しました。')
      console.error('Approve member failed:', error)
    }
  })
}

const revokeApproval = async (member: GuildUserRow) => {
  if (!guildDetail.value || !currentGuildId.value) {
    notifyError('更新対象のギルド情報が見つかりません。')
    return
  }

  await useSpinner(async () => {
    try {
      const guildMember = { ...guildDetail.value?.guildMember }
      delete guildMember[member.uid]

      await dbGuildModule.doc(currentGuildId.value).merge({
        guildMember,
        officialMembers: Object.keys(guildMember).length,
      })

      updateLocalGuildMembers(guildMember)
      await loadGuildSkillSearch()
      notifyInfo(`${member.displayName} さんを承認待ちに戻しました。`)
    } catch (error) {
      notifyError('承認状態の更新に失敗しました。')
      console.error('Revoke approval failed:', error)
    }
  })
}

const saveRole = async (member: GuildUserRow) => {
  const nextRole = roleDrafts.value[member.uid]
  if (!nextRole) {
    notifyError('更新するロールが選択されていません。')
    return
  }

  if (!hasAdmin.value && nextRole === 'admin') {
    notifyError('Guild Admin は Admin 権限を付与できません。')
    roleDrafts.value[member.uid] = member.role
    return
  }

  await useSpinner(async () => {
    try {
      await dbUsersModule.doc(member.uid).merge({
        role: nextRole,
      })

      guildUsers.value = guildUsers.value.map((user) =>
        user.uid === member.uid ? { ...user, role: nextRole } : user
      )
      if (globalLoginUserData.value.id === member.uid) {
        globalLoginUserData.value = {
          ...globalLoginUserData.value,
          role: nextRole,
        }
      }
      roleDrafts.value[member.uid] = nextRole
      notifySuccess(`${member.displayName} さんの権限を更新しました。`)
    } catch (error) {
      roleDrafts.value[member.uid] = member.role
      notifyError('権限の更新に失敗しました。')
      console.error('Update role failed:', error)
    }
  })
}

const canChangeRole = (member: GuildUserRow) => {
  if (!member.hasUserDocument) return false
  if (!hasAdmin.value && member.role === 'admin') return false
  return true
}

const roleSeverity = (role: AppRole) => {
  if (role === 'admin') return 'danger'
  if (role === 'guild_admin') return 'info'
  return 'secondary'
}

const attrSeverity = (attr: string) => {
  if (attr === '火') return 'danger'
  if (attr === '水') return 'info'
  if (attr === '風') return 'success'
  if (attr === '土') return 'warn'
  return 'secondary'
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div v-if="isLoading" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">ギルド情報を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="rm-state-card">
      <RMEmptyState
        icon="pi pi-exclamation-circle"
        title="ギルド情報を表示できません"
        :message="errorMessage"
      >
        <template #actions>
          <RMButton
            label="ホームに戻る"
            color="primary"
            @click="router.push('/')"
          />
        </template>
      </RMEmptyState>
    </div>

    <Card v-else-if="guildDetail" class="guild-detail-card">
      <template #content>
        <div class="guild-detail-card__content">
          <RMPageHeader
            :title="guildDetail.guildName"
            :subtitle="`ID: ${guildDetail.id}`"
            :description="
              isEditMode && canManageGuildMembers
                ? '管理モードでは承認・権限変更に加え、検索結果からスキル詳細編集へ進めます。'
                : '通常は閲覧モードです。スキル検索は常に使え、管理権限がある場合のみ運用操作が有効になります。'
            "
            icon="pi pi-users"
          >
            <template #actions>
              <Button
                label="日程調整"
                outlined
                severity="contrast"
                @click="goToGuildSchedule"
              />
              <RMModeToggle
                v-model="isEditMode"
                onLabel="管理モード"
                offLabel="閲覧モード"
                :disabled="!canManageGuildMembers"
              />
            </template>
          </RMPageHeader>

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

          <Divider />

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
                    {{
                      formatGuildFoundingDate(guildDetail.guildFoundingDateAt)
                    }}
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
                    <div class="guild-panel-header__title">
                      スキル検索の使い方
                    </div>
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
                    文字入力するごとに即時反映されます。属性・種別・熟練度も同時に絞り込めます。
                  </p>
                </div>
                <div class="guild-operations__item">
                  <div class="guild-operations__title">メンバー概要</div>
                  <p class="guild-operations__text">
                    左側のメンバーカードで所持数と解放率を確認し、右側の結果表で該当スキルを探せます。
                  </p>
                </div>
                <div class="guild-operations__item">
                  <div class="guild-operations__title">管理モード</div>
                  <p class="guild-operations__text">
                    承認済みメンバーごとに、所持スキルと画像管理だけへ絞った画面を開けます。
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <Divider />

          <div class="guild-search-grid">
            <Panel class="guild-skill-overview-panel">
              <template #header>
                <div class="guild-panel-header">
                  <div>
                    <div class="guild-panel-header__title">
                      メンバー別スキル状況
                    </div>
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
                <ProgressSpinner
                  strokeWidth="5"
                  style="width: 40px; height: 40px"
                />
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
                          v-if="member.uid === globalLoginUserData.id"
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
                      @click="goToPostSkill(member)"
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
                  v-model="skillTableFilters.skillName.value"
                  placeholder="スキル名・ID・メンバー名で検索"
                />
                <Dropdown
                  v-model="skillTableFilters.attr.value"
                  :options="attrOptions"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  placeholder="属性"
                />
                <Dropdown
                  v-model="skillTableFilters.type.value"
                  :options="typeOptions"
                  optionLabel="label"
                  optionValue="value"
                  showClear
                  filter
                  placeholder="種別"
                />
                <InputNumber
                  v-model="skillTableFilters.level.value"
                  :min="0"
                  :useGrouping="false"
                  placeholder="熟練度以上"
                />
                <Button
                  label="条件をクリア"
                  severity="secondary"
                  outlined
                  class="guild-search-toolbar__clear"
                  @click="clearSkillFilters"
                />
              </div>

              <div class="guild-panel-note">
                {{ searchGuide }}
              </div>

              <div v-if="isSkillLoading" class="guild-detail-card__substate">
                <ProgressSpinner
                  strokeWidth="5"
                  style="width: 40px; height: 40px"
                />
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
                    v-model:filters="skillTableFilters"
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
                    <Column
                      field="userName"
                      header="メンバー"
                      style="min-width: 180px"
                    >
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
                              v-if="data.userId === globalLoginUserData.id"
                              value="自分"
                              severity="info"
                            />
                          </div>
                        </div>
                      </template>
                    </Column>
                    <Column
                      field="skillName"
                      header="スキル"
                      style="min-width: 240px"
                    >
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
                        <Tag
                          :value="data.attr"
                          :severity="attrSeverity(data.attr)"
                        />
                      </template>
                    </Column>
                    <Column
                      field="type"
                      header="種別"
                      style="min-width: 180px"
                    />
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
                    <Column
                      field="ownedCount"
                      header="所持数"
                      style="width: 100px"
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
                      <Tag
                        :value="row.attr"
                        :severity="attrSeverity(row.attr)"
                      />
                      <Tag
                        :value="roleLabels[row.role]"
                        :severity="roleSeverity(row.role)"
                      />
                      <Tag
                        :value="`解放率 ${row.unlockRateText}`"
                        severity="info"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </Panel>
          </div>

          <Divider />

          <div class="guild-member-sections">
            <Panel class="guild-members-panel">
              <template #header>
                <div class="guild-panel-header">
                  <div>
                    <div class="guild-panel-header__title">
                      承認済みメンバー運用
                    </div>
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
                管理モード中は、各メンバーの所持スキル・画像管理だけを開けます。
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
                              v-if="member.uid === globalLoginUserData.id"
                              value="自分"
                              severity="info"
                            />
                          </div>
                        </div>
                        <div class="guild-member-item__subtext">
                          {{
                            isEditMode && canManageGuildMembers
                              ? '管理モード中は、このメンバーの所持スキル・画像管理画面へ進めます。'
                              : '承認済みメンバーとして運用対象に含まれています。'
                          }}
                        </div>
                      </div>
                    </div>
                    <Button
                      v-if="isEditMode && canManageGuildMembers"
                      label="スキル・画像を編集"
                      outlined
                      severity="contrast"
                      class="guild-member-item__link"
                      @click="goToPostSkill(member)"
                    />
                  </div>

                  <div
                    v-if="canManageGuildMembers"
                    class="guild-member-item__management"
                  >
                    <Dropdown
                      v-model="roleDrafts[member.uid]"
                      :options="roleOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="ロールを選択"
                      class="guild-member-item__dropdown"
                      :disabled="!canChangeRole(member)"
                    />
                    <RMButton
                      label="権限を保存"
                      color="primary"
                      width="140px"
                      :isDisable="
                        !canChangeRole(member) ||
                        roleDrafts[member.uid] === member.role
                      "
                      @click="saveRole(member)"
                    />
                    <RMButton
                      label="承認解除"
                      flat
                      color="grey"
                      width="120px"
                      @click="revokeApproval(member)"
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
                    <div class="guild-panel-header__title">
                      承認待ちメンバー
                    </div>
                    <div class="guild-panel-header__subtitle">
                      users.guildId はあるが guildMember
                      に未登録のユーザーです。
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
                <ProgressSpinner
                  strokeWidth="5"
                  style="width: 40px; height: 40px"
                />
                <p class="rm-muted">承認待ちメンバーを読み込み中...</p>
              </div>
              <div
                v-else-if="pendingMembers.length > 0"
                class="guild-member-list"
              >
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
                      v-model="roleDrafts[member.uid]"
                      :options="roleOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="ロールを選択"
                      class="guild-member-item__dropdown"
                      :disabled="!canChangeRole(member)"
                    />
                    <RMButton
                      label="権限を保存"
                      color="primary"
                      width="140px"
                      :isDisable="
                        !canChangeRole(member) ||
                        roleDrafts[member.uid] === member.role
                      "
                      @click="saveRole(member)"
                    />
                    <RMButton
                      label="承認"
                      color="primary"
                      width="120px"
                      @click="approveMember(member)"
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

          <div class="rm-actions guild-detail-actions">
            <RMButton label="戻る" flat color="grey" @click="goBack" />
            <RMButton
              label="ギルドを編集"
              color="primary"
              :isDisable="!canEditGuild"
              @click="goToEditGuild"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.guild-detail-card {
  width: min(100%, 1240px);
}

.guild-detail-card__content {
  padding: clamp(16px, 2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.guild-summary-card--mode {
  border-color: #dbeafe;
}

.guild-detail-overview-grid,
.guild-search-grid,
.guild-member-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.guild-search-grid {
  align-items: start;
}

.guild-overview-panel,
.guild-skill-overview-panel,
.guild-search-panel,
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

.guild-detail-actions {
  margin-top: 4px;
}

@media (max-width: 1023px) {
  .guild-member-item__main,
  .guild-skill-overview-item__head {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .guild-detail-card__content {
    padding: 16px;
  }

  .guild-search-table-shell {
    display: none;
  }

  .guild-skill-mobile-list {
    display: grid;
    gap: 12px;
  }

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
