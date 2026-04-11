import { DefaultType } from './default'

export type SkillAttribute = string
export type SkillWeaponType = string

export type SkillMaster = {
	/** Skill display name */
	name: string
	/** Attribute such as fire/water/wood */
	attr: SkillAttribute
	/** Weapon type such as sword/staff */
	type: SkillWeaponType
} & DefaultType

export function defaultSkillMaster(): SkillMaster {
	return {
		id: '',
		createdAt: new Date(),
		createdBy: '',
		updatedAt: new Date(),
		updatedBy: '',
		name: '',
		attr: '',
		type: '',
	}
}
