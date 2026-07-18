import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from 'firebase/firestore'
import { genFirebaseRandomId } from '@codelic/datagen'
import { auth, db, dbAttendanceEventsModule } from '@rm/db'
import type {
  AttendanceAnswers,
  AttendanceCandidate,
  AttendanceCandidateSummaries,
  AttendanceEvent,
  AttendanceResponse} from '@rm/types'
import {
  applyAttendanceAnswersToSummaries,
  createAttendanceCandidateSummaries,
  defaultAttendanceEvent,
  defaultAttendanceResponse,
  isAttendanceEventClosedForResponses,
  normalizeAttendanceAnswers,
  normalizeAttendanceDate,
  normalizeAttendanceEvent,
  normalizeAttendanceResponse
} from '@rm/types'

type AttendanceEventWritePayload = Pick<
  AttendanceEvent,
  'title' | 'description' | 'location' | 'candidates' | 'answerDeadlineAt'
> & {
  ownerUid: string
}

type AttendanceEventUpdatePayload = Partial<
  Pick<
    AttendanceEvent,
    | 'title'
    | 'description'
    | 'location'
    | 'candidates'
    | 'answerDeadlineAt'
    | 'isClosed'
    | 'isDeleted'
  >
>

type AttendanceResponseWritePayload = Pick<
  AttendanceResponse,
  'eventId' | 'displayName' | 'comment' | 'answers'
>

const createPublicToken = () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = new Uint8Array(24)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
    return Array.from(values)
      .map((value) => chars[value % chars.length])
      .join('')
  }

  return `${genFirebaseRandomId()}${genFirebaseRandomId()}`.replace(/-/g, '').slice(
    0,
    24
  )
}

const attendanceEventCollection = collection(db, 'attendance_events')
const attendanceResponseCollection = collection(db, 'attendance_responses')

const formatCandidateLabel = (startAt: Date | null, fallbackIndex: number) => {
  if (!startAt) {
    return `候補${fallbackIndex + 1}`
  }

  const formatter = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${formatter.format(startAt)}〜`
}

const normalizeCandidatesForSave = (candidates: AttendanceCandidate[]) =>
  candidates.map((candidate, index) => {
    const startAt = normalizeAttendanceDate(candidate.startAt)
    const endAt = normalizeAttendanceDate(candidate.endAt)

    return {
      id: candidate.id || genFirebaseRandomId(),
      label:
        typeof candidate.label === 'string' && candidate.label.trim()
          ? candidate.label.trim()
          : formatCandidateLabel(startAt, index),
      startAt,
      endAt
    }
  })

const reconcileCandidateSummaries = (
  candidates: AttendanceCandidate[],
  currentSummaries?: AttendanceCandidateSummaries
) => {
  const nextSummaries = createAttendanceCandidateSummaries(candidates)

  Object.entries(currentSummaries || {}).forEach(([candidateId, summary]) => {
    if (!nextSummaries[candidateId]) return
    nextSummaries[candidateId] = {
      ...nextSummaries[candidateId],
      availableCount: summary.availableCount,
      maybeCount: summary.maybeCount,
      unavailableCount: summary.unavailableCount
    }
  })

  return nextSummaries
}

const normalizeAttendanceEventSnapshot = (
  docId: string,
  data: AttendanceEvent
): AttendanceEvent =>
  normalizeAttendanceEvent({
    ...defaultAttendanceEvent(),
    ...data,
    id: data.id || docId,
    publicToken: data.publicToken || docId
  })

const normalizeAttendanceResponseSnapshot = (
  docId: string,
  data: AttendanceResponse
): AttendanceResponse =>
  normalizeAttendanceResponse({
    ...defaultAttendanceResponse(),
    ...data,
    id: data.id || docId
  })

export const createAttendanceEvent = async (
  payload: AttendanceEventWritePayload
) => {
  const publicToken = createPublicToken()
  const now = new Date()
  const candidates = normalizeCandidatesForSave(payload.candidates)
  const eventPayload = normalizeAttendanceEvent({
    ...defaultAttendanceEvent(),
    id: publicToken,
    ownerUid: payload.ownerUid,
    publicToken,
    title: payload.title.trim(),
    description: payload.description.trim(),
    location: payload.location.trim(),
    candidates,
    candidateSummaries: createAttendanceCandidateSummaries(candidates),
    responseCount: 0,
    answerDeadlineAt: normalizeAttendanceDate(payload.answerDeadlineAt),
    isClosed: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now
  })

  await dbAttendanceEventsModule.doc(publicToken).insert(eventPayload)
  return publicToken
}

export const fetchMyAttendanceEvents = async (
  ownerUid: string
): Promise<AttendanceEvent[]> => {
  const attendanceEventsQuery = query(
    attendanceEventCollection,
    where('ownerUid', '==', ownerUid),
    where('isDeleted', '==', false)
  )
  const attendanceEventsSnapshot = await getDocs(attendanceEventsQuery)

  return attendanceEventsSnapshot.docs
    .map((docSnapshot) =>
      normalizeAttendanceEventSnapshot(
        docSnapshot.id,
        docSnapshot.data() as AttendanceEvent
      )
    )
    .filter((event) => !event.isDeleted)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
}

export const fetchAttendanceEvent = async (
  eventId: string
): Promise<AttendanceEvent | null> => {
  const eventSnapshot = await getDoc(doc(db, 'attendance_events', eventId))
  if (!eventSnapshot.exists()) {
    return null
  }

  const event = normalizeAttendanceEventSnapshot(
    eventSnapshot.id,
    eventSnapshot.data() as AttendanceEvent
  )

  return event.isDeleted ? null : event
}

export const fetchAttendanceEventByPublicToken = async (
  publicToken: string
): Promise<AttendanceEvent | null> => {
  const directEvent = await fetchAttendanceEvent(publicToken)
  return directEvent?.publicToken === publicToken ? directEvent : null
}

export const updateAttendanceEvent = async (
  eventId: string,
  payload: AttendanceEventUpdatePayload
) => {
  const current = await fetchAttendanceEvent(eventId)
  if (!current) {
    throw new Error('Attendance event not found.')
  }

  const nextCandidates = payload.candidates
    ? normalizeCandidatesForSave(payload.candidates)
    : current.candidates

  await dbAttendanceEventsModule.doc(eventId).merge({
    title: payload.title?.trim() ?? current.title,
    description: payload.description?.trim() ?? current.description,
    location: payload.location?.trim() ?? current.location,
    candidates: nextCandidates,
    candidateSummaries: reconcileCandidateSummaries(
      nextCandidates,
      current.candidateSummaries
    ),
    answerDeadlineAt:
      payload.answerDeadlineAt !== undefined
        ? normalizeAttendanceDate(payload.answerDeadlineAt)
        : current.answerDeadlineAt,
    isClosed: payload.isClosed ?? current.isClosed,
    isDeleted: payload.isDeleted ?? current.isDeleted
  })
}

export const closeAttendanceEvent = async (eventId: string) => {
  await dbAttendanceEventsModule.doc(eventId).merge({
    isClosed: true
  })
}

export const softDeleteAttendanceEvent = async (eventId: string) => {
  await dbAttendanceEventsModule.doc(eventId).merge({
    isDeleted: true
  })
}

export const fetchAttendanceResponses = async (
  eventId: string
): Promise<AttendanceResponse[]> => {
  const attendanceResponsesQuery = query(
    attendanceResponseCollection,
    where('eventId', '==', eventId)
  )
  const attendanceResponsesSnapshot = await getDocs(attendanceResponsesQuery)

  return attendanceResponsesSnapshot.docs
    .map((docSnapshot) =>
      normalizeAttendanceResponseSnapshot(
        docSnapshot.id,
        docSnapshot.data() as AttendanceResponse
      )
    )
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
}

export const submitAttendanceResponse = async (
  payload: AttendanceResponseWritePayload
) => {
  const responseId = genFirebaseRandomId()

  await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, 'attendance_events', payload.eventId)
    const responseRef = doc(db, 'attendance_responses', responseId)
    const eventSnapshot = await transaction.get(eventRef)

    if (!eventSnapshot.exists()) {
      throw new Error('Attendance event not found.')
    }

    const event = normalizeAttendanceEventSnapshot(
      eventSnapshot.id,
      eventSnapshot.data() as AttendanceEvent
    )

    if (isAttendanceEventClosedForResponses(event)) {
      throw new Error('Attendance event is closed.')
    }

    const normalizedAnswers = normalizeAttendanceAnswers(payload.answers)

    const hasAllAnswers = event.candidates.every(
      (candidate) => normalizedAnswers[candidate.id] !== undefined
    )

    if (!hasAllAnswers) {
      throw new Error('All attendance candidates must be answered.')
    }

    const now = new Date()
    const nextCandidateSummaries = applyAttendanceAnswersToSummaries(
      event.candidates,
      event.candidateSummaries,
      normalizedAnswers
    )

    transaction.set(responseRef, {
      ...defaultAttendanceResponse(),
      id: responseId,
      eventId: event.id,
      displayName: payload.displayName.trim(),
      comment: payload.comment.trim(),
      answers: normalizedAnswers,
      createdAt: now,
      createdBy: auth.currentUser?.uid || '',
      updatedAt: now,
      updatedBy: auth.currentUser?.uid || ''
    })

    transaction.update(eventRef, {
      candidateSummaries: nextCandidateSummaries,
      responseCount: event.responseCount + 1,
      updatedAt: now,
      updatedBy: auth.currentUser?.uid || ''
    })
  })

  return responseId
}
