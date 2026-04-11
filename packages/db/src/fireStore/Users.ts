import { AppUser } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbUsersModule = magnetar.collection<AppUser>('users', {
	modifyPayloadOn: {
		insert: (payload: AppUser) => {
			;(payload.updatedBy = auth.currentUser?.uid || ''),
				(payload.createdBy = auth.currentUser?.uid || '')
			return { ...payload }
		},
		merge: (payload: AppUser) => {
			;(payload.updatedAt = new Date()),
				(payload.updatedBy = auth.currentUser?.uid || '')
			return { ...payload }
		},
	},
	modifyReadResponseOn: {
		added: formatDataTimestampToDate,
		modified: formatDataTimestampToDate,
	},
})
