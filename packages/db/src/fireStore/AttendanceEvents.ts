import { AttendanceEvent } from '@rm/types'
import { createFirestoreCollection } from './createCollection'

export const dbAttendanceEventsModule =
  createFirestoreCollection<AttendanceEvent>('attendance_events')
