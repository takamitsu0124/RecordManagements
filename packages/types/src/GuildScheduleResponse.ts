import { DefaultType } from './default'

export type GuildScheduleStatus = 'available' | 'maybe' | 'unavailable'

type GuildScheduleEntry = {
	status: GuildScheduleStatus
	note: string
}

type GuildScheduleEntries = Record<string, GuildScheduleEntry>

export type GuildScheduleResponse = {
	guildId: string
	userId: string
	entries: GuildScheduleEntries
} & DefaultType

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
