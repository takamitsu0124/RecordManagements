<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AutoComplete, { AutoCompleteCompleteEvent, AutoCompleteOptionSelectEvent } from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import OrderList from 'primevue/orderlist'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Draggable from 'vuedraggable'
import {
	dbUserModule,
	dbUsersModule,
	dbUserSkillsModule,
	deleteFileByUrl,
	uploadFile,
} from '@rm/db'
import {
	AppUser,
	OwnedSkill,
	SkillMaster,
	SkillRecord,
	User,
	UserSkill,
	defaultAppUser,
	defaultSkillMaster,
	defaultUser,
	defaultUserSkill,
} from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifyInfo, notifySuccess } from 'src/composables/useAppNotifications'
import { useSkillStore } from 'src/store'

type ImageItem = {
	id: string
	previewUrl: string
	persistedUrl: string | null
	file: File | null
	objectUrl: string | null
	isNew: boolean
	label: string
}

type OwnedSkillRow = OwnedSkill & {
	index: number
	name: string
	attr: string
	type: string
	image: string
	masterMissing: boolean
}

const props = withDefaults(
	defineProps<{
		userId: string
		includeProfile?: boolean
		compactMode?: boolean
		pageTitle?: string
		pageIcon?: string
		viewDescription?: string
		editDescription?: string
		backLabel?: string
	}>(),
	{
		includeProfile: true,
		compactMode: false,
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
const legacyImageKeys: Array<keyof SkillRecord> = [
	'sword',
	'rapier',
	'club',
	'dagger',
	'axe',
	'spear',
	'bow',
	'shield',
	'ability',
	'abilityRecollection',
	'abilityAccele',
	'weaponRecollection',
	'weaponMod',
	'weaponConnect',
	'weaponAccele',
	'burst_FullBurst',
	'free',
]

const isLoading = ref(true)
const isEditMode = ref(false)
const errorMessage = ref<string | null>(null)
const legacyUserExists = ref(false)
const appUserExists = ref(false)
const userSkillExists = ref(false)

const user = ref<User>(defaultUser())
const originalUser = ref<User>(defaultUser())
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

const skillSearchInput = ref<SkillMaster | string | null>('')
const skillSearchSuggestions = ref<SkillMaster[]>([])
const imageUploadKey = ref(0)

const isCarouselVisible = ref(false)
const carouselSlide = ref(0)
const touchStartX = ref<number | null>(null)
const activeCarouselImages = computed(() => imageItems.value.map((item) => item.previewUrl))
const currentCarouselImage = computed(
	() => activeCarouselImages.value[carouselSlide.value] ?? ''
)

const pageSubtitle = computed(
	() => user.value.charaName || appUser.value.displayName || '登録内容未設定'
)
const showProfile = computed(() => props.includeProfile)
const isCompactMode = computed(() => props.compactMode)
const activeCompactSection = ref<'skills' | 'images'>('skills')

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
			attr: fallbackMaster.attr || '未設定',
			type: fallbackMaster.type || '未設定',
			image: fallbackMaster.image,
			masterMissing: !master,
		}
	})
)

const ownedSkillIdSet = computed(() => new Set(ownedSkills.value.map((skill) => skill.skillId)))
const imageCountLabel = computed(() => `${imageItems.value.length}件`)
const modeLabel = computed(() => (isEditMode.value ? '編集モード' : '閲覧モード'))

const createImageId = () =>
	globalThis.crypto?.randomUUID?.() ||
	`image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const cloneSkillRecord = (payload?: Partial<SkillRecord> | null): SkillRecord => {
	const base = defaultUser().skillRecord
	const merged = {
		...base,
		...(payload || {}),
	}

	return legacyImageKeys.reduce((result, key) => {
		result[key] = Array.isArray(merged[key]) ? [...merged[key]] : []
		return result
	}, {} as SkillRecord)
}

const cloneUser = (payload?: Partial<User> | null): User => {
	const base = defaultUser()
	const nextUser = {
		...base,
		...(payload || {}),
	}

	return {
		...nextUser,
		contact: {
			...base.contact,
			...(payload?.contact || {}),
		},
		skillRecord: cloneSkillRecord(payload?.skillRecord),
		proficiencyLevel: {
			...base.proficiencyLevel,
			...(payload?.proficiencyLevel || {}),
		},
		imageUrls: Array.isArray(payload?.imageUrls)
			? payload!.imageUrls.filter((url): url is string => typeof url === 'string')
			: [],
	}
}

const cloneAppUser = (payload?: Partial<AppUser> | null): AppUser => ({
	...defaultAppUser(),
	...(payload || {}),
	role: payload?.role || 'member',
})

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

const syncDateModels = (payload: User) => {
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

const extractImageUrls = (payload: User) => {
	const rawUrls =
		payload.imageUrls.length > 0
			? payload.imageUrls
			: legacyImageKeys.flatMap((key) =>
					Array.isArray(payload.skillRecord[key]) ? payload.skillRecord[key] : []
				)

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

const createFallbackUser = (userId: string, currentAppUser: AppUser | null) =>
	cloneUser({
		...defaultUser(),
		id: userId,
		charaName: currentAppUser?.displayName || '',
		guildId: currentAppUser?.guildId || '',
		contact: {
			email: currentAppUser?.email || '',
			phone: '',
		},
	})

const createFallbackAppUser = (userId: string, currentUser: User | null) => ({
	...defaultAppUser(),
	id: userId,
	uid: userId,
	email: currentUser?.contact.email || '',
	displayName: currentUser?.charaName || '',
	guildId: currentUser?.guildId || '',
	role: 'member' as const,
})

const resetSkillSearch = () => {
	skillSearchInput.value = ''
	skillSearchSuggestions.value = []
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
	resetSkillSearch()
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
		resetSkillSearch()
		cleanupObjectUrls(imageItems.value)
		selectedImageItems.value = []
		deletedPersistedImageUrls.value = []

		await skillStore.fetchMasterData()
		await skillStore.fetchUserSkills(props.userId)

		const [legacyPayload, appPayload] = await Promise.all([
			dbUserModule.doc(props.userId).fetch({ force: true }),
			dbUsersModule.doc(props.userId).fetch({ force: true }),
		])

		if (!legacyPayload?.id && !appPayload?.id) {
			errorMessage.value = '指定されたユーザーが見つかりませんでした。'
			return
		}

		legacyUserExists.value = Boolean(legacyPayload?.id)
		appUserExists.value = Boolean(appPayload?.id)

		const nextAppUser = appPayload?.id
			? cloneAppUser(appPayload)
			: cloneAppUser(createFallbackAppUser(props.userId, legacyPayload || null))
		const nextUser = legacyPayload?.id
			? cloneUser(legacyPayload)
			: props.includeProfile
				? createFallbackUser(props.userId, nextAppUser)
				: cloneUser({
						...defaultUser(),
						id: props.userId,
					})
		const nextUserSkill = skillStore.state.currentUserSkills.find(
			(userSkill) => userSkill.userId === props.userId
		)

		user.value = nextUser
		originalUser.value = cloneUser(nextUser)
		appUser.value = nextAppUser
		originalAppUser.value = cloneAppUser(nextAppUser)
		ownedSkills.value = cloneOwnedSkills(nextUserSkill?.ownedSkills ?? [])
		originalOwnedSkills.value = cloneOwnedSkills(nextUserSkill?.ownedSkills ?? [])
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

const onSkillSearch = (event: AutoCompleteCompleteEvent) => {
	if (!isEditMode.value) {
		skillSearchSuggestions.value = []
		return
	}

	const query = event.query.trim().toLowerCase()

	skillSearchSuggestions.value = skillStore.state.masterData
		.filter((skill) => !ownedSkillIdSet.value.has(skill.id))
		.filter((skill) => {
			if (!query) return true

			return [skill.id, skill.name, skill.attr, skill.type].some((value) =>
				value.toLowerCase().includes(query)
			)
		})
		.slice(0, 20)
}

const addOwnedSkill = (skill: SkillMaster) => {
	if (ownedSkillIdSet.value.has(skill.id)) {
		notifyInfo('そのスキルは既に追加されています。')
		resetSkillSearch()
		return
	}

	ownedSkills.value.push({
		skillId: skill.id,
		level: 0,
	})
	resetSkillSearch()
}

const onSkillSelect = (event: AutoCompleteOptionSelectEvent) => {
	addOwnedSkill(event.value as SkillMaster)
}

const removeOwnedSkill = (skillId: string) => {
	ownedSkills.value = ownedSkills.value.filter((skill) => skill.skillId !== skillId)
}

const onImageFilesSelect = (event: { files?: File[] }) => {
	const files = event.files ?? []
	if (!files.length) return

	const existingPendingFileKeys = new Set(
		imageItems.value
			.filter((item) => item.file)
			.map((item) => `${item.file!.name}:${item.file!.size}:${item.file!.lastModified}`)
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
	selectedImageItems.value = selectedImageItems.value.filter((item) => item.id !== imageId)
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
	carouselSlide.value = (carouselSlide.value + 1) % activeCarouselImages.value.length
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
	const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
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
				id: props.userId,
				imageUrls: resolvedImageUrls,
				charaName: user.value.charaName.trim(),
				charaNameKana: user.value.charaNameKana.trim(),
				guildId: user.value.guildId.trim(),
				affiliationDate: modelToDate(affiliationDateStr.value),
				affiliationNum: Number(user.value.affiliationNum) || 0,
				gameStartDateAt: modelToDate(gameStartDateAtStr.value),
				contact: {
					email: user.value.contact.email.trim(),
					phone: user.value.contact.phone.trim(),
				},
				birthDateAt: modelToDate(birthDateAtStr.value),
			})
			const nextAppUser = props.includeProfile
				? cloneAppUser({
						...appUser.value,
						id: props.userId,
						uid: props.userId,
						displayName: nextUser.charaName || appUser.value.displayName,
						email: nextUser.contact.email || appUser.value.email,
						guildId: nextUser.guildId,
					})
				: null
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

			if (props.includeProfile && nextAppUser) {
				if (appUserExists.value) {
					await dbUsersModule.doc(props.userId).merge({
						displayName: nextAppUser.displayName,
						email: nextAppUser.email,
						guildId: nextAppUser.guildId,
					})
				} else {
					await dbUsersModule.doc(props.userId).insert(nextAppUser)
					appUserExists.value = true
				}
			}

			if (legacyUserExists.value) {
				await dbUserModule.doc(props.userId).merge({
					...(props.includeProfile
						? {
								charaName: nextUser.charaName,
								charaNameKana: nextUser.charaNameKana,
								guildId: nextUser.guildId,
								affiliationDate: nextUser.affiliationDate,
								affiliationNum: nextUser.affiliationNum,
								situation: nextUser.situation,
								gameStartDateAt: nextUser.gameStartDateAt,
								contact: nextUser.contact,
								birthDateAt: nextUser.birthDateAt,
							}
						: {}),
					imageUrls: resolvedImageUrls,
				})
			} else {
				if (props.includeProfile) {
					await dbUserModule.doc(props.userId).insert(nextUser)
				} else {
					await dbUserModule.doc(props.userId).merge({
						imageUrls: resolvedImageUrls,
					})
				}
				legacyUserExists.value = true
			}
			persistedImageUrls = true

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
					[...new Set(deletedPersistedImageUrls.value)].map((url) => deleteFileByUrl(url))
				)
				const failedDeletions = deletionResults.filter(
					(result): result is PromiseRejectedResult => result.status === 'rejected'
				)
				if (failedDeletions.length > 0) {
					notifyInfo('古い画像の一部を削除できませんでしたが、新しい並び順は保存済みです。')
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
			resetSkillSearch()
			activeCompactSection.value = 'skills'
			notifySuccess('保存しました。')
		} catch (error) {
			if (!persistedImageUrls && uploadedUrls.length > 0) {
				await Promise.allSettled(uploadedUrls.map((url) => deleteFileByUrl(url)))
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
					<RMButton :label="props.backLabel" color="primary" @click="emitBack" />
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
							:description="isEditMode ? props.editDescription : props.viewDescription"
							:icon="props.pageIcon"
						>
							<template #actions>
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
								<Tag :value="imageCountLabel" :severity="imageItems.length > 0 ? 'success' : 'secondary'" />
							</div>
							<div class="user-workspace-summary__item">
								<div class="user-workspace-summary__label">現在の状態</div>
								<Tag :value="modeLabel" :severity="isEditMode ? 'contrast' : 'secondary'" />
							</div>
						</div>
						<div v-else class="user-workspace-focus-switch">
							<div class="user-workspace-focus-switch__copy">
								ギルド運用では必要な項目だけ切り替えて編集できます。
							</div>
							<div class="user-workspace-focus-switch__actions">
								<Button
									type="button"
									:label="`所持スキル ${ownedSkillRows.length}件`"
									:severity="activeCompactSection === 'skills' ? 'contrast' : 'secondary'"
									:outlined="activeCompactSection !== 'skills'"
									@click="activeCompactSection = 'skills'"
								/>
								<Button
									type="button"
									:label="`画像管理 ${imageItems.length}件`"
									:severity="activeCompactSection === 'images' ? 'contrast' : 'secondary'"
									:outlined="activeCompactSection !== 'images'"
									@click="activeCompactSection = 'images'"
								/>
							</div>
						</div>

						<div v-if="!isEditMode" class="rm-inline-note">
							{{
								isCompactMode
									? '閲覧モードでは必要な項目だけ切り替えて確認できます。変更が必要な場合だけ編集モードへ切り替えてください。'
									: '閲覧モードでは現在のプロフィール、所持スキル、画像順を確認できます。変更が必要な場合だけ編集モードへ切り替えてください。'
							}}
						</div>
					</div>
				</template>
			</Card>

			<Card v-if="showProfile" class="user-workspace-card">
				<template #content>
					<div class="user-workspace-section">
						<div class="user-workspace-section__header">
							<div>
								<div class="rm-section-title">プロフィール</div>
								<div class="user-workspace-section__description">
									個人情報を増やさず、現在使っているプロフィール項目だけを同じ画面で確認・更新できます。
								</div>
							</div>
						</div>

						<Divider />

						<section>
							<div class="rm-section-title">基本情報</div>
							<div class="rm-form-grid rm-form-grid--two">
								<RMInput
									v-model="user.charaName"
									label="キャラクターネーム"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.charaNameKana"
									label="キャラクターネーム(カナ)"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.guildId"
									label="所属ギルドID"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.affiliationNum"
									label="所属No"
									type="number"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
							<div class="user-workspace-field">
								<div class="user-workspace-field__label">プレイヤー状況</div>
								<Dropdown
									v-model="user.situation"
									:options="situationOptions"
									placeholder="状況を選択"
									class="user-workspace-dropdown"
									:disabled="!isEditMode"
								/>
							</div>
						</section>

						<Divider />

						<section>
							<div class="rm-section-title">日付情報</div>
							<div class="rm-form-grid rm-form-grid--three">
								<RMInput
									v-model="affiliationDateStr"
									label="ギルド所属日"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="gameStartDateAtStr"
									label="ゲーム開始日時"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="birthDateAtStr"
									label="誕生日"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
						</section>

						<Divider />

						<section>
							<div class="rm-section-title">連絡先</div>
							<div class="rm-form-grid rm-form-grid--two">
								<RMInput
									v-model="user.contact.email"
									label="登録メールアドレス"
									type="email"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.contact.phone"
									label="登録電話番号"
									type="tel"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
						</section>
					</div>
				</template>
			</Card>

			<Card
				v-if="!isCompactMode || activeCompactSection === 'skills'"
				class="user-workspace-card"
			>
				<template #content>
					<div class="user-workspace-section">
						<div class="user-workspace-section__header">
							<div>
								<div class="rm-section-title">所持スキル</div>
								<div class="user-workspace-section__description">
									`skill_master` を検索して追加し、同じ画面で熟練度を更新できます。
								</div>
							</div>
							<Tag :value="`${ownedSkillRows.length}件`" severity="info" />
						</div>

						<Divider />

						<div class="skill-search-box">
							<div class="user-workspace-field__label">スキルを検索して追加</div>
							<AutoComplete
								v-model="skillSearchInput"
								:suggestions="skillSearchSuggestions"
								optionLabel="name"
								forceSelection
								class="skill-search-box__input"
								:disabled="!isEditMode"
								placeholder="スキル名・ID・属性・種別で検索"
								@complete="onSkillSearch"
								@option-select="onSkillSelect"
							>
								<template #option="{ option }">
									<div class="skill-search-box__option">
										<div class="skill-search-box__option-name">{{ option.name }}</div>
										<div class="skill-search-box__option-meta">
											<span>{{ option.attr }}</span>
											<span>{{ option.type }}</span>
											<span>{{ option.id }}</span>
										</div>
									</div>
								</template>
							</AutoComplete>
							<p class="skill-search-box__help">
								重複追加は自動で防止されます。候補を選ぶとすぐに所持一覧へ追加されます。
							</p>
						</div>

						<div v-if="ownedSkillRows.length === 0" class="user-workspace-empty">
							まだ所持スキルは登録されていません。
						</div>

						<div v-else class="owned-skill-list">
							<article
								v-for="skill in ownedSkillRows"
								:key="skill.skillId"
								class="owned-skill-item"
							>
								<div class="owned-skill-item__media">
									<img
										v-if="skill.image"
										:src="skill.image"
										alt=""
										class="owned-skill-item__image"
									/>
									<div v-else class="owned-skill-item__placeholder">No image</div>
								</div>
								<div class="owned-skill-item__body">
									<div class="owned-skill-item__head">
										<div>
											<div class="owned-skill-item__name">{{ skill.name }}</div>
											<div class="owned-skill-item__meta">{{ skill.skillId }}</div>
										</div>
										<Button
											v-if="isEditMode"
											type="button"
											icon="pi pi-trash"
											severity="danger"
											text
											rounded
											@click="removeOwnedSkill(skill.skillId)"
										/>
									</div>
									<div class="owned-skill-item__tags">
										<Tag :value="skill.attr" severity="secondary" />
										<Tag :value="skill.type" severity="secondary" />
										<Tag
											v-if="skill.masterMissing"
											value="master未登録"
											severity="danger"
										/>
									</div>
									<div class="owned-skill-item__level">
										<div class="user-workspace-field__label">熟練度</div>
										<InputNumber
											v-model="ownedSkills[skill.index].level"
											:min="0"
											showButtons
											:disabled="!isEditMode"
											class="owned-skill-item__input"
										/>
									</div>
								</div>
							</article>
						</div>
					</div>
				</template>
			</Card>

			<Card
				v-if="!isCompactMode || activeCompactSection === 'images'"
				class="user-workspace-card"
			>
				<template #content>
					<div class="user-workspace-section">
						<div class="user-workspace-section__header">
							<div>
								<div class="rm-section-title">画像管理</div>
								<div class="user-workspace-section__description">
									画像 URL は表示せず、プレビューと順序だけを管理します。保存時は現在の順序のまま Firestore に反映されます。
								</div>
							</div>
							<Tag :value="imageCountLabel" :severity="imageItems.length > 0 ? 'success' : 'secondary'" />
						</div>

						<Divider />

						<div v-if="isEditMode" class="image-toolbox">
							<FileUpload
								:key="imageUploadKey"
								mode="basic"
								multiple
								accept="image/*"
								chooseLabel="画像を追加"
								class="image-toolbox__upload"
								@select="onImageFilesSelect"
							/>
							<div class="image-toolbox__help">
								ドラッグ＆ドロップで大まかに並び替え、細かい調整は `OrderList` の上下ボタンで行えます。
							</div>
						</div>

						<div v-if="imageItems.length === 0" class="user-workspace-empty">
							まだ画像は登録されていません。
						</div>

						<div v-else-if="isEditMode" class="image-order-layout">
							<OrderList
								v-model="imageItems"
								v-model:selection="selectedImageItems"
								dataKey="id"
								:metaKeySelection="false"
								:listStyle="{ height: 'auto' }"
								scrollHeight="22rem"
								class="image-order-list"
							>
								<template #header>
									<div class="image-order-list__header">
										<div class="image-order-list__title">並び替え一覧</div>
										<div class="image-order-list__subtitle">
											画像を選択して上下ボタンで順序を調整します。
										</div>
									</div>
								</template>
								<template #option="{ option, index }">
									<div class="image-order-item">
										<button
											type="button"
											class="image-order-item__preview"
											@click.stop="openImageCarouselById(option.id)"
										>
											<img :src="option.previewUrl" alt="" class="image-order-item__image" />
										</button>
										<div class="image-order-item__meta">
											<div class="image-order-item__title">画像 {{ index + 1 }}</div>
											<div class="image-order-item__subtitle">
												{{ option.label }}
											</div>
											<Tag
												v-if="option.isNew"
												value="未保存"
												severity="warn"
											/>
										</div>
										<Button
											type="button"
											icon="pi pi-trash"
											severity="danger"
											text
											rounded
											@click.stop="removeImage(option.id)"
										/>
									</div>
								</template>
							</OrderList>

							<div class="image-sort-grid">
								<div class="image-sort-grid__title">ドラッグで並び替え</div>
								<div class="image-sort-grid__description">
									ハンドルをつかんで順序を変更すると、その並びのまま保存されます。
								</div>
								<Draggable
									v-model="imageItems"
									item-key="id"
									handle=".image-sort-grid__handle"
									:animation="180"
									class="image-preview-grid image-preview-grid--sortable"
								>
									<template #item="{ element, index }">
										<div class="image-preview-grid__item image-preview-grid__item--sortable">
											<button
												type="button"
												class="image-sort-grid__handle"
												aria-label="画像の順序を変更"
											>
												<span class="pi pi-bars" aria-hidden="true" />
											</button>
											<button
												type="button"
												class="image-preview-grid__preview"
												@click="openImageCarousel(index)"
											>
												<img
													:src="element.previewUrl"
													alt=""
													class="image-preview-grid__image"
												/>
												<span class="image-preview-grid__badge">{{ index + 1 }}</span>
											</button>
										</div>
									</template>
								</Draggable>
							</div>
						</div>

						<div v-else class="image-preview-grid">
							<button
								v-for="(item, index) in imageItems"
								:key="item.id"
								type="button"
								class="image-preview-grid__item"
								@click="openImageCarousel(index)"
							>
								<img :src="item.previewUrl" alt="" class="image-preview-grid__image" />
								<span class="image-preview-grid__badge">{{ index + 1 }}</span>
							</button>
						</div>
					</div>
				</template>
			</Card>

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
					label="保存"
					type="submit"
					color="primary"
					width="160px"
				/>
			</div>
		</form>

		<Dialog
			v-model:visible="isCarouselVisible"
			modal
			header="画像プレビュー"
			:style="{ width: 'min(96vw, 900px)' }"
			:dismissableMask="true"
			class="image-preview-dialog"
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
					<img :src="currentCarouselImage" alt="" class="image-preview-dialog__image" />
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
				{{ activeCarouselImages.length ? carouselSlide + 1 : 0 }} / {{ activeCarouselImages.length }}
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

.user-workspace-summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 12px;
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
.skill-search-box__input,
.owned-skill-item__input {
	width: 100%;
}

.skill-search-box {
	padding: 14px;
	border-radius: 18px;
	background: rgba(248, 250, 252, 0.88);
	border: 1px solid #e2e8f0;
}

.skill-search-box__help {
	margin: 10px 0 0;
	color: #64748b;
	line-height: 1.6;
}

.skill-search-box__option {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.skill-search-box__option-name {
	font-weight: 700;
	color: #334155;
}

.skill-search-box__option-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	font-size: 0.82rem;
	color: #64748b;
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
	.skill-search-box,
	.image-toolbox {
		padding: 12px;
	}

	.user-workspace-focus-switch__actions :deep(.p-button) {
		width: 100%;
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
