import { AppUser, OwnedSkill, SkillMaster } from '@rm/types'

export type ImageItem = {
  id: string
  previewUrl: string
  persistedUrl: string | null
  file: File | null
  objectUrl: string | null
  isNew: boolean
  label: string
}

export type OwnedSkillRow = OwnedSkill & {
  index: number
  name: string
  element: string
  equipmentType: string
  skillType: string
  skillName: string
  image: string
  masterMissing: boolean
}

export type SkillCatalogStatus = 'all' | 'owned' | 'unowned'

export type SkillCatalogRow = SkillMaster & {
  isOwned: boolean
  ownedLevel: number
}

export type WorkspaceProfile = {
  displayName: string
  displayNameKana: string
  guildId: string
  affiliationDate: Date | null
  affiliationNum: number
  situation: AppUser['situation']
  gameStartDateAt: Date | null
  email: string
  phone: string
  birthDateAt: Date | null
  imageUrls: string[]
}

export const defaultWorkspaceProfile = (): WorkspaceProfile => ({
  displayName: '',
  displayNameKana: '',
  guildId: '',
  affiliationDate: null,
  affiliationNum: 0,
  situation: '現役',
  gameStartDateAt: null,
  email: '',
  phone: '',
  birthDateAt: null,
  imageUrls: [],
})
