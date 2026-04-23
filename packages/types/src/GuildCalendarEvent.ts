import { DefaultType } from './default'

export type GuildCalendarEvent = {
  guildId: string
  title: string
  description: string
  location: string
  startAt: Date
  endAt: Date
  allDay: boolean
} & DefaultType

export function defaultGuildCalendarEvent(): GuildCalendarEvent {
  const now = new Date()

  return {
    id: '',
    createdAt: now,
    createdBy: '',
    updatedAt: now,
    updatedBy: '',
    guildId: '',
    title: '',
    description: '',
    location: '',
    startAt: now,
    endAt: now,
    allDay: false,
  }
}
