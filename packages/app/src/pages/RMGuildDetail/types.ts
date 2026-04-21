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
  skillName: string
  attr: string
  type: string
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
  topSkills: string[]
}
