import { DefaultType } from './default'
import { AppRole, defaultAppRole } from './AppRole'

export type AppUser = {
	/** Auth UID */
	uid: string
	/** Login email */
	email: string
	/** Display name */
	displayName: string
	/** Belonging guild ID */
	guildId: string
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
		guildId: '',
		role: defaultAppRole(),
	}
}
