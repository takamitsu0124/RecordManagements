import { DefaultType } from './default'

export type AttendanceCandidate = {
  id: string
  label: string
  startAt: Date | null
  endAt: Date | null
}

export type AttendanceCandidateSummary = {
  candidateId: string
  label: string
  availableCount: number
  maybeCount: number
  unavailableCount: number
}

export type AttendanceCandidateSummaries = Record<
  string,
  AttendanceCandidateSummary
>

export type AttendanceEvent = {
  ownerUid: string
  publicToken: string
  title: string
  description: string
  location: string
  candidates: AttendanceCandidate[]
  candidateSummaries: AttendanceCandidateSummaries
  responseCount: number
  answerDeadlineAt: Date | null
  isClosed: boolean
  isDeleted: boolean
} & DefaultType

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value : ''

const normalizeCount = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(value))
}

export const normalizeAttendanceDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate()
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
  }

  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function defaultAttendanceCandidate(): AttendanceCandidate {
  return {
    id: '',
    label: '',
    startAt: null,
    endAt: null,
  }
}

export function normalizeAttendanceCandidate(
  value?: Partial<AttendanceCandidate> | null
): AttendanceCandidate {
  return {
    id: normalizeString(value?.id),
    label: normalizeString(value?.label),
    startAt: normalizeAttendanceDate(value?.startAt),
    endAt: normalizeAttendanceDate(value?.endAt),
  }
}

export function normalizeAttendanceCandidates(value?: unknown): AttendanceCandidate[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((candidate) =>
      isRecord(candidate)
        ? normalizeAttendanceCandidate(candidate as Partial<AttendanceCandidate>)
        : defaultAttendanceCandidate()
    )
    .filter((candidate) => candidate.id !== '')
}

export function createAttendanceCandidateSummaries(
  candidates: AttendanceCandidate[]
): AttendanceCandidateSummaries {
  return Object.fromEntries(
    candidates.map((candidate) => [
      candidate.id,
      {
        candidateId: candidate.id,
        label: candidate.label,
        availableCount: 0,
        maybeCount: 0,
        unavailableCount: 0,
      },
    ])
  )
}

export function normalizeAttendanceCandidateSummaries(
  value: unknown,
  candidates: AttendanceCandidate[]
): AttendanceCandidateSummaries {
  const base = createAttendanceCandidateSummaries(candidates)

  if (!isRecord(value)) {
    return base
  }

  return Object.fromEntries(
    candidates.map((candidate) => {
      const rawSummary = value[candidate.id]
      const summary = isRecord(rawSummary) ? rawSummary : {}

      return [
        candidate.id,
        {
          candidateId: candidate.id,
          label:
            typeof summary.label === 'string' && summary.label
              ? summary.label
              : candidate.label,
          availableCount: normalizeCount(summary.availableCount),
          maybeCount: normalizeCount(summary.maybeCount),
          unavailableCount: normalizeCount(summary.unavailableCount),
        },
      ]
    })
  )
}

export function defaultAttendanceEvent(): AttendanceEvent {
  return {
    id: '',
    ownerUid: '',
    publicToken: '',
    title: '',
    description: '',
    location: '',
    candidates: [],
    candidateSummaries: {},
    responseCount: 0,
    answerDeadlineAt: null,
    isClosed: false,
    isDeleted: false,
    createdAt: new Date(),
    createdBy: '',
    updatedAt: new Date(),
    updatedBy: '',
  }
}

export function normalizeAttendanceEvent(
  value?: Partial<AttendanceEvent> | null
): AttendanceEvent {
  const base = defaultAttendanceEvent()
  const candidates = normalizeAttendanceCandidates(value?.candidates)

  return {
    ...base,
    ...(value || {}),
    id: normalizeString(value?.id),
    ownerUid: normalizeString(value?.ownerUid),
    publicToken: normalizeString(value?.publicToken),
    title: normalizeString(value?.title),
    description: normalizeString(value?.description),
    location: normalizeString(value?.location),
    candidates,
    candidateSummaries: normalizeAttendanceCandidateSummaries(
      value?.candidateSummaries,
      candidates
    ),
    responseCount: normalizeCount(value?.responseCount),
    answerDeadlineAt: normalizeAttendanceDate(value?.answerDeadlineAt),
    isClosed: value?.isClosed === true,
    isDeleted: value?.isDeleted === true,
    createdAt: normalizeAttendanceDate(value?.createdAt) || base.createdAt,
    createdBy: normalizeString(value?.createdBy),
    updatedAt: normalizeAttendanceDate(value?.updatedAt) || base.updatedAt,
    updatedBy: normalizeString(value?.updatedBy),
  }
}

export function isAttendanceEventClosedForResponses(
  event?: Partial<AttendanceEvent> | null,
  now: Date = new Date()
) {
  const normalized = normalizeAttendanceEvent(event)

  if (normalized.isDeleted || normalized.isClosed) {
    return true
  }

  if (normalized.answerDeadlineAt === null) {
    return false
  }

  return normalized.answerDeadlineAt.getTime() < now.getTime()
}
