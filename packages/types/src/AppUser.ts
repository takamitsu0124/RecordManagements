import { DefaultType } from './default'
import { AppRole } from './AppRole'

export type AppUser = {
	/** Auth UID */
	uid: string
	/** Login email */
	email: string
	/** Display name */
	displayName: string
	/** Display name in Kana */
	displayNameKana: string
	/** Belonging guild ID */
	guildId: string
	/** Belonging number inside guild */
	affiliationNum: number
	/** Player situation */
	situation: '現役' | '隠居' | '引退' | ''
	/** Guild affiliation date */
	affiliationDate: Date | null
	/** Game start date */
	gameStartDateAt: Date | null
	/** Birth date */
	birthDateAt: Date | null
	/** Contact phone */
	phone: string
	/** Managed image URLs */
	imageUrls: string[]
	/** Access role */
	role: AppRole
} & DefaultType

export function defaultAppUser(): AppUser {
	return {
		id: '',
		createdAt: new Date(),
		createdBy: '',
		updatedAt: new Date(),
		updatedBy: '',
		uid: '',
		email: '',
		displayName: '',
		displayNameKana: '',
		guildId: '',
		affiliationNum: 0,
		situation: '現役',
		affiliationDate: null,
		gameStartDateAt: null,
		birthDateAt: null,
		phone: '',
		imageUrls: [],
		role: 'member',
	}
}
