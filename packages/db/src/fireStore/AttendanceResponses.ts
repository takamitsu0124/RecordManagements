import { AttendanceResponse } from '@rm/types'
import { createFirestoreCollection } from './createCollection'

export const dbAttendanceResponsesModule =
  createFirestoreCollection<AttendanceResponse>('attendance_responses')
