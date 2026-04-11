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
let currentUserSkillOwnerId = ''
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

const masterDataById = computed(() => {
	return new Map(state.masterData.map((skill) => [skill.id, skill]))
})

const currentOwnedSkills = computed(() => {
	return state.currentUserSkills.flatMap((userSkill) => userSkill.ownedSkills)
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
	if (!userId) {
		state.currentUserSkills = []
		currentUserSkillOwnerId = ''
		currentUserSkillsLoaded = false
		return state.currentUserSkills
	}

	if (
		currentUserSkillOwnerId === userId &&
		currentUserSkillsLoaded &&
		!currentUserSkillsPromise
	) {
		return state.currentUserSkills
	}

	if (currentUserSkillsPromise && currentUserSkillOwnerId === userId) {
		return currentUserSkillsPromise
	}

	currentUserSkillOwnerId = userId

	currentUserSkillsPromise = withLoading(async () => {
		const previousUserSkills = [...state.currentUserSkills]
		const previousOwnerId = currentUserSkillOwnerId
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
			currentUserSkillOwnerId = previousOwnerId
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
	currentUserSkillOwnerId = state.currentUserSkills[0]?.userId || ''
	currentUserSkillsLoaded = true
}

const clearCurrentUserSkills = () => {
	state.currentUserSkills = []
	currentUserSkillOwnerId = ''
	currentUserSkillsLoaded = false
	currentUserSkillsPromise = null
}

export const skillStore = {
	state,
	masterDataById,
	currentOwnedSkills,
	skillDetails,
	fetchMasterData,
	fetchUserSkills,
	setCurrentUserSkills,
	clearCurrentUserSkills,
}

export const useSkillStore = () => skillStore
