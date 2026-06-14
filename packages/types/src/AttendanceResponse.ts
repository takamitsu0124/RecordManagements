import {
  AttendanceCandidate,
  AttendanceCandidateSummaries,
  createAttendanceCandidateSummaries,
  normalizeAttendanceDate,
} from './AttendanceEvent'
import { DefaultType } from './default'

export type AttendanceStatus = 'available' | 'maybe' | 'unavailable'

export const attendanceStatusDefinitions = [
  { key: 'available', label: '○' },
  { key: 'maybe', label: '△' },
  { key: 'unavailable', label: '×' },
] as const

export type AttendanceAnswer = {
  status: AttendanceStatus
  note: string
}

export type AttendanceAnswers = Record<string, AttendanceAnswer>

export type AttendanceResponse = {
  eventId: string
  displayName: string
  comment: string
  answers: AttendanceAnswers
} & DefaultType

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value : ''

export function defaultAttendanceAnswer(): AttendanceAnswer {
  return {
    status: 'maybe',
    note: '',
  }
}

export function normalizeAttendanceStatus(value: unknown): AttendanceStatus {
  if (value === 'available' || value === 'maybe' || value === 'unavailable') {
    return value
  }

  return 'maybe'
}

export function normalizeAttendanceAnswer(
  value?: Partial<AttendanceAnswer> | null
): AttendanceAnswer {
  return {
    status: normalizeAttendanceStatus(value?.status),
    note: normalizeString(value?.note),
  }
}

export function normalizeAttendanceAnswers(value?: unknown): AttendanceAnswers {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([candidateId]) => typeof candidateId === 'string' && candidateId !== '')
      .map(([candidateId, answer]) => [
        candidateId,
        normalizeAttendanceAnswer(
          isRecord(answer) ? (answer as Partial<AttendanceAnswer>) : null
        ),
      ])
  )
}

export function defaultAttendanceResponse(): AttendanceResponse {
  return {
    id: '',
    eventId: '',
    displayName: '',
    comment: '',
    answers: {},
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
  }
}

export function normalizeAttendanceResponse(
  value?: Partial<AttendanceResponse> | null
): AttendanceResponse {
  const base = defaultAttendanceResponse()

  return {
    ...base,
    ...(value || {}),
    id: normalizeString(value?.id),
    eventId: normalizeString(value?.eventId),
    displayName: normalizeString(value?.displayName),
    comment: normalizeString(value?.comment),
    answers: normalizeAttendanceAnswers(value?.answers),
    createdAt: normalizeAttendanceDate(value?.createdAt) || base.createdAt,
    createdBy: normalizeString(value?.createdBy),
    updatedAt: normalizeAttendanceDate(value?.updatedAt) || base.updatedAt,
    updatedBy: normalizeString(value?.updatedBy),
  }
}

export function summarizeAttendanceResponses(
  candidates: AttendanceCandidate[],
  responses: AttendanceResponse[]
): AttendanceCandidateSummaries {
  const summaries = createAttendanceCandidateSummaries(candidates)

  responses.forEach((response) => {
    candidates.forEach((candidate) => {
      const answer = response.answers[candidate.id]
      if (!answer) return

      if (answer.status === 'available') {
        summaries[candidate.id].availableCount += 1
      }
      if (answer.status === 'maybe') {
        summaries[candidate.id].maybeCount += 1
      }
      if (answer.status === 'unavailable') {
        summaries[candidate.id].unavailableCount += 1
      }
    })
  })

  return summaries
}

export function applyAttendanceAnswersToSummaries(
  candidates: AttendanceCandidate[],
  currentSummaries: AttendanceCandidateSummaries,
  answers: AttendanceAnswers
): AttendanceCandidateSummaries {
  const nextSummaries = {
    ...createAttendanceCandidateSummaries(candidates),
  }

  Object.entries(currentSummaries).forEach(([candidateId, summary]) => {
    if (!nextSummaries[candidateId]) return
    nextSummaries[candidateId] = {
      ...summary,
    }
  })

  candidates.forEach((candidate) => {
    const answer = answers[candidate.id]
    if (!answer) return

    if (answer.status === 'available') {
      nextSummaries[candidate.id].availableCount += 1
    }
    if (answer.status === 'maybe') {
      nextSummaries[candidate.id].maybeCount += 1
    }
    if (answer.status === 'unavailable') {
      nextSummaries[candidate.id].unavailableCount += 1
    }
  })

  return nextSummaries
}
