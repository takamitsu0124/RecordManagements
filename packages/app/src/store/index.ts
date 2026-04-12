import { computed, reactive } from 'vue'
import {
	OwnedSkill,
	SkillMaster,
	UserSkill,
	defaultSkillMaster,
	defaultUserSkill,
} from '@rm/types'
import { dbSkillMasterModule, dbUserSkillsModule } from '@rm/db'

export type SkillDetail = SkillMaster & {
	skillId: string
	level: number
	masterMissing: boolean
}

export type UserSkillDetail = SkillDetail & {
	userId: string
}

type SkillStoreState = {
	masterData: SkillMaster[]
	currentUserSkills: UserSkill[]
	isLoading: boolean
}

const state = reactive<SkillStoreState>({
	masterData: [],
	currentUserSkills: [],
	isLoading: false,
})

let loadingCount = 0
let masterDataLoaded = false
let masterDataPromise: Promise<SkillMaster[]> | null = null
let currentUserSkillOwnerKey = ''
let currentUserSkillsLoaded = false
let currentUserSkillsPromise: Promise<UserSkill[]> | null = null

const setLoading = (isStarting: boolean) => {
	loadingCount += isStarting ? 1 : -1
	if (loadingCount < 0) {
		loadingCount = 0
	}
	state.isLoading = loadingCount > 0
}

const withLoading = async <T>(task: () => Promise<T>): Promise<T> => {
	setLoading(true)
	try {
		return await task()
	} finally {
		setLoading(false)
	}
}

const normalizeOwnedSkills = (ownedSkills: unknown): OwnedSkill[] => {
	if (!Array.isArray(ownedSkills)) {
		return []
	}

	return ownedSkills
		.map((ownedSkill) => {
			if (
				typeof ownedSkill !== 'object' ||
				ownedSkill === null ||
				typeof ownedSkill.skillId !== 'string'
			) {
				return null
			}

			return {
				skillId: ownedSkill.skillId,
				level:
					typeof ownedSkill.level === 'number' && Number.isFinite(ownedSkill.level)
						? ownedSkill.level
						: 0,
			}
		})
		.filter((ownedSkill): ownedSkill is OwnedSkill => ownedSkill !== null)
}

const normalizeUserSkill = (userId: string, payload: UserSkill | null | undefined): UserSkill => {
	return {
		...defaultUserSkill(),
		...payload,
		id: payload?.id || userId,
		userId: payload?.userId || userId,
		ownedSkills: normalizeOwnedSkills(payload?.ownedSkills),
	}
}

const createUserSkillCacheKey = (userIds: string[]) => {
	return [...new Set(userIds.filter(Boolean))].sort().join('|')
}

const masterDataById = computed(() => {
	return new Map(state.masterData.map((skill) => [skill.id, skill]))
})

const currentOwnedSkills = computed(() => {
	return state.currentUserSkills.flatMap((userSkill) => userSkill.ownedSkills)
})

const userOwnedSkills = computed(() => {
	return state.currentUserSkills.flatMap((userSkill) =>
		userSkill.ownedSkills.map((ownedSkill) => ({
			userId: userSkill.userId,
			...ownedSkill,
		}))
	)
})

const skillDetails = computed<SkillDetail[]>(() => {
	return currentOwnedSkills.value.map((ownedSkill) => {
		const master = masterDataById.value.get(ownedSkill.skillId)
		const normalizedMaster = master
			? master
			: {
					...defaultSkillMaster(),
					id: ownedSkill.skillId,
				}

		return {
			...normalizedMaster,
			skillId: ownedSkill.skillId,
			level: ownedSkill.level,
			masterMissing: !master,
		}
	})
})

const userSkillDetails = computed<UserSkillDetail[]>(() => {
	return userOwnedSkills.value.map((ownedSkill) => {
		const master = masterDataById.value.get(ownedSkill.skillId)
		const normalizedMaster = master
			? master
			: {
					...defaultSkillMaster(),
					id: ownedSkill.skillId,
				}

		return {
			...normalizedMaster,
			userId: ownedSkill.userId,
			skillId: ownedSkill.skillId,
			level: ownedSkill.level,
			masterMissing: !master,
		}
	})
})

const fetchMasterData = async (): Promise<SkillMaster[]> => {
	if (masterDataLoaded) {
		return state.masterData
	}

	if (masterDataPromise) {
		return masterDataPromise
	}

	masterDataPromise = withLoading(async () => {
		const previousMasterData = [...state.masterData]

		try {
			await dbSkillMasterModule.fetch()
			state.masterData = Array.from(dbSkillMasterModule.data.values()).sort((a, b) =>
				a.name.localeCompare(b.name, 'ja')
			)
			masterDataLoaded = true
			return state.masterData
		} catch (error) {
			state.masterData = previousMasterData
			throw error
		} finally {
			masterDataPromise = null
		}
	})

	return masterDataPromise
}

const fetchUserSkills = async (userId: string): Promise<UserSkill[]> => {
	const cacheKey = createUserSkillCacheKey([userId])

	if (!cacheKey) {
		state.currentUserSkills = []
		currentUserSkillOwnerKey = ''
		currentUserSkillsLoaded = false
		return state.currentUserSkills
	}

	if (
		currentUserSkillOwnerKey === cacheKey &&
		currentUserSkillsLoaded &&
		!currentUserSkillsPromise
	) {
		return state.currentUserSkills
	}

	if (currentUserSkillsPromise && currentUserSkillOwnerKey === cacheKey) {
		return currentUserSkillsPromise
	}

	const previousOwnerKey = currentUserSkillOwnerKey
	currentUserSkillOwnerKey = cacheKey

	currentUserSkillsPromise = withLoading(async () => {
		const previousUserSkills = [...state.currentUserSkills]
		const previousLoadedState = currentUserSkillsLoaded

		try {
			const payload = await dbUserSkillsModule.doc(userId).fetch({ force: true })
			state.currentUserSkills = payload?.id
				? [normalizeUserSkill(userId, payload)]
				: []
			currentUserSkillsLoaded = true
			return state.currentUserSkills
		} catch (error) {
			state.currentUserSkills = previousUserSkills
			currentUserSkillOwnerKey = previousOwnerKey
			currentUserSkillsLoaded = previousLoadedState
			throw error
		} finally {
			currentUserSkillsPromise = null
		}
	})

	return currentUserSkillsPromise
}

const fetchUsersSkills = async (userIds: string[]): Promise<UserSkill[]> => {
	const normalizedUserIds = [...new Set(userIds.filter(Boolean))]
	const cacheKey = createUserSkillCacheKey(normalizedUserIds)

	if (!cacheKey) {
		state.currentUserSkills = []
		currentUserSkillOwnerKey = ''
		currentUserSkillsLoaded = false
		return state.currentUserSkills
	}

	if (
		currentUserSkillOwnerKey === cacheKey &&
		currentUserSkillsLoaded &&
		!currentUserSkillsPromise
	) {
		return state.currentUserSkills
	}

	if (currentUserSkillsPromise && currentUserSkillOwnerKey === cacheKey) {
		return currentUserSkillsPromise
	}

	const previousOwnerKey = currentUserSkillOwnerKey
	currentUserSkillOwnerKey = cacheKey

	currentUserSkillsPromise = withLoading(async () => {
		const previousUserSkills = [...state.currentUserSkills]
		const previousLoadedState = currentUserSkillsLoaded

		try {
			const payloads = await Promise.all(
				normalizedUserIds.map((userId) =>
					dbUserSkillsModule.doc(userId).fetch({ force: true })
				)
			)

			state.currentUserSkills = payloads
				.map((payload, index) =>
					payload?.id
						? normalizeUserSkill(normalizedUserIds[index], payload)
						: null
				)
				.filter((userSkill): userSkill is UserSkill => userSkill !== null)
			currentUserSkillsLoaded = true
			return state.currentUserSkills
		} catch (error) {
			state.currentUserSkills = previousUserSkills
			currentUserSkillOwnerKey = previousOwnerKey
			currentUserSkillsLoaded = previousLoadedState
			throw error
		} finally {
			currentUserSkillsPromise = null
		}
	})

	return currentUserSkillsPromise
}

const setCurrentUserSkills = (userSkills: UserSkill | UserSkill[]) => {
	const normalizedUserSkills = Array.isArray(userSkills) ? userSkills : [userSkills]
	state.currentUserSkills = normalizedUserSkills.map((userSkill) =>
		normalizeUserSkill(userSkill.userId, userSkill)
	)
	currentUserSkillOwnerKey = createUserSkillCacheKey(
		state.currentUserSkills.map((userSkill) => userSkill.userId)
	)
	currentUserSkillsLoaded = true
}

const clearCurrentUserSkills = () => {
	state.currentUserSkills = []
	currentUserSkillOwnerKey = ''
	currentUserSkillsLoaded = false
	currentUserSkillsPromise = null
}

export const skillStore = {
	state,
	masterDataById,
	currentOwnedSkills,
	userOwnedSkills,
	skillDetails,
	userSkillDetails,
	fetchMasterData,
	fetchUserSkills,
	fetchUsersSkills,
	setCurrentUserSkills,
	clearCurrentUserSkills,
}

export const useSkillStore = () => skillStore
