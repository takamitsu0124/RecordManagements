<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import {
  dbUsersModule,
  dbUserSkillsModule,
  deleteFileByUrl,
  uploadFile,
} from '@rm/db'
import {
  AppUser,
  OwnedSkill,
  SkillMaster,
  UserSkill,
  defaultAppUser,
  defaultSkillMaster,
  defaultUserSkill,
} from '@rm/types'
import RMUserWorkspaceImagesSection from './RMUserWorkspaceImagesSection.vue'
import RMUserWorkspaceProfileSection from './RMUserWorkspaceProfileSection.vue'
import RMUserWorkspaceSkillsSection from './RMUserWorkspaceSkillsSection.vue'
import type {
  ImageItem,
  OwnedSkillRow,
  SkillCatalogRow,
  SkillCatalogStatus,
  WorkspaceProfile,
} from './types'
import { defaultWorkspaceProfile } from './types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { globalLoginUserData, hasAdmin } from 'src/boot/main'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import {
  notifyError,
  notifyInfo,
  notifySuccess,
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
    viewDescription?: string
    editDescription?: string
    backLabel?: string
  }>(),
  {
    includeProfile: true,
    compactMode: false,
    fallbackAppUser: null,
    pageTitle: 'マイページ',
    pageIcon: 'pi pi-user',
    viewDescription:
      'プロフィール、所持スキル、画像の登録内容をまとめて確認できます。変更が必要なときだけ編集モードに切り替えてください。',
    editDescription:
      'プロフィール、所持スキル、画像の並び順を 1 画面でまとめて更新できます。',
    backLabel: '戻る',
  }
)

const emit = defineEmits<{
  (e: 'back'): void
}>()

const skillStore = useSkillStore()

const situationOptions = ['現役', '隠居', '引退', '']

const isLoading = ref(true)
const isEditMode = ref(false)
const errorMessage = ref<string | null>(null)
const appUserExists = ref(false)
const userSkillExists = ref(false)

const user = ref<WorkspaceProfile>(defaultWorkspaceProfile())
const originalUser = ref<WorkspaceProfile>(defaultWorkspaceProfile())
const appUser = ref<AppUser>(defaultAppUser())
const originalAppUser = ref<AppUser>(defaultAppUser())
const ownedSkills = ref<OwnedSkill[]>([])
const originalOwnedSkills = ref<OwnedSkill[]>([])
const imageItems = ref<ImageItem[]>([])
const originalImageItems = ref<ImageItem[]>([])
const selectedImageItems = ref<ImageItem[]>([])
const deletedPersistedImageUrls = ref<string[]>([])

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
const imageUploadKey = ref(0)

const isCarouselVisible = ref(false)
const isProfileDrawerVisible = ref(false)
const isImagesDrawerVisible = ref(false)
const carouselSlide = ref(0)
const touchStartX = ref<number | null>(null)
const activeCarouselImages = computed(() =>
  imageItems.value.map((item) => item.previewUrl)
)
const currentCarouselImage = computed(
  () => activeCarouselImages.value[carouselSlide.value] ?? ''
)

const pageSubtitle = computed(() => user.value.displayName || '登録内容未設定')
const showProfile = computed(() => props.includeProfile)
const isCompactMode = computed(() => props.compactMode)
const useDrawerLayout = computed(() => !isCompactMode.value)
const activeCompactSection = ref<'skills' | 'images'>('skills')
const canEditGuildId = computed(() => hasAdmin.value)
const showProfileInline = computed(
  () => showProfile.value && !useDrawerLayout.value
)
const showSkillsInline = computed(
  () => useDrawerLayout.value || activeCompactSection.value === 'skills'
)
const showImagesInline = computed(
  () => !useDrawerLayout.value && activeCompactSection.value === 'images'
)

const ownedSkillRows = computed<OwnedSkillRow[]>(() =>
  ownedSkills.value.map((ownedSkill, index) => {
    const master = skillStore.masterDataById.value.get(ownedSkill.skillId)
    const fallbackMaster = master
      ? master
      : {
          ...defaultSkillMaster(),
          id: ownedSkill.skillId,
          name: ownedSkill.skillId,
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
        masterMissing: !master,
      }
    })
)

const ownedSkillIdSet = computed(
  () => new Set(ownedSkills.value.map((skill) => skill.skillId))
)
const ownedSkillLevelById = computed(
  () => new Map(ownedSkills.value.map((skill) => [skill.skillId, skill.level]))
)
const imageCountLabel = computed(() => `${imageItems.value.length}件`)
const modeLabel = computed(() =>
  isEditMode.value ? '編集モード' : '閲覧モード'
)
const skillCatalogPreviewLimit = 60

const skillCatalogElementOptions = computed(() =>
  [...new Set(skillStore.state.masterData.map((skill) => skill.element.trim()))]
    .filter((value): value is string => value !== '')
    .sort((a, b) => a.localeCompare(b, 'ja'))
)

const skillCatalogEquipmentTypeOptions = computed(() =>
  [
    ...new Set(
      skillStore.state.masterData.map((skill) => skill.equipmentType.trim())
    ),
  ]
    .filter((value): value is string => value !== '')
    .sort((a, b) => a.localeCompare(b, 'ja'))
)

const filteredSkillCatalogRows = computed<SkillCatalogRow[]>(() => {
  const query = skillCatalogQuery.value.trim().toLowerCase()

  return skillStore.state.masterData
    .map((skill) => {
      const isOwned = ownedSkillIdSet.value.has(skill.id)

      return {
        ...skill,
        isOwned,
        ownedLevel: ownedSkillLevelById.value.get(skill.id) ?? 0,
      }
    })
    .filter((skill) => {
      if (skillCatalogStatus.value === 'owned' && !skill.isOwned) return false
      if (skillCatalogStatus.value === 'unowned' && skill.isOwned) return false
      if (
        skillCatalogElement.value !== 'all' &&
        skill.element !== skillCatalogElement.value
      )
        return false
      if (
        skillCatalogEquipmentType.value !== 'all' &&
        skill.equipmentType !== skillCatalogEquipmentType.value
      )
        return false
      if (!query) return true

      return buildSkillMasterSearchText(skill).includes(query)
    })
})

const visibleSkillCatalogRows = computed(() =>
  filteredSkillCatalogRows.value.slice(0, skillCatalogPreviewLimit)
)

const hiddenSkillCatalogCount = computed(() =>
  Math.max(
    0,
    filteredSkillCatalogRows.value.length - visibleSkillCatalogRows.value.length
  )
)

const createImageId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const cloneUser = (
  payload?: Partial<WorkspaceProfile> | null
): WorkspaceProfile => {
  const base = defaultWorkspaceProfile()
  const nextUser = {
    ...base,
    ...(payload || {}),
  }

  return {
    ...nextUser,
    email: payload?.email ?? base.email,
    phone: payload?.phone ?? base.phone,
    imageUrls: Array.isArray(payload?.imageUrls)
      ? payload!.imageUrls.filter(
          (url): url is string => typeof url === 'string'
        )
      : [],
  }
}

const cloneAppUser = (payload?: Partial<AppUser> | null): AppUser => ({
  ...defaultAppUser(),
  ...(payload || {}),
  role: payload?.role || 'member',
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
      uid: props.userId,
    })
  }

  if (props.fallbackAppUser) {
    return cloneAppUser({
      id: props.userId,
      uid: props.userId,
      ...props.fallbackAppUser,
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
          : 0,
    }))
    .filter((skill) => {
      if (!skill.skillId || seenSkillIds.has(skill.skillId)) {
        return false
      }

      seenSkillIds.add(skill.skillId)
      return true
    })
}

const cloneImageItems = (payload: ImageItem[]): ImageItem[] =>
  payload.map((item) => ({
    ...item,
    file: null,
    objectUrl: null,
    isNew: false,
    persistedUrl: item.persistedUrl || item.previewUrl,
  }))

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

const cleanupObjectUrls = (items: ImageItem[]) => {
  items.forEach((item) => {
    if (item.objectUrl) {
      URL.revokeObjectURL(item.objectUrl)
    }
  })
}

const extractImageUrls = (payload: WorkspaceProfile) => {
  const rawUrls = payload.imageUrls
  const seenUrls = new Set<string>()

  return rawUrls.filter((url) => {
    if (typeof url !== 'string' || url === '' || seenUrls.has(url)) {
      return false
    }

    seenUrls.add(url)
    return true
  })
}

const createPersistedImageItems = (urls: string[]): ImageItem[] =>
  urls.map((url) => ({
    id: createImageId(),
    previewUrl: url,
    persistedUrl: url,
    file: null,
    objectUrl: null,
    isNew: false,
    label: '保存済み画像',
  }))

const createPendingImageItem = (file: File): ImageItem => {
  const objectUrl = URL.createObjectURL(file)

  return {
    id: createImageId(),
    previewUrl: objectUrl,
    persistedUrl: null,
    file,
    objectUrl,
    isNew: true,
    label: file.name,
  }
}

const resetSkillFilters = () => {
  skillCatalogQuery.value = ''
  skillCatalogElement.value = 'all'
  skillCatalogEquipmentType.value = 'all'
  skillCatalogStatus.value = 'unowned'
}

const resetDraft = () => {
  cleanupObjectUrls(imageItems.value)

  user.value = cloneUser(originalUser.value)
  appUser.value = cloneAppUser(originalAppUser.value)
  ownedSkills.value = cloneOwnedSkills(originalOwnedSkills.value)
  imageItems.value = cloneImageItems(originalImageItems.value)
  selectedImageItems.value = []
  deletedPersistedImageUrls.value = []
  affiliationDateStr.value = originalAffiliationDateStr.value
  gameStartDateAtStr.value = originalGameStartDateAtStr.value
  birthDateAtStr.value = originalBirthDateAtStr.value
  imageUploadKey.value += 1
  resetSkillFilters()
  activeCompactSection.value = 'skills'
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
    cleanupObjectUrls(imageItems.value)
    selectedImageItems.value = []
    deletedPersistedImageUrls.value = []

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

    const nextImageItems = createPersistedImageItems(extractImageUrls(nextUser))
    imageItems.value = nextImageItems
    originalImageItems.value = cloneImageItems(nextImageItems)
    imageUploadKey.value += 1
    activeCompactSection.value = 'skills'
  } catch (error) {
    errorMessage.value = '登録内容の読み込み中にエラーが発生しました。'
    console.error('Failed to load user workspace:', error)
  } finally {
    isLoading.value = false
  }
}

const addOwnedSkill = (skill: SkillMaster) => {
  if (ownedSkillIdSet.value.has(skill.id)) {
    notifyInfo('そのスキルは既に追加されています。')
    return
  }

  ownedSkills.value.push({
    skillId: skill.id,
    level: 0,
  })
}

const removeOwnedSkill = (skillId: string) => {
  ownedSkills.value = ownedSkills.value.filter(
    (skill) => skill.skillId !== skillId
  )
}

const toggleOwnedSkill = (skill: SkillMaster) => {
  if (ownedSkillIdSet.value.has(skill.id)) {
    removeOwnedSkill(skill.id)
    return
  }

  addOwnedSkill(skill)
}

const onImageFilesSelect = (event: { files?: File[] }) => {
  const files = event.files ?? []
  if (!files.length) return

  const existingPendingFileKeys = new Set(
    imageItems.value
      .filter((item) => item.file)
      .map(
        (item) =>
          `${item.file!.name}:${item.file!.size}:${item.file!.lastModified}`
      )
  )

  const nextItems = files
    .filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`
      if (existingPendingFileKeys.has(key)) {
        return false
      }

      existingPendingFileKeys.add(key)
      return true
    })
    .map((file) => createPendingImageItem(file))

  if (!nextItems.length) {
    notifyInfo('同じ画像は既に追加済みです。')
    imageUploadKey.value += 1
    return
  }

  imageItems.value = [...imageItems.value, ...nextItems]
  imageUploadKey.value += 1
}

const removeImage = (imageId: string) => {
  const target = imageItems.value.find((item) => item.id === imageId)
  if (!target) return

  if (target.persistedUrl) {
    deletedPersistedImageUrls.value = [
      ...new Set([...deletedPersistedImageUrls.value, target.persistedUrl]),
    ]
  }

  if (target.objectUrl) {
    URL.revokeObjectURL(target.objectUrl)
  }

  imageItems.value = imageItems.value.filter((item) => item.id !== imageId)
  selectedImageItems.value = selectedImageItems.value.filter(
    (item) => item.id !== imageId
  )
}

const openImageCarousel = (clickedIndex: number) => {
  carouselSlide.value = clickedIndex
  isCarouselVisible.value = true
}

const openImageCarouselById = (imageId: string) => {
  const imageIndex = imageItems.value.findIndex((item) => item.id === imageId)
  if (imageIndex === -1) return
  openImageCarousel(imageIndex)
}

const previousImage = () => {
  if (!activeCarouselImages.value.length) return
  carouselSlide.value =
    (carouselSlide.value - 1 + activeCarouselImages.value.length) %
    activeCarouselImages.value.length
}

const nextImage = () => {
  if (!activeCarouselImages.value.length) return
  carouselSlide.value =
    (carouselSlide.value + 1) % activeCarouselImages.value.length
}

const handleTouchStart = (event: TouchEvent) => {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

const handleTouchEnd = (event: TouchEvent) => {
  if (touchStartX.value === null) return

  const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.value
  if (Math.abs(delta) > 40) {
    if (delta < 0) nextImage()
    else previousImage()
  }

  touchStartX.value = null
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isCarouselVisible.value) return
  if (event.key === 'ArrowLeft') previousImage()
  if (event.key === 'ArrowRight') nextImage()
}

watch(isCarouselVisible, (visible) => {
  if (visible) {
    window.addEventListener('keydown', handleKeydown)
    return
  }

  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => props.userId,
  async (nextUserId, previousUserId) => {
    if (nextUserId === previousUserId) return

    isEditMode.value = false
    await loadWorkspace()
  }
)

onMounted(async () => {
  await loadWorkspace()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  cleanupObjectUrls(imageItems.value)
  cleanupObjectUrls(originalImageItems.value)
})

const onCancelEdit = () => {
  resetDraft()
  isEditMode.value = false
}

const createUploadFileName = (file: File) => {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : ''
  return `${createImageId()}${extension}`
}

const onSubmit = async () => {
  const normalizedOwnedSkills = cloneOwnedSkills(ownedSkills.value)
  const uploadedUrls: string[] = []
  let persistedImageUrls = false

  await useSpinner(async () => {
    try {
      const resolvedImageUrls: string[] = []
      for (const item of imageItems.value) {
        if (item.persistedUrl) {
          resolvedImageUrls.push(item.persistedUrl)
          continue
        }

        if (!item.file) {
          continue
        }

        const uploadedUrl = await uploadFile(
          item.file,
          `user_images/${props.userId}`,
          createUploadFileName(item.file)
        )
        uploadedUrls.push(uploadedUrl)
        resolvedImageUrls.push(uploadedUrl)
      }

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
            ...(canEditGuildId.value ? { guildId: nextAppUser.guildId } : {}),
          }
        : {
            imageUrls: nextAppUser.imageUrls,
          }
      const nextUserSkill: UserSkill = {
        ...defaultUserSkill(),
        id: props.userId,
        userId: props.userId,
        ownedSkills: normalizedOwnedSkills,
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
      persistedImageUrls = true

      appUser.value = nextAppUser
      originalAppUser.value = cloneAppUser(nextAppUser)
      if (globalLoginUserData.value.id === props.userId) {
        globalLoginUserData.value = {
          ...globalLoginUserData.value,
          ...nextAppUser,
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

      if (deletedPersistedImageUrls.value.length > 0) {
        const deletionResults = await Promise.allSettled(
          [...new Set(deletedPersistedImageUrls.value)].map((url) =>
            deleteFileByUrl(url)
          )
        )
        const failedDeletions = deletionResults.filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        if (failedDeletions.length > 0) {
          notifyInfo(
            '古い画像の一部を削除できませんでしたが、新しい並び順は保存済みです。'
          )
          console.error('Failed to delete old user images:', failedDeletions)
        }
      }

      const persistedImages = createPersistedImageItems(resolvedImageUrls)
      cleanupObjectUrls(imageItems.value)

      user.value = nextUser
      originalUser.value = cloneUser(nextUser)
      ownedSkills.value = normalizedOwnedSkills
      originalOwnedSkills.value = cloneOwnedSkills(normalizedOwnedSkills)
      imageItems.value = persistedImages
      originalImageItems.value = cloneImageItems(persistedImages)
      selectedImageItems.value = []
      deletedPersistedImageUrls.value = []
      syncDateModels(nextUser)
      imageUploadKey.value += 1
      isEditMode.value = false
      resetSkillFilters()
      activeCompactSection.value = 'skills'
      notifySuccess('保存しました。')
    } catch (error) {
      if (!persistedImageUrls && uploadedUrls.length > 0) {
        await Promise.allSettled(
          uploadedUrls.map((url) => deleteFileByUrl(url))
        )
      }

      notifyError('保存に失敗しました。')
      console.error('Failed to save user workspace:', error)
    }
  })
}

const emitBack = () => {
  emit('back')
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

    <form v-else class="user-workspace-form" @submit.prevent="onSubmit">
      <Card class="user-workspace-card">
        <template #content>
          <div class="user-workspace-card__content">
            <RMPageHeader
              :title="props.pageTitle"
              :subtitle="pageSubtitle"
              :description="
                isEditMode ? props.editDescription : props.viewDescription
              "
              :icon="props.pageIcon"
            >
              <template #actions>
                <RMButton
                  v-if="isEditMode"
                  label="変更を保存"
                  type="submit"
                  color="primary"
                  width="150px"
                />
                <RMModeToggle v-model="isEditMode" />
              </template>
            </RMPageHeader>

            <div v-if="!isCompactMode" class="user-workspace-summary">
              <div class="user-workspace-summary__item">
                <div class="user-workspace-summary__label">所持スキル</div>
                <Tag :value="`${ownedSkillRows.length}件`" severity="info" />
              </div>
              <div class="user-workspace-summary__item">
                <div class="user-workspace-summary__label">画像</div>
                <Tag
                  :value="imageCountLabel"
                  :severity="imageItems.length > 0 ? 'success' : 'secondary'"
                />
              </div>
              <div class="user-workspace-summary__item">
                <div class="user-workspace-summary__label">現在の状態</div>
                <Tag
                  :value="modeLabel"
                  :severity="isEditMode ? 'contrast' : 'secondary'"
                />
              </div>
            </div>
            <div v-if="useDrawerLayout" class="user-workspace-overlay-actions">
              <button
                v-if="showProfile"
                type="button"
                class="user-workspace-overlay-action"
                @click="isProfileDrawerVisible = true"
              >
                <div class="user-workspace-overlay-action__title">
                  プロフィールを開く
                </div>
                <div class="user-workspace-overlay-action__text">
                  基本情報・日付・連絡先は Drawer にまとめて表示します。
                </div>
              </button>
              <button
                type="button"
                class="user-workspace-overlay-action"
                @click="isImagesDrawerVisible = true"
              >
                <div class="user-workspace-overlay-action__title">
                  画像管理を開く
                </div>
                <div class="user-workspace-overlay-action__text">
                  画像追加、並び替え、プレビュー確認は Drawer で集中して行えます。
                </div>
              </button>
            </div>
            <div v-else class="user-workspace-focus-switch">
              <div class="user-workspace-focus-switch__copy">
                ギルド運用では必要な項目だけ切り替えて編集できます。
              </div>
              <div class="user-workspace-focus-switch__actions">
                <Button
                  type="button"
                  :label="`所持スキル ${ownedSkillRows.length}件`"
                  :severity="
                    activeCompactSection === 'skills' ? 'contrast' : 'secondary'
                  "
                  :outlined="activeCompactSection !== 'skills'"
                  @click="activeCompactSection = 'skills'"
                />
                <Button
                  type="button"
                  :label="`画像管理 ${imageItems.length}件`"
                  :severity="
                    activeCompactSection === 'images' ? 'contrast' : 'secondary'
                  "
                  :outlined="activeCompactSection !== 'images'"
                  @click="activeCompactSection = 'images'"
                />
              </div>
            </div>

            <div v-if="!isEditMode" class="rm-inline-note">
              {{
                isCompactMode
                  ? '閲覧モードでは必要な項目だけ切り替えて確認できます。変更が必要な場合だけ編集モードへ切り替えてください。'
                  : 'プロフィールと画像は必要なときだけ Drawer で開き、メイン画面では所持スキルに集中できます。変更が必要な場合だけ編集モードへ切り替えてください。'
              }}
            </div>
          </div>
        </template>
      </Card>

      <div
        v-if="showProfileInline"
        id="workspace-profile"
        class="user-workspace-anchor"
      >
        <RMUserWorkspaceProfileSection
          v-model:user="user"
          :isEditMode="isEditMode"
          :canEditGuildId="canEditGuildId"
          :situationOptions="situationOptions"
          v-model:affiliationDateStr="affiliationDateStr"
          v-model:gameStartDateAtStr="gameStartDateAtStr"
          v-model:birthDateAtStr="birthDateAtStr"
        />
      </div>

      <div
        v-if="showSkillsInline"
        id="workspace-skills"
        class="user-workspace-anchor"
      >
        <RMUserWorkspaceSkillsSection
          :isEditMode="isEditMode"
          v-model:ownedSkills="ownedSkills"
          :ownedSkillRows="ownedSkillRows"
          :filteredSkillCatalogRows="filteredSkillCatalogRows"
          :visibleSkillCatalogRows="visibleSkillCatalogRows"
          :hiddenSkillCatalogCount="hiddenSkillCatalogCount"
          v-model:skillCatalogQuery="skillCatalogQuery"
          v-model:skillCatalogElement="skillCatalogElement"
          v-model:skillCatalogEquipmentType="skillCatalogEquipmentType"
          v-model:skillCatalogStatus="skillCatalogStatus"
          :skillCatalogElementOptions="skillCatalogElementOptions"
          :skillCatalogEquipmentTypeOptions="skillCatalogEquipmentTypeOptions"
          @toggle-skill="toggleOwnedSkill"
          @remove-skill="removeOwnedSkill"
          @reset-filters="resetSkillFilters"
        />
      </div>

      <div
        v-if="showImagesInline"
        id="workspace-images"
        class="user-workspace-anchor"
      >
        <RMUserWorkspaceImagesSection
          :isEditMode="isEditMode"
          :imageUploadKey="imageUploadKey"
          :imageCountLabel="imageCountLabel"
          v-model:imageItems="imageItems"
          v-model:selectedImageItems="selectedImageItems"
          @select-files="onImageFilesSelect"
          @remove-image="removeImage"
          @open-carousel="openImageCarousel"
          @open-carousel-by-id="openImageCarouselById"
        />
      </div>

      <div class="rm-actions user-workspace-actions">
        <RMButton
          v-if="isEditMode"
          label="編集をやめる"
          color="grey-7"
          outline
          @click="onCancelEdit"
          width="160px"
        />
        <RMButton
          v-else
          :label="props.backLabel"
          color="grey-7"
          outline
          @click="emitBack"
          width="160px"
        />
        <RMButton
          v-if="isEditMode"
          label="変更を保存"
          type="submit"
          color="primary"
          width="160px"
        />
      </div>
    </form>

    <Drawer
      v-if="showProfile && useDrawerLayout"
      v-model:visible="isProfileDrawerVisible"
      position="right"
      header="プロフィール"
      :style="{ width: 'min(96vw, 40rem)' }"
      class="user-workspace-drawer"
    >
      <div id="workspace-profile" class="user-workspace-drawer__content">
        <RMUserWorkspaceProfileSection
          v-model:user="user"
          :isEditMode="isEditMode"
          :canEditGuildId="canEditGuildId"
          :situationOptions="situationOptions"
          v-model:affiliationDateStr="affiliationDateStr"
          v-model:gameStartDateAtStr="gameStartDateAtStr"
          v-model:birthDateAtStr="birthDateAtStr"
        />
      </div>
    </Drawer>

    <Drawer
      v-if="useDrawerLayout"
      v-model:visible="isImagesDrawerVisible"
      position="right"
      header="画像管理"
      :style="{ width: 'min(96vw, 44rem)' }"
      class="user-workspace-drawer"
    >
      <div id="workspace-images" class="user-workspace-drawer__content">
        <RMUserWorkspaceImagesSection
          :isEditMode="isEditMode"
          :imageUploadKey="imageUploadKey"
          :imageCountLabel="imageCountLabel"
          v-model:imageItems="imageItems"
          v-model:selectedImageItems="selectedImageItems"
          @select-files="onImageFilesSelect"
          @remove-image="removeImage"
          @open-carousel="openImageCarousel"
          @open-carousel-by-id="openImageCarouselById"
        />
      </div>
    </Drawer>

    <Dialog
      v-model:visible="isCarouselVisible"
      modal
      header="画像プレビュー"
      :style="{ width: 'min(96vw, 900px)' }"
      :dismissableMask="true"
    >
      <div
        class="image-preview-dialog__shell"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <Button
          v-if="activeCarouselImages.length > 1"
          type="button"
          icon="pi pi-chevron-left"
          rounded
          text
          class="image-preview-dialog__nav"
          @click="previousImage"
        />
        <div class="image-preview-dialog__image-wrap">
          <img
            :src="currentCarouselImage"
            alt=""
            class="image-preview-dialog__image"
          />
        </div>
        <Button
          v-if="activeCarouselImages.length > 1"
          type="button"
          icon="pi pi-chevron-right"
          rounded
          text
          class="image-preview-dialog__nav"
          @click="nextImage"
        />
      </div>
      <div class="image-preview-dialog__count">
        {{ activeCarouselImages.length ? carouselSlide + 1 : 0 }} /
        {{ activeCarouselImages.length }}
      </div>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.user-workspace-form {
  width: min(100%, 1120px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-card {
  border-radius: 24px;
  overflow: hidden;
}

.user-workspace-card__content,
.user-workspace-section {
  padding: clamp(16px, 2.2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-anchor {
  scroll-margin-top: calc(var(--rm-header-height) + 28px);
}

.user-workspace-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.user-workspace-overlay-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.user-workspace-overlay-action {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid rgba(75, 105, 130, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.user-workspace-overlay-action:hover {
  transform: translateY(-1px);
  border-color: rgba(75, 105, 130, 0.34);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.user-workspace-overlay-action__title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--rm-text);
}

.user-workspace-overlay-action__text {
  color: var(--rm-text-soft);
  line-height: 1.7;
}

.user-workspace-focus-switch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid #e2e8f0;
}

.user-workspace-focus-switch__copy {
  color: #64748b;
  line-height: 1.6;
}

.user-workspace-focus-switch__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.user-workspace-summary__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid #e2e8f0;
}

.user-workspace-summary__label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.user-workspace-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.user-workspace-section__description {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.7;
}

.user-workspace-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-workspace-section section {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.user-workspace-field {
  margin-top: 14px;
}

.user-workspace-field__label {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
}

.user-workspace-dropdown,
.skill-checker__search,
.owned-skill-item__input {
  width: 100%;
}

.skill-checker {
  padding: 14px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skill-checker__intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-checker__title {
  font-size: 1rem;
  font-weight: 800;
  color: #334155;
}

.skill-checker__description,
.skill-checker__help {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.skill-checker__filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-checker__filter-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.skill-checker__filter-actions,
.skill-checker__summary-tags,
.skill-catalog-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-checker__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.skill-catalog-card {
  width: 100%;
  padding: 12px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: flex-start;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.skill-catalog-card:hover {
  transform: translateY(-1px);
  border-color: #94a3b8;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.skill-catalog-card--owned {
  border-color: #86efac;
  background: rgba(240, 253, 244, 0.96);
}

.skill-catalog-card__media {
  display: flex;
}

.skill-catalog-card__image,
.skill-catalog-card__placeholder {
  width: 72px;
  height: 72px;
  border-radius: 16px;
}

.skill-catalog-card__image {
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.skill-catalog-card__placeholder {
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.skill-catalog-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-catalog-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.skill-catalog-card__name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #1f2937;
  word-break: break-word;
}

.skill-catalog-card__meta {
  font-size: 0.8rem;
  color: #64748b;
  word-break: break-all;
}

.skill-catalog-card__hint {
  color: #475569;
  font-size: 0.85rem;
  line-height: 1.5;
}

.user-workspace-empty {
  padding: 18px;
  border-radius: 18px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  text-align: center;
  background: #fff;
}

.owned-skill-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.owned-skill-list__header {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.owned-skill-list__title {
  font-weight: 800;
  color: #334155;
}

.owned-skill-list__subtitle {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
}

.owned-skill-item {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.owned-skill-item__media {
  display: flex;
  align-items: flex-start;
}

.owned-skill-item__image,
.owned-skill-item__placeholder {
  width: 84px;
  height: 84px;
  border-radius: 18px;
}

.owned-skill-item__image {
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.owned-skill-item__placeholder {
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.owned-skill-item__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.owned-skill-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.owned-skill-item__name {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
  word-break: break-word;
}

.owned-skill-item__meta {
  margin-top: 4px;
  color: #64748b;
  font-size: 0.82rem;
  word-break: break-all;
}

.owned-skill-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-toolbox {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.image-toolbox__help {
  color: #64748b;
  line-height: 1.6;
}

.image-order-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 16px;
  align-items: start;
}

.image-order-list__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-order-list__title {
  font-weight: 800;
  color: #334155;
}

.image-order-list__subtitle {
  font-size: 0.85rem;
  color: #64748b;
}

.image-order-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.image-order-item__preview {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 16px;
  cursor: pointer;
}

.image-order-item__image {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.image-order-item__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.image-order-item__title {
  font-weight: 700;
  color: #334155;
}

.image-order-item__subtitle {
  color: #64748b;
  font-size: 0.82rem;
  word-break: break-word;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(124px, 1fr));
  gap: 12px;
}

.image-sort-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-sort-grid__title {
  font-weight: 800;
  color: #334155;
}

.image-sort-grid__description {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.6;
}

.image-preview-grid__item {
  position: relative;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
}

.image-preview-grid__item--sortable {
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid #e2e8f0;
  padding: 8px;
  cursor: default;
}

.image-preview-grid__preview {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
}

.image-sort-grid__handle {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: grab;
}

.image-sort-grid__handle:active {
  cursor: grabbing;
}

.image-preview-grid__image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.image-preview-grid__badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
}

.user-workspace-actions {
  margin-top: 4px;
}

.image-preview-dialog__shell {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}

.image-preview-dialog__image-wrap {
  display: grid;
  place-items: center;
  min-height: 320px;
}

.image-preview-dialog__image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 16px;
}

.image-preview-dialog__count {
  margin-top: 12px;
  text-align: center;
  color: #64748b;
}

@media (max-width: 960px) {
  .image-order-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .user-workspace-card__content,
  .user-workspace-section {
    padding: 16px;
  }

  .user-workspace-section section,
  .skill-checker,
  .image-toolbox {
    padding: 12px;
  }

  .user-workspace-focus-switch__actions :deep(.p-button) {
    width: 100%;
  }

  .skill-checker__summary {
    align-items: stretch;
  }

  .skill-checker__summary :deep(.p-button) {
    width: 100%;
  }

  .skill-catalog-card {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .skill-catalog-card__image,
  .skill-catalog-card__placeholder {
    width: 64px;
    height: 64px;
  }

  .owned-skill-item {
    grid-template-columns: 1fr;
  }

  .image-preview-dialog__shell {
    grid-template-columns: 1fr;
  }

  .image-preview-dialog__nav {
    justify-self: center;
  }
}
</style>
