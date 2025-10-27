import { Guild } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbUserModule = magnetar.collection<Guild>('guild', {
  modifyPayloadOn: {
    insert: (payload: Guild) => {
      ;(payload.updatedBy = auth.currentUser?.uid || ''),
        (payload.createdBy = auth.currentUser?.uid || '')
      return { ...payload }
    },
    merge: (payload: Guild) => {
      ;(payload.updatedAt = new Date()),
        (payload.updatedBy = auth.currentUser?.uid || '')
      return { ...payload }
    },
    modifyReadResponseOn: {
      added: formatDataTimestampToDate,
      modified: formatDataTimestampToDate
    }
  }
})
