export const appRoles = ['admin', 'guild_admin', 'member'] as const

export type AppRole = (typeof appRoles)[number]

export const defaultAppRole = (): AppRole => {
	return 'member'
}
