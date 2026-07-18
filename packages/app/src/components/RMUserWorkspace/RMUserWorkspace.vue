<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import { dbUsersModule, dbUserSkillsModule } from '@rm/db'
import type {
  AppUser,
  OwnedSkill,
  SkillMaster,
  UserSkill,
  WeaponProficiencyKey} from '@rm/types'
import {
  defaultAppUser,
  defaultSkillMaster,
  defaultUserSkill,
  normalizeWeaponProficiencyLevels,
  normalizeWeaponProficiencySkillProgress,
  weaponProficiencyDefinitions,
  weaponProficiencyLevelOptions,
  weaponProficiencyMaxLevel,
  weaponProficiencyMinLevel
} from '@rm/types'
import RMUserWorkspaceProficiencySkillSection from './RMUserWorkspaceProficiencySkillSection.vue'
import RMUserWorkspaceProfileSection from './RMUserWorkspaceProfileSection.vue'
import RMUserWorkspaceSkillsSection from './RMUserWorkspaceSkillsSection.vue'
import type {
  OwnedSkillRow,
  SkillCatalogRow,
  SkillCatalogSortOption,
  SkillCatalogStatus,
  WorkspaceProfile
} from './types'
import { defaultWorkspaceProfile } from './types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMInlineTabs from 'src/components/RMInlineTabs/RMInlineTabs.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import RMSectionEdit from 'src/components/RMSectionEdit/RMSectionEdit.vue'
import { globalLoginUserData, hasAdmin } from 'src/boot/main'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import {
  notifyError,
  notifyInfo,
  notifySuccess
} from 'src/composables/useAppNotifications'
import { useSkillStore } from 'src/store'
import { buildSkillMasterSearchText } from 'src/helpers/skillMasterSchema'

const props = withDefaults(
  defineProps<{
    userId: string
    includeProfile?: boolean
    compactMode?: boolean
    fallbackAppUser?: Partial<AppUser> | null
    pageTitle?: string
    pageIcon?: string
    backLabel?: string
  }>(),
  {
    includeProfile: true,
    compactMode: false,
    fallbackAppUser: null,
    pageTitle: 'マイページ',
    pageIcon: 'pi pi-user',
    backLabel: '戻る'
  }
)

const emit = defineEmits<{
  (e: 'back'): void
}>()

const skillStore = useSkillStore()

const situationOptions: AppUser['situation'][] = ['現役', '隠居', '引退', '']

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const appUserExists = ref(false)
const userSkillExists = ref(false)

const user = ref<WorkspaceProfile>(defaultWorkspaceProfile())
const originalUser = ref<WorkspaceProfile>(defaultWorkspaceProfile())
const appUser = ref<AppUser>(defaultAppUser())
const originalAppUser = ref<AppUser>(defaultAppUser())
const ownedSkills = ref<OwnedSkill[]>([])
const originalOwnedSkills = ref<OwnedSkill[]>([])

const affiliationDateStr = ref<string | null>(null)
const gameStartDateAtStr = ref<string | null>(null)
const birthDateAtStr = ref<string | null>(null)
const originalAffiliationDateStr = ref<string | null>(null)
const originalGameStartDateAtStr = ref<string | null>(null)
const originalBirthDateAtStr = ref<string | null>(null)

const skillCatalogQuery = ref('')
const skillCatalogElement = ref('all')
const skillCatalogEquipmentType = ref('all')
const skillCatalogStatus = ref<SkillCatalogStatus>('unowned')
const skillCatalogSortOption = ref<SkillCatalogSortOption>('default')
const skillCatalogPage = ref(0)

const pageSubtitle = computed(() => user.value.displayName || '登録内容未設定')
const showProfile = computed(() => props.includeProfile)
const isCompactMode = computed(() => props.compactMode)
const canEditGuildId = computed(() => hasAdmin.value)

type WorkspaceSectionKey = 'profile' | 'skills' | 'level' | 'proficiency-skill'

const activeWorkspaceTab = ref<WorkspaceSectionKey>('skills')
const editingSection = ref<WorkspaceSectionKey | null>(null)

const workspaceTabs = computed(() => {
  const tabs: { key: WorkspaceSectionKey; label: string; badge?: number }[] = []

  if (showProfile.value) {
    tabs.push({ key: 'profile', label: 'プロフィール' })
  }

  tabs.push({
    key: 'skills',
    label: '所持スキル',
    badge: ownedSkillRows.value.length
  })

  if (isCompactMode.value) {
    tabs.push({ key: 'level', label: '熟練度Lv' })
  }

  tabs.push({ key: 'proficiency-skill', label: '武器熟練度スキル' })

  return tabs
})

const isSectionEditing = (key: WorkspaceSectionKey) =>
  editingSection.value === key

const setSectionEditing = (key: WorkspaceSectionKey, value: boolean) => {
  editingSection.value = value ? key : null
}

const weaponProficiencyFields = computed(() =>
  weaponProficiencyDefinitions.map((definition) => ({
    ...definition,
    value: user.value.weaponProficiencyLevels[definition.key]
  }))
)

const ownedSkillRows = computed<OwnedSkillRow[]>(() =>
  ownedSkills.value.map((ownedSkill, index) => {
    const master = skillStore.masterDataById.value.get(ownedSkill.skillId)
    const fallbackMaster = master
      ? master
      : {
          ...defaultSkillMaster(),
          id: ownedSkill.skillId,
          name: ownedSkill.skillId
        }

    return {
      index,
      skillId: ownedSkill.skillId,
      level: ownedSkill.level,
      name: fallbackMaster.name || ownedSkill.skillId,
      characterName: fallbackMaster.characterName || '',
      element: fallbackMaster.element || '未設定',
      equipmentType: fallbackMaster.equipmentType || '未設定',
      skillType: fallbackMaster.skillType || '通常',
      skillName: fallbackMaster.skillName || '未設定',
      effect: fallbackMaster.effect || '',
      image: fallbackMaster.image,
      imageThumb: fallbackMaster.imageThumb || '',
      masterMissing: !master
    }
  })
)

const ownedSkillIdSet = computed(
  () => new Set(ownedSkills.value.map((skill) => skill.skillId))
)
const ownedSkillLevelById = computed(
  () => new Map(ownedSkills.value.map((skill) => [skill.skillId, skill.level]))
)
const normalizedSkillCatalogQuery = computed(() =>
  skillCatalogQuery.value.trim().toLowerCase()
)
const skillMasterSearchTextById = computed(
  () =>
    new Map(
      skillStore.state.masterData.map((skill) => [
        skill.id,
        buildSkillMasterSearchText(skill)
      ])
    )
)
const weaponProficiencyLevelRangeLabel = `${weaponProficiencyMinLevel}〜${weaponProficiencyMaxLevel}`
const skillCatalogPageSize = 25

const skillCatalogElementOptions = computed(() =>
  [...new Set(skillStore.state.masterData.map((skill) => skill.element.trim()))]
    .filter((value): value is string => value !== '')
    .sort((a, b) => a.localeCompare(b, 'ja'))
)

const skillCatalogEquipmentTypeOptions = computed(() =>
  [
    ...new Set(
      skillStore.state.masterData.map((skill) => skill.equipmentType.trim())
    )
  ]
    .filter((value): value is string => value !== '')
    .sort((a, b) => a.localeCompare(b, 'ja'))
)

// nullは「未設定」として並び順の末尾に固定する(昇順・降順のどちらでも
// 値が無いスキルが先頭に来て埋もれてしまわないようにするため)。
const compareNullableGaugeValue = (
  left: number | null,
  right: number | null,
  direction: 1 | -1
) => {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return (left - right) * direction
}

const sortSkillCatalogRows = (
  rows: SkillCatalogRow[],
  sortOption: SkillCatalogSortOption
): SkillCatalogRow[] => {
  if (sortOption === 'default') return rows

  const direction = sortOption.endsWith('Desc') ? -1 : 1
  const field = sortOption.startsWith('breakGauge')
    ? 'breakGauge'
    : 'switchGauge'

  return [...rows].sort((a, b) =>
    compareNullableGaugeValue(a[field], b[field], direction)
  )
}

const filteredSkillCatalogRows = computed<SkillCatalogRow[]>(() => {
  const rows: SkillCatalogRow[] = []
  const query = normalizedSkillCatalogQuery.value
  const selectedStatus = skillCatalogStatus.value
  const selectedElement = skillCatalogElement.value
  const selectedEquipmentType = skillCatalogEquipmentType.value
  const ownedSkillIds = ownedSkillIdSet.value
  const ownedSkillLevels = ownedSkillLevelById.value
  const searchTextById = skillMasterSearchTextById.value

  for (const skill of skillStore.state.masterData) {
    const isOwned = ownedSkillIds.has(skill.id)

    if (selectedStatus === 'owned' && !isOwned) continue
    if (selectedStatus === 'unowned' && isOwned) continue
    if (selectedElement !== 'all' && skill.element !== selectedElement) continue
    if (
      selectedEquipmentType !== 'all' &&
      skill.equipmentType !== selectedEquipmentType
    ) {
      continue
    }
    if (query && !searchTextById.get(skill.id)?.includes(query)) continue

    rows.push({
      ...skill,
      isOwned,
      ownedLevel: ownedSkillLevels.get(skill.id) ?? 0
    })
  }

  return sortSkillCatalogRows(rows, skillCatalogSortOption.value)
})

const visibleSkillCatalogRows = computed(() => {
  const first = skillCatalogPage.value * skillCatalogPageSize
  return filteredSkillCatalogRows.value.slice(
    first,
    first + skillCatalogPageSize
  )
})

const cloneUser = (
  payload?: Partial<WorkspaceProfile> | null
): WorkspaceProfile => {
  const base = defaultWorkspaceProfile()
  const nextUser = {
    ...base,
    ...(payload || {})
  }

  return {
    ...nextUser,
    email: payload?.email ?? base.email,
    phone: payload?.phone ?? base.phone,
    imageUrls: Array.isArray(payload?.imageUrls)
      ? payload.imageUrls.filter(
          (url): url is string => typeof url === 'string'
        )
      : [],
    weaponProficiencyLevels: normalizeWeaponProficiencyLevels(
      payload?.weaponProficiencyLevels
    ),
    weaponProficiencySkillProgress: normalizeWeaponProficiencySkillProgress(
      payload?.weaponProficiencySkillProgress
    )
  }
}

const cloneAppUser = (payload?: Partial<AppUser> | null): AppUser => ({
  ...defaultAppUser(),
  ...(payload || {}),
  weaponProficiencyLevels: normalizeWeaponProficiencyLevels(
    payload?.weaponProficiencyLevels
  ),
  weaponProficiencySkillProgress: normalizeWeaponProficiencySkillProgress(
    payload?.weaponProficiencySkillProgress
  ),
  role: payload?.role || 'member'
})

const createUserProfileFromAppUser = (
  payload?: Partial<AppUser> | null
): WorkspaceProfile => {
  return cloneUser({
    displayName: payload?.displayName || '',
    displayNameKana: payload?.displayNameKana || '',
    guildId: payload?.guildId || '',
    affiliationDate: payload?.affiliationDate || null,
    affiliationNum: payload?.affiliationNum || 0,
    situation: payload?.situation || '現役',
    gameStartDateAt: payload?.gameStartDateAt || null,
    email: payload?.email || '',
    phone: payload?.phone || '',
    birthDateAt: payload?.birthDateAt || null,
    imageUrls: payload?.imageUrls || [],
    weaponProficiencyLevels: payload?.weaponProficiencyLevels,
    weaponProficiencySkillProgress: payload?.weaponProficiencySkillProgress
  })
}

const resolveFallbackWorkspaceAppUser = (): AppUser | null => {
  if (
    props.userId === globalLoginUserData.value.id &&
    globalLoginUserData.value.id
  ) {
    return cloneAppUser({
      ...globalLoginUserData.value,
      id: props.userId,
      uid: props.userId
    })
  }

  if (props.fallbackAppUser) {
    return cloneAppUser({
      id: props.userId,
      uid: props.userId,
      ...props.fallbackAppUser
    })
  }

  return null
}

const cloneOwnedSkills = (payload: OwnedSkill[]): OwnedSkill[] => {
  const seenSkillIds = new Set<string>()

  return payload
    .map((skill) => ({
      skillId: skill.skillId.trim(),
      level:
        typeof skill.level === 'number' && Number.isFinite(skill.level)
          ? Math.max(0, Math.round(skill.level))
          : 0
    }))
    .filter((skill) => {
      if (!skill.skillId || seenSkillIds.has(skill.skillId)) {
        return false
      }

      seenSkillIds.add(skill.skillId)
      return true
    })
}

const dateToModel = (value: Date | null | undefined) => {
  if (!value) return null

  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}/${month}/${day}`
}

const modelToDate = (value: string | null) => (value ? new Date(value) : null)

const syncDateModels = (payload: WorkspaceProfile) => {
  affiliationDateStr.value = dateToModel(payload.affiliationDate)
  gameStartDateAtStr.value = dateToModel(payload.gameStartDateAt)
  birthDateAtStr.value = dateToModel(payload.birthDateAt)

  originalAffiliationDateStr.value = affiliationDateStr.value
  originalGameStartDateAtStr.value = gameStartDateAtStr.value
  originalBirthDateAtStr.value = birthDateAtStr.value
}

const resetSkillFilters = () => {
  skillCatalogQuery.value = ''
  skillCatalogElement.value = 'all'
  skillCatalogEquipmentType.value = 'all'
  skillCatalogStatus.value = 'unowned'
  skillCatalogSortOption.value = 'default'
  skillCatalogPage.value = 0
}

const resetDraft = () => {
  user.value = cloneUser(originalUser.value)
  appUser.value = cloneAppUser(originalAppUser.value)
  ownedSkills.value = cloneOwnedSkills(originalOwnedSkills.value)
  affiliationDateStr.value = originalAffiliationDateStr.value
  gameStartDateAtStr.value = originalGameStartDateAtStr.value
  birthDateAtStr.value = originalBirthDateAtStr.value
  resetSkillFilters()
}

const loadWorkspace = async () => {
  if (!props.userId) {
    errorMessage.value = 'ユーザーIDが指定されていません。'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = null
    resetSkillFilters()

    await skillStore.fetchMasterData()
    await skillStore.fetchUserSkills(props.userId)

    const appPayload = await dbUsersModule
      .doc(props.userId)
      .fetch({ force: true })

    const nextAppUser = appPayload?.id
      ? cloneAppUser(appPayload)
      : resolveFallbackWorkspaceAppUser()

    if (!nextAppUser) {
      errorMessage.value = props.includeProfile
        ? 'users コレクションにユーザー情報が見つかりませんでした。対象ユーザーに一度ログインしてもらってから再度確認してください。'
        : 'users コレクションにユーザー情報が見つかりませんでした。対象ユーザーの基本情報が未作成のため、この画面を開けません。'
      return
    }

    appUserExists.value = Boolean(appPayload?.id)

    const nextUser = createUserProfileFromAppUser(nextAppUser)
    const nextUserSkill = skillStore.state.currentUserSkills.find(
      (userSkill) => userSkill.userId === props.userId
    )

    user.value = nextUser
    originalUser.value = cloneUser(nextUser)
    appUser.value = nextAppUser
    originalAppUser.value = cloneAppUser(nextAppUser)
    ownedSkills.value = cloneOwnedSkills(nextUserSkill?.ownedSkills ?? [])
    originalOwnedSkills.value = cloneOwnedSkills(
      nextUserSkill?.ownedSkills ?? []
    )
    userSkillExists.value = Boolean(nextUserSkill?.id)
    syncDateModels(nextUser)

    activeWorkspaceTab.value = 'skills'
    editingSection.value = null
  } catch (error) {
    errorMessage.value = '登録内容の読み込み中にエラーが発生しました。'
    console.error('Failed to load user workspace:', error)
  } finally {
    isLoading.value = false
  }
}

const addOwnedSkill = (skill: SkillMaster) => {
  if (ownedSkillIdSet.value.has(skill.id)) {
    void notifyInfo('そのスキルは既に追加されています。')
    return
  }

  ownedSkills.value.push({
    skillId: skill.id,
    level: 0
  })
}

const removeOwnedSkill = (skillId: string) => {
  ownedSkills.value = ownedSkills.value.filter(
    (skill) => skill.skillId !== skillId
  )
}

const updateWeaponProficiencyLevel = (
  key: WeaponProficiencyKey,
  value: number | null
) => {
  user.value = cloneUser({
    ...user.value,
    weaponProficiencyLevels: {
      ...user.value.weaponProficiencyLevels,
      [key]: typeof value === 'number' && Number.isFinite(value) ? value : null
    }
  })
}

const toggleOwnedSkill = (skill: SkillMaster) => {
  if (ownedSkillIdSet.value.has(skill.id)) {
    removeOwnedSkill(skill.id)
    return
  }

  addOwnedSkill(skill)
}

watch(
  [
    skillCatalogQuery,
    skillCatalogElement,
    skillCatalogEquipmentType,
    skillCatalogStatus,
    skillCatalogSortOption
  ],
  () => {
    skillCatalogPage.value = 0
  }
)

watch(
  () => filteredSkillCatalogRows.value.length,
  (total) => {
    const maxPage = Math.max(Math.ceil(total / skillCatalogPageSize) - 1, 0)
    if (skillCatalogPage.value > maxPage) {
      skillCatalogPage.value = maxPage
    }
  }
)

watch(
  () => props.userId,
  async (nextUserId, previousUserId) => {
    if (nextUserId === previousUserId) return

    editingSection.value = null
    await loadWorkspace()
  }
)

onMounted(async () => {
  await loadWorkspace()
})

const onSectionCancel = () => {
  resetDraft()
  editingSection.value = null
}

const emitBack = () => {
  if (
    editingSection.value !== null &&
    !window.confirm('編集中の内容は保存されていません。このまま戻りますか？')
  ) {
    return
  }

  emit('back')
}

const onSubmit = async () => {
  const normalizedOwnedSkills = cloneOwnedSkills(ownedSkills.value)

  await useSpinner(async () => {
    try {
      // 画像管理UIは廃止済み。既存のimageUrlsはそのまま引き継いで保存する。
      const resolvedImageUrls = user.value.imageUrls

      const nextUser = cloneUser({
        ...user.value,
        imageUrls: resolvedImageUrls,
        displayName: user.value.displayName.trim(),
        displayNameKana: user.value.displayNameKana.trim(),
        guildId: user.value.guildId.trim(),
        affiliationDate: modelToDate(affiliationDateStr.value),
        affiliationNum: Number(user.value.affiliationNum) || 0,
        gameStartDateAt: modelToDate(gameStartDateAtStr.value),
        email: user.value.email.trim(),
        phone: user.value.phone.trim(),
        birthDateAt: modelToDate(birthDateAtStr.value),
        weaponProficiencySkillProgress:
          user.value.weaponProficiencySkillProgress
      })
      const nextAppUser = cloneAppUser({
        ...appUser.value,
        id: props.userId,
        uid: props.userId,
        displayName: nextUser.displayName || appUser.value.displayName,
        displayNameKana: nextUser.displayNameKana,
        email: nextUser.email || appUser.value.email,
        guildId: canEditGuildId.value
          ? nextUser.guildId
          : appUser.value.guildId,
        affiliationDate: nextUser.affiliationDate,
        affiliationNum: nextUser.affiliationNum,
        situation: nextUser.situation,
        gameStartDateAt: nextUser.gameStartDateAt,
        birthDateAt: nextUser.birthDateAt,
        phone: nextUser.phone,
        imageUrls: resolvedImageUrls,
        weaponProficiencyLevels: nextUser.weaponProficiencyLevels,
        weaponProficiencySkillProgress: nextUser.weaponProficiencySkillProgress
      })
      const nextUsersPayload = props.includeProfile
        ? {
            displayName: nextAppUser.displayName,
            displayNameKana: nextAppUser.displayNameKana,
            affiliationDate: nextAppUser.affiliationDate,
            affiliationNum: nextAppUser.affiliationNum,
            situation: nextAppUser.situation,
            gameStartDateAt: nextAppUser.gameStartDateAt,
            birthDateAt: nextAppUser.birthDateAt,
            phone: nextAppUser.phone,
            imageUrls: nextAppUser.imageUrls,
            weaponProficiencyLevels: nextAppUser.weaponProficiencyLevels,
            weaponProficiencySkillProgress:
              nextAppUser.weaponProficiencySkillProgress,
            ...(canEditGuildId.value ? { guildId: nextAppUser.guildId } : {})
          }
        : {
            imageUrls: nextAppUser.imageUrls,
            weaponProficiencyLevels: nextAppUser.weaponProficiencyLevels,
            weaponProficiencySkillProgress:
              nextAppUser.weaponProficiencySkillProgress
          }
      const nextUserSkill: UserSkill = {
        ...defaultUserSkill(),
        id: props.userId,
        userId: props.userId,
        ownedSkills: normalizedOwnedSkills
      }

      if (userSkillExists.value) {
        await dbUserSkillsModule.doc(props.userId).merge(nextUserSkill)
      } else if (normalizedOwnedSkills.length > 0) {
        await dbUserSkillsModule.doc(props.userId).insert(nextUserSkill)
        userSkillExists.value = true
      }

      if (appUserExists.value) {
        await dbUsersModule.doc(props.userId).merge(nextUsersPayload)
      } else {
        await dbUsersModule.doc(props.userId).insert(nextAppUser)
        appUserExists.value = true
      }
      appUser.value = nextAppUser
      originalAppUser.value = cloneAppUser(nextAppUser)
      if (globalLoginUserData.value.id === props.userId) {
        globalLoginUserData.value = {
          ...globalLoginUserData.value,
          ...nextAppUser
        }
      }

      if (nextAppUser) {
        appUser.value = nextAppUser
        originalAppUser.value = cloneAppUser(nextAppUser)
      }

      if (userSkillExists.value || normalizedOwnedSkills.length > 0) {
        skillStore.setCurrentUserSkills(nextUserSkill)
      } else {
        skillStore.clearCurrentUserSkills()
      }

      user.value = nextUser
      originalUser.value = cloneUser(nextUser)
      ownedSkills.value = normalizedOwnedSkills
      originalOwnedSkills.value = cloneOwnedSkills(normalizedOwnedSkills)
      syncDateModels(nextUser)
      editingSection.value = null
      resetSkillFilters()
      void notifySuccess('保存しました。')
    } catch (error) {
      void notifyError('保存に失敗しました。')
      console.error('Failed to save user workspace:', error)
    }
  })
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div v-if="isLoading" class="rm-state-card">
      <ProgressSpinner strokeWidth="5" />
      <p class="rm-muted">登録内容を読み込み中...</p>
    </div>

    <div v-else-if="errorMessage" class="rm-state-card">
      <RMEmptyState
        icon="pi pi-exclamation-circle"
        title="登録内容を表示できません"
        :message="errorMessage"
      >
        <template #actions>
          <RMButton
            :label="props.backLabel"
            color="primary"
            @click="emitBack"
          />
        </template>
      </RMEmptyState>
    </div>

    <form
      v-else
      class="user-workspace-form"
      :class="{ 'user-workspace-form--compact': isCompactMode }"
      @submit.prevent
    >
      <Card class="user-workspace-card">
        <template #content>
          <div class="user-workspace-card__content">
            <RMPageHeader
              :title="props.pageTitle"
              :subtitle="pageSubtitle"
              :icon="props.pageIcon"
            >
              <template #actions>
                <RMButton
                  :label="props.backLabel"
                  color="grey-7"
                  outline
                  width="162px"
                  buttonHeight="44px"
                  letterSize="14px"
                  @click="emitBack"
                />
              </template>
            </RMPageHeader>

            <RMInlineTabs v-model="activeWorkspaceTab" :tabs="workspaceTabs">
              <template #default="{ activeKey }">
                <RMUserWorkspaceProfileSection
                  v-if="activeKey === 'profile'"
                  v-model:user="user"
                  v-model:affiliationDateStr="affiliationDateStr"
                  v-model:gameStartDateAtStr="gameStartDateAtStr"
                  v-model:birthDateAtStr="birthDateAtStr"
                  :editing="isSectionEditing('profile')"
                  :canEditGuildId="canEditGuildId"
                  :situationOptions="situationOptions"
                  @update:editing="
                    (value) => setSectionEditing('profile', value)
                  "
                  @cancel="onSectionCancel"
                  @save="onSubmit"
                />

                <RMUserWorkspaceSkillsSection
                  v-else-if="activeKey === 'skills'"
                  v-model:skillCatalogPage="skillCatalogPage"
                  v-model:skillCatalogQuery="skillCatalogQuery"
                  v-model:skillCatalogElement="skillCatalogElement"
                  v-model:skillCatalogEquipmentType="skillCatalogEquipmentType"
                  v-model:skillCatalogStatus="skillCatalogStatus"
                  v-model:skillCatalogSortOption="skillCatalogSortOption"
                  :editing="isSectionEditing('skills')"
                  :ownedSkillRows="ownedSkillRows"
                  :filteredSkillCatalogRows="filteredSkillCatalogRows"
                  :visibleSkillCatalogRows="visibleSkillCatalogRows"
                  :skillCatalogPageSize="skillCatalogPageSize"
                  :skillCatalogElementOptions="skillCatalogElementOptions"
                  :skillCatalogEquipmentTypeOptions="
                    skillCatalogEquipmentTypeOptions
                  "
                  @toggleSkill="toggleOwnedSkill"
                  @removeSkill="removeOwnedSkill"
                  @resetFilters="resetSkillFilters"
                  @update:editing="
                    (value) => setSectionEditing('skills', value)
                  "
                  @cancel="onSectionCancel"
                  @save="onSubmit"
                />

                <div
                  v-else-if="activeKey === 'level'"
                  class="user-workspace-focus-switch__level-panel"
                >
                  <RMSectionEdit
                    :editing="isSectionEditing('level')"
                    :canEdit="true"
                    title="熟練度Lv"
                    @update:editing="
                      (value) => setSectionEditing('level', value)
                    "
                    @cancel="onSectionCancel"
                    @save="onSubmit"
                  >
                    <template #view>
                      <div class="user-workspace-focus-switch__level-grid">
                        <div
                          v-for="field in weaponProficiencyFields"
                          :key="field.key"
                          class="user-workspace-focus-switch__level-field"
                        >
                          <div class="user-workspace-field__label">
                            {{ field.label }}
                          </div>
                          <div class="workspace-view-value">
                            {{ field.value ?? '未設定' }}
                          </div>
                        </div>
                      </div>
                    </template>
                    <template #edit>
                      <div class="user-workspace-focus-switch__level-note">
                        各武器種の熟練度Lvを{{
                          weaponProficiencyLevelRangeLabel
                        }}から選択できます。
                      </div>
                      <div class="user-workspace-focus-switch__level-grid">
                        <div
                          v-for="field in weaponProficiencyFields"
                          :key="field.key"
                          class="user-workspace-focus-switch__level-field"
                        >
                          <div class="user-workspace-field__label">
                            {{ field.label }}
                          </div>
                          <Dropdown
                            :modelValue="field.value"
                            :options="weaponProficiencyLevelOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Lvを選択"
                            showClear
                            class="user-workspace-focus-switch__level-input"
                            @update:modelValue="
                              updateWeaponProficiencyLevel(field.key, $event)
                            "
                          />
                        </div>
                      </div>
                    </template>
                  </RMSectionEdit>
                </div>

                <RMUserWorkspaceProficiencySkillSection
                  v-else-if="activeKey === 'proficiency-skill'"
                  v-model:progress="user.weaponProficiencySkillProgress"
                  :editing="isSectionEditing('proficiency-skill')"
                  @update:editing="
                    (value) => setSectionEditing('proficiency-skill', value)
                  "
                  @cancel="onSectionCancel"
                  @save="onSubmit"
                />
              </template>
            </RMInlineTabs>
          </div>
        </template>
      </Card>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.user-workspace-form {
  width: min(100%, 1440px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-form--compact {
  width: min(100%, 1440px);
}

.user-workspace-card {
  border-radius: 24px;
  overflow: hidden;
}

.user-workspace-card__content {
  padding: clamp(16px, 2.2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-focus-switch__level-panel {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.88);
}

.user-workspace-focus-switch__level-note {
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.6;
}

.user-workspace-focus-switch__level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.user-workspace-focus-switch__level-field {
  min-width: 0;
}

.user-workspace-focus-switch__level-input,
.user-workspace-focus-switch__level-panel :deep(.p-dropdown) {
  width: 100%;
}

.workspace-view-value {
  color: #1f2937;
  line-height: 1.6;
  word-break: break-word;
}

.user-workspace-field__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

@media (max-width: 767px) {
  .user-workspace-card__content {
    padding: 16px;
  }

  .user-workspace-focus-switch__level-grid {
    grid-template-columns: 1fr;
  }
}
</style>
