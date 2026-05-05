<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Drawer from 'primevue/drawer'
import ProgressSpinner from 'primevue/progressspinner'
import { dbGuildModule, dbUsersModule } from '@rm/db'
import {
  AppRole,
  AppUser,
  Guild,
  normalizeWeaponProficiencyLevels,
  weaponProficiencyDefinitions,
} from '@rm/types'
import RMGuildDetailMembersSection from './components/RMGuildDetailMembersSection.vue'
import RMGuildDetailOverviewSection from './components/RMGuildDetailOverviewSection.vue'
import RMGuildDetailSkillsSection from './components/RMGuildDetailSkillsSection.vue'
import type {
  GuildMemberSkillSummary,
  GuildSkillRow,
  GuildUserRow,
} from './types'
import {
  canManageGuildMembers,
  globalLoginUserData,
  hasAdmin,
} from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMFlowGuide from 'src/components/RMFlowGuide/RMFlowGuide.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import {
  notifyError,
  notifyInfo,
  notifySuccess,
} from 'src/composables/useAppNotifications'
import { fetchGuild, fetchGuildUsers } from 'src/services/guildData'
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
const isOverviewDrawerVisible = ref(false)
const isMembersDrawerVisible = ref(false)
const roleDrafts = ref<Record<string, AppRole>>({})
const skillTableFilters = ref({
  skillName: { value: '', matchMode: 'contains' },
  element: { value: null as string | null, matchMode: 'equals' },
  equipmentType: { value: null as string | null, matchMode: 'equals' },
  breakGauge: { value: null as number | null, matchMode: 'gte' },
  switchGauge: { value: null as number | null, matchMode: 'gte' },
  level: { value: null as number | null, matchMode: 'gte' },
})

const currentGuildId = computed(() =>
  typeof guildId.value === 'string' ? guildId.value : ''
)

const canEditGuild = computed(() => canManageGuildMembers.value)
const guildGuideItems = [
  {
    title: 'ギルド概要を把握する',
    description: 'まず基本情報とメンバー数を見て、今の運用状態を確認します。',
    targetId: 'guild-overview',
  },
  {
    title: 'スキルを横断検索する',
    description:
      'メンバー別の所持状況を見ながら、欲しいスキルを条件で絞り込みます。',
    targetId: 'guild-skill-search',
  },
  {
    title: 'メンバー運用を進める',
    description: '承認待ち確認、権限更新、必要なら個別のスキル編集へ進みます。',
    targetId: 'guild-member-management',
  },
]

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
    const appUser = guildUsersByUid.value.get(member.uid)
    const userSkill = userSkillsByUserId.value.get(member.uid)
    const ownedSkills = userSkill?.ownedSkills ?? []
    const ownedCount = ownedSkills.length
    const unlockRate =
      masterCount.value > 0 ? (ownedCount / masterCount.value) * 100 : 0
    const weaponProficiencyLevels = normalizeWeaponProficiencyLevels(
      appUser?.weaponProficiencyLevels
    )
    const weaponProficiencyCount = weaponProficiencyDefinitions.filter(
      ({ key }) => weaponProficiencyLevels[key] !== null
    ).length
    const weaponProficiencyProgressRate =
      weaponProficiencyDefinitions.length > 0
        ? (weaponProficiencyCount / weaponProficiencyDefinitions.length) * 100
        : 0
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
      weaponProficiencyCount,
      weaponProficiencyProgressRate,
      weaponProficiencyProgressRateText: `${weaponProficiencyProgressRate.toFixed(
        1
      )}%`,
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

const averageWeaponProficiencyProgressRate = computed(() => {
  if (!memberSkillSummaries.value.length) return 0
  return (
    memberSkillSummaries.value.reduce(
      (total, member) => total + member.weaponProficiencyProgressRate,
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
        name: detail.name || detail.skillId,
        characterName: detail.characterName || '',
        skillName: detail.skillName || '未設定',
        effect: detail.effect || '',
        element: detail.element || '未設定',
        equipmentType: detail.equipmentType || '未設定',
        skillType: detail.skillType || '通常',
        attackType: detail.attackType || '未設定',
        breakGauge: detail.breakGauge,
        switchGauge: detail.switchGauge,
        cooldown: detail.cooldown,
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
        a.name.localeCompare(b.name, 'ja')
    )
})

const normalizedSkillNameFilter = computed(() =>
  String(skillTableFilters.value.skillName.value || '')
    .trim()
    .toLowerCase()
)

const selectedElementFilter = computed(
  () => skillTableFilters.value.element.value || ''
)
const selectedEquipmentTypeFilter = computed(
  () => skillTableFilters.value.equipmentType.value || ''
)
const selectedBreakGaugeFilter = computed(() =>
  Number(skillTableFilters.value.breakGauge.value || 0)
)
const selectedSwitchGaugeFilter = computed(() =>
  Number(skillTableFilters.value.switchGauge.value || 0)
)
const selectedLevelFilter = computed(() =>
  Number(skillTableFilters.value.level.value || 0)
)

const filteredGuildSkillRows = computed(() => {
  return guildSkillRows.value.filter((row) => {
    const matchesSkillName =
      normalizedSkillNameFilter.value === '' ||
      [
        row.userName,
        row.skillId,
        row.name,
        row.characterName,
        row.skillName,
        row.effect,
        row.element,
        row.equipmentType,
        row.skillType,
        row.attackType,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSkillNameFilter.value)

    const matchesElement =
      selectedElementFilter.value === '' || row.element === selectedElementFilter.value
    const matchesEquipmentType =
      selectedEquipmentTypeFilter.value === '' ||
      row.equipmentType === selectedEquipmentTypeFilter.value
    const matchesBreakGauge =
      selectedBreakGaugeFilter.value <= 0 ||
      (row.breakGauge ?? Number.NEGATIVE_INFINITY) >= selectedBreakGaugeFilter.value
    const matchesSwitchGauge =
      selectedSwitchGaugeFilter.value <= 0 ||
      (row.switchGauge ?? Number.NEGATIVE_INFINITY) >=
        selectedSwitchGaugeFilter.value
    const matchesLevel =
      selectedLevelFilter.value <= 0 || row.level >= selectedLevelFilter.value

    return (
      matchesSkillName &&
      matchesElement &&
      matchesEquipmentType &&
      matchesBreakGauge &&
      matchesSwitchGauge &&
      matchesLevel
    )
  })
})

const elementOptions = computed(() => {
  return [
    ...new Set(
      skillStore.state.masterData.map((skill) => skill.element).filter(Boolean)
    ),
  ]
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((element) => ({ label: element, value: element }))
})

const equipmentTypeOptions = computed(() => {
  return [
    ...new Set(
      skillStore.state.masterData
        .map((skill) => skill.equipmentType)
        .filter(Boolean)
    ),
  ]
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((equipmentType) => ({ label: equipmentType, value: equipmentType }))
})

const activeFilterCount = computed(() => {
  return [
    normalizedSkillNameFilter.value !== '',
    selectedElementFilter.value !== '',
    selectedEquipmentTypeFilter.value !== '',
    selectedBreakGaugeFilter.value > 0,
    selectedSwitchGaugeFilter.value > 0,
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
    label: '平均熟練度進捗',
    value: `${averageWeaponProficiencyProgressRate.value.toFixed(1)}%`,
    icon: 'pi pi-chart-bar',
    tone: 'progress',
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
const guildFoundingDateLabel = computed(() =>
  formatGuildFoundingDate(guildDetail.value?.guildFoundingDateAt ?? null)
)

const searchGuide = computed(() => {
  if (activeFilterCount.value === 0) {
    return '検索条件が空の間は、ギルド内メンバーの全スキル一覧をそのまま確認できます。'
  }

  return `${activeFilterCount.value} 件の条件で ${filteredGuildSkillRows.value.length} 件を表示しています。自然属性、装備種別、Break/Switch、熟練度を組み合わせて絞り込めます。`
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
    guildUsers.value = await fetchGuildUsers(currentGuildId.value)
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
    const fetchedGuild = await fetchGuild(guildId.value as string)

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
    element: { value: null, matchMode: 'equals' },
    equipmentType: { value: null, matchMode: 'equals' },
    breakGauge: { value: null, matchMode: 'gte' },
    switchGauge: { value: null, matchMode: 'gte' },
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

const goToPostSkill = (member: {
  uid: string
  displayName: string
  role: AppRole
}) => {
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

          <div class="guild-detail-shortcuts">
            <button
              type="button"
              class="guild-detail-shortcut"
              @click="isOverviewDrawerVisible = true"
            >
              <div class="guild-detail-shortcut__title">ギルド概要を見る</div>
              <div class="guild-detail-shortcut__text">
                基本情報・運用メモ・全体サマリーは Drawer でまとめて確認できます。
              </div>
            </button>
            <button
              type="button"
              class="guild-detail-shortcut"
              @click="isMembersDrawerVisible = true"
            >
              <div class="guild-detail-shortcut__title">メンバー運用を開く</div>
              <div class="guild-detail-shortcut__text">
                承認待ち確認、権限変更、個別のスキル編集導線を Drawer に集約しています。
              </div>
            </button>
          </div>

          <div id="guild-skill-search" class="guild-detail-anchor">
            <RMGuildDetailSkillsSection
              :approvedMembers="approvedMembers"
              :memberSkillSummaries="memberSkillSummaries"
              :isSkillLoading="isSkillLoading"
              :isEditMode="isEditMode"
              :canManageGuildMembers="canManageGuildMembers"
              :currentUserId="globalLoginUserData.id"
              :roleLabels="roleLabels"
              :guildSkillRows="guildSkillRows"
              :filteredGuildSkillRows="filteredGuildSkillRows"
              :skillErrorMessage="skillErrorMessage"
              v-model:skillTableFilters="skillTableFilters"
              :elementOptions="elementOptions"
              :equipmentTypeOptions="equipmentTypeOptions"
              :searchGuide="searchGuide"
              :roleSeverity="roleSeverity"
              :attrSeverity="attrSeverity"
              @clear-filters="clearSkillFilters"
              @edit-member="goToPostSkill"
            />
          </div>

          <div class="rm-actions guild-detail-actions">
            <RMButton label="戻る" flat color="grey" @click="goBack" />
            <RMButton
              label="ギルド設定を編集"
              color="primary"
              :isDisable="!canEditGuild"
              @click="goToEditGuild"
            />
          </div>
        </div>
      </template>
    </Card>

    <Drawer
      v-if="guildDetail"
      v-model:visible="isOverviewDrawerVisible"
      position="right"
      header="ギルド概要"
      :style="{ width: 'min(96vw, 40rem)' }"
      class="guild-detail-drawer"
    >
      <div id="guild-overview" class="guild-detail-drawer__content">
        <RMFlowGuide
          title="このギルドで最初に見る場所"
          description="概要を把握してからスキル検索やメンバー運用へ進めるよう、補助情報を Drawer にまとめています。"
          :items="guildGuideItems"
        />

        <RMGuildDetailOverviewSection
          :guildDetail="guildDetail"
          :canManageGuildMembers="canManageGuildMembers"
          :managerGuide="managerGuide"
          :guildFoundingDateLabel="guildFoundingDateLabel"
          :summaryItems="summaryItems"
        />
      </div>
    </Drawer>

    <Drawer
      v-if="guildDetail"
      v-model:visible="isMembersDrawerVisible"
      position="right"
      header="メンバー運用"
      :style="{ width: 'min(96vw, 42rem)' }"
      class="guild-detail-drawer"
    >
      <div id="guild-member-management" class="guild-detail-drawer__content">
        <RMGuildDetailMembersSection
          :approvedMembers="approvedMembers"
          :pendingMembers="pendingMembers"
          :isEditMode="isEditMode"
          :canManageGuildMembers="canManageGuildMembers"
          :isMemberLoading="isMemberLoading"
          :currentUserId="globalLoginUserData.id"
          v-model:roleDrafts="roleDrafts"
          :roleOptions="roleOptions"
          :roleLabels="roleLabels"
          :canChangeRole="canChangeRole"
          :roleSeverity="roleSeverity"
          @edit-member="goToPostSkill"
          @save-role="saveRole"
          @revoke-approval="revokeApproval"
          @approve-member="approveMember"
        />
      </div>
    </Drawer>
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

.guild-detail-anchor {
  scroll-margin-top: calc(var(--rm-header-height) + 28px);
}

.guild-detail-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.guild-detail-shortcut {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border: 1px solid rgba(75, 105, 130, 0.14);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.guild-detail-shortcut:hover {
  transform: translateY(-1px);
  border-color: rgba(75, 105, 130, 0.34);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.guild-detail-shortcut__title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--rm-text);
}

.guild-detail-shortcut__text {
  color: var(--rm-text-soft);
  line-height: 1.7;
}

.guild-detail-drawer__content {
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
