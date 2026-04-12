import { AppRole } from '@rm/types'

export const googleCalendarScopes = {
	readonlyEvents: 'https://www.googleapis.com/auth/calendar.events.readonly',
	manageEvents: 'https://www.googleapis.com/auth/calendar.events',
} as const

export const googleCalendarDiscoveryDocDefault =
	'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
export const googleCalendarRedirectPathDefault = '/google-calendar/oauth/callback'
export const googleCalendarUxMode = 'popup' as const

type PublicGoogleCalendarConfig = {
	clientId: string
	discoveryDoc: string
	redirectPath: string
	enableGuildCalendar: boolean
	enablePersonalCalendar: boolean
}

type CalendarPermissionPolicy = {
	canViewGuildCalendar: boolean
	canEditGuildCalendar: boolean
	canConnectPersonalCalendar: boolean
	canEditPersonalCalendar: boolean
}

type TokenPolicy = {
	storage: 'memory'
	usesRefreshToken: false
	renewal: 'google.accounts.oauth2.requestAccessToken'
	revocation: 'google.accounts.oauth2.revoke'
}

const calendarPublicEnv = {
	clientId: process.env.APP_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || '',
	discoveryDoc: process.env.APP_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC || '',
	redirectPath: process.env.APP_PUBLIC_GOOGLE_CALENDAR_REDIRECT_PATH || '',
	enableGuildCalendar: process.env.APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_GUILD_CALENDAR || '',
	enablePersonalCalendar:
		process.env.APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_PERSONAL_CALENDAR || '',
} as const

const readEnv = (value: string, fallback = '') => {
	return typeof value === 'string' ? value.trim() : fallback
}

const readEnvBoolean = (value: string, fallback: boolean) => {
	const normalizedValue = readEnv(value, fallback ? 'true' : 'false').toLowerCase()
	if (normalizedValue === '') {
		return fallback
	}

	const valueSet = new Set(['true', '1', 'yes', 'on'])
	const falseSet = new Set(['false', '0', 'no', 'off'])

	if (valueSet.has(normalizedValue)) {
		return true
	}

	if (falseSet.has(normalizedValue)) {
		return false
	}

	return fallback
}

export const googleCalendarPublicConfig: PublicGoogleCalendarConfig = Object.freeze({
	clientId: readEnv(calendarPublicEnv.clientId),
	discoveryDoc: readEnv(
		calendarPublicEnv.discoveryDoc,
		googleCalendarDiscoveryDocDefault
	),
	redirectPath: readEnv(
		calendarPublicEnv.redirectPath,
		googleCalendarRedirectPathDefault
	),
	enableGuildCalendar: readEnvBoolean(
		calendarPublicEnv.enableGuildCalendar,
		true
	),
	enablePersonalCalendar: readEnvBoolean(
		calendarPublicEnv.enablePersonalCalendar,
		false
	),
})

const ensureLeadingSlash = (value: string) => {
	if (!value) {
		return googleCalendarRedirectPathDefault
	}

	return value.startsWith('/') ? value : `/${value}`
}

export const googleCalendarRedirectPath = ensureLeadingSlash(
	googleCalendarPublicConfig.redirectPath
)

export const googleCalendarTokenPolicy: TokenPolicy = Object.freeze({
	storage: 'memory',
	usesRefreshToken: false,
	renewal: 'google.accounts.oauth2.requestAccessToken',
	revocation: 'google.accounts.oauth2.revoke',
})

export const googleCalendarRolePolicies: Record<AppRole, CalendarPermissionPolicy> =
	Object.freeze({
		admin: {
			canViewGuildCalendar: true,
			canEditGuildCalendar: true,
			canConnectPersonalCalendar: true,
			canEditPersonalCalendar: true,
		},
		guild_admin: {
			canViewGuildCalendar: true,
			canEditGuildCalendar: true,
			canConnectPersonalCalendar: true,
			canEditPersonalCalendar: true,
		},
		member: {
			canViewGuildCalendar: true,
			canEditGuildCalendar: false,
			canConnectPersonalCalendar: true,
			canEditPersonalCalendar: true,
		},
	})

export const getGoogleCalendarScopesForMode = (mode: 'view' | 'edit') => {
	return mode === 'edit'
		? [googleCalendarScopes.readonlyEvents, googleCalendarScopes.manageEvents]
		: [googleCalendarScopes.readonlyEvents]
}

export const getGoogleCalendarRolePolicy = (role: AppRole): CalendarPermissionPolicy => {
	return googleCalendarRolePolicies[role]
}

export const getGoogleCalendarRedirectUri = (origin?: string) => {
	const resolvedOrigin =
		origin ||
		(typeof window !== 'undefined' ? window.location.origin : '')

	if (!resolvedOrigin) {
		return googleCalendarRedirectPath
	}

	return new URL(googleCalendarRedirectPath, `${resolvedOrigin}/`).toString()
}

export const validateGoogleCalendarPublicConfig = () => {
	if (!googleCalendarPublicConfig.clientId) {
		throw new Error(
			'APP_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID is required before enabling Google Calendar OAuth.'
		)
	}

	if (!googleCalendarPublicConfig.discoveryDoc) {
		throw new Error(
			'APP_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC must not be empty.'
		)
	}

	return googleCalendarPublicConfig
}
