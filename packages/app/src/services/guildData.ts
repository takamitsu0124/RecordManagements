import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, dbGuildModule } from '@rm/db'
import { AppUser, Guild, GuildScheduleResponse } from '@rm/types'

const normalizeAppUser = (docId: string, data: AppUser): AppUser => ({
  ...data,
  id: data.id || docId,
  uid: data.uid || docId,
})

const normalizeGuildScheduleResponse = (
  docId: string,
  data: GuildScheduleResponse
): GuildScheduleResponse => ({
  ...data,
  id: data.id || docId,
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
