import { User } from '@rm/types'
import { auth, magnetar } from '../config'
import { formatDataTimestampToDate } from '../utils'

export const dbUserModule = magnetar.collection<User>('user', {
  modifyReadResponseOn: {
    added: formatDataTimestampToDate,
    modified: formatDataTimestampToDate
  },
  modifyPayloadOn: {
    write: (payload) => {
      return {
        ...payload,

        updatedAt: new Date(),
        updatedBy: auth.currentUser?.uid || ''
      }
    }
  }
})
