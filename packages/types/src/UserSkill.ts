import { DefaultType } from './default'
import { SkillMaster } from './SkillMaster'

export type OwnedSkill = {
	/** Skill master document ID */
	skillId: SkillMaster['id']
	/** Numeric proficiency level for the owned skill */
	level: number
}

export type UserSkill = {
	/** Owner user UID */
	userId: string
	/** Owned skills for the user */
	ownedSkills: OwnedSkill[]
} & DefaultType

export function defaultOwnedSkill(): OwnedSkill {
	return {
		skillId: '',
		level: 0,
	}
}

export function defaultUserSkill(): UserSkill {
	return {
		id: '',
		createdAt: new Date(),
		createdBy: '',
		updatedAt: new Date(),
		updatedBy: '',
		userId: '',
		ownedSkills: [],
	}
}
