import { SkillMaster } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbSkillMasterModule = magnetar.collection<SkillMaster>(
	'skill_master',
	{
		modifyPayloadOn: {
			insert: (payload: SkillMaster) => {
				;(payload.updatedBy = auth.currentUser?.uid || ''),
					(payload.createdBy = auth.currentUser?.uid || '')
				return { ...payload }
			},
			merge: (payload: SkillMaster) => {
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
