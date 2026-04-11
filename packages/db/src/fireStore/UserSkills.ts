import { UserSkill } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbUserSkillsModule = magnetar.collection<UserSkill>('user_skills', {
	modifyPayloadOn: {
		insert: (payload: UserSkill) => {
			;(payload.updatedBy = auth.currentUser?.uid || ''),
				(payload.createdBy = auth.currentUser?.uid || '')
			return { ...payload }
		},
		merge: (payload: UserSkill) => {
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
