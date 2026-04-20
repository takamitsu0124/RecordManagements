import { DefaultType } from './default'

export type SkillMaster = {
	/** Skill display name */
	name: string
	/** Attribute such as fire/water/earth */
	attr: string
	/** Detailed category such as sword/link or ability/chain */
	type: string
	/** Cooldown text */
	cool: string
	/** Switch gauge text */
	swGauge: string
	/** Burst gauge text */
	brGauge: string
	/** Skill image URL */
	image: string
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
		cool: '',
		swGauge: '',
		brGauge: '',
		image: '',
	}
}
