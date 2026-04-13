import { GuildScheduleResponse } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbGuildScheduleResponsesModule = magnetar.collection<GuildScheduleResponse>(
	'guild_schedule_responses',
	{
		modifyPayloadOn: {
			insert: (payload: GuildScheduleResponse) => {
				;(payload.updatedBy = auth.currentUser?.uid || ''),
					(payload.createdBy = auth.currentUser?.uid || '')
				return { ...payload }
			},
			merge: (payload: GuildScheduleResponse) => {
				;(payload.updatedAt = new Date()),
					(payload.updatedBy = auth.currentUser?.uid || '')
				return { ...payload }
			},
		},
		modifyReadResponseOn: {
			added: formatDataTimestampToDate,
			modified: formatDataTimestampToDate,
		},
	}
)
