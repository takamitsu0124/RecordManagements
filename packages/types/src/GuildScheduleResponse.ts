import { DefaultType } from './default'

export const guildScheduleStatuses = ['available', 'maybe', 'unavailable'] as const

export type GuildScheduleStatus = (typeof guildScheduleStatuses)[number]

export type GuildScheduleEntry = {
	status: GuildScheduleStatus
	note: string
}

export type GuildScheduleEntries = Record<string, GuildScheduleEntry>

export type GuildScheduleResponse = {
	guildId: string
	userId: string
	entries: GuildScheduleEntries
} & DefaultType

export function defaultGuildScheduleEntry(): GuildScheduleEntry {
	return {
		status: 'maybe',
		note: '',
	}
}

export function defaultGuildScheduleResponse(): GuildScheduleResponse {
	return {
		id: '',
		createdAt: new Date(),
		createdBy: '',
		updatedAt: new Date(),
		updatedBy: '',
		guildId: '',
		userId: '',
		entries: {},
	}
}
