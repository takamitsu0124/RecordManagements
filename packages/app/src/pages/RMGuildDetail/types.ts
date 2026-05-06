import { AppRole } from '@rm/types'

export type GuildUserRow = {
  uid: string
  displayName: string
  role: AppRole
  hasUserDocument: boolean
}

export type GuildSkillRow = {
  rowId: string
  userId: string
  userName: string
  role: AppRole
  skillId: string
  name: string
  characterName: string
  skillName: string
  effect: string
  element: string
  equipmentType: string
  skillType: string
  attackType: string
  breakGauge: number | null
  switchGauge: number | null
  cooldown: number | null
  level: number
  unlockRate: number
  unlockRateText: string
  ownedCount: number
  image: string
  masterMissing: boolean
}

export type GuildMemberSkillSummary = {
  uid: string
  displayName: string
  role: AppRole
  ownedCount: number
  unlockRate: number
  unlockRateText: string
  weaponProficiencyCount: number
  weaponProficiencyTotalLevel: number
  weaponProficiencyProgressRate: number
  weaponProficiencyProgressRateText: string
  topSkills: string[]
}
