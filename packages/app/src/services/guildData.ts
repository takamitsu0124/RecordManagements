import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { db, dbGuildCalendarEventsModule, dbGuildModule, writeDocWithRandomId } from '@rm/db'
import {
  AppUser,
  Guild,
  GuildCalendarEvent,
  GuildScheduleResponse,
  defaultAppUser,
  defaultGuildCalendarEvent,
  normalizeWeaponProficiencyLevels,
  normalizeWeaponProficiencySkillProgress,
} from '@rm/types'

const normalizeAppUser = (docId: string, data: AppUser): AppUser => ({
  ...defaultAppUser(),
  ...data,
  id: data.id || docId,
  uid: data.uid || docId,
  weaponProficiencyLevels: normalizeWeaponProficiencyLevels(
    data.weaponProficiencyLevels
  ),
  weaponProficiencySkillProgress: normalizeWeaponProficiencySkillProgress(
    data.weaponProficiencySkillProgress
  ),
})

const normalizeGuildScheduleResponse = (
  docId: string,
  data: GuildScheduleResponse
): GuildScheduleResponse => ({
  ...data,
  id: data.id || docId,
})

const toDate = (value: unknown) => {
  if (value instanceof Date) {
    return value
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate()
  }

  const parsed = new Date(String(value ?? ''))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const normalizeGuildCalendarEvent = (
  docId: string,
  data: GuildCalendarEvent
): GuildCalendarEvent => ({
  ...data,
  id: data.id || docId,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
  startAt: toDate(data.startAt),
  endAt: toDate(data.endAt),
})

export const fetchGuild = async (
  guildId: string,
  options?: { force?: boolean }
): Promise<Guild | null> => {
  if (options?.force === undefined) {
    await dbGuildModule.doc(guildId).fetch()
  } else {
    await dbGuildModule.doc(guildId).fetch({ force: options.force })
  }

  return dbGuildModule.doc(guildId).data || null
}

export const fetchGuildUsers = async (guildId: string): Promise<AppUser[]> => {
  const guildUsersQuery = query(
    collection(db, 'users'),
    where('guildId', '==', guildId)
  )
  const guildUsersSnapshot = await getDocs(guildUsersQuery)

  return guildUsersSnapshot.docs.map((docSnapshot) =>
    normalizeAppUser(docSnapshot.id, docSnapshot.data() as AppUser)
  )
}

export const fetchGuildScheduleResponses = async (
  guildId: string
): Promise<GuildScheduleResponse[]> => {
  const responsesQuery = query(
    collection(db, 'guild_schedule_responses'),
    where('guildId', '==', guildId)
  )
  const responsesSnapshot = await getDocs(responsesQuery)

  return responsesSnapshot.docs.map((docSnapshot) =>
    normalizeGuildScheduleResponse(
      docSnapshot.id,
      docSnapshot.data() as GuildScheduleResponse
    )
  )
}

export const fetchGuildCalendarEvents = async (
  guildId: string
): Promise<GuildCalendarEvent[]> => {
  const eventsQuery = query(
    collection(db, 'guild_calendar_events'),
    where('guildId', '==', guildId)
  )
  const eventsSnapshot = await getDocs(eventsQuery)

  return eventsSnapshot.docs
    .map((docSnapshot) =>
      normalizeGuildCalendarEvent(
        docSnapshot.id,
        docSnapshot.data() as GuildCalendarEvent
      )
    )
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
}

type GuildCalendarEventWritePayload = Pick<
  GuildCalendarEvent,
  'guildId' | 'title' | 'description' | 'location' | 'startAt' | 'endAt' | 'allDay'
>

export const createGuildCalendarEvent = async (
  payload: GuildCalendarEventWritePayload
) => {
  await writeDocWithRandomId(dbGuildCalendarEventsModule, {
    ...defaultGuildCalendarEvent(),
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export const updateGuildCalendarEvent = async (
  eventId: string,
  payload: Omit<GuildCalendarEventWritePayload, 'guildId'>
) => {
  await dbGuildCalendarEventsModule.doc(eventId).merge(payload)
}

export const deleteGuildCalendarEvent = async (eventId: string) => {
  await deleteDoc(doc(db, 'guild_calendar_events', eventId))
}
