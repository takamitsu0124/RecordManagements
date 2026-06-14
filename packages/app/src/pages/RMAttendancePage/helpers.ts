import type {
  AttendanceAnswers,
  AttendanceCandidate,
  AttendanceCandidateSummary,
  AttendanceEvent,
  AttendanceStatus,
} from '@rm/types'

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatAttendanceDateTime = (value: Date | null) => {
  if (!value) return '未設定'
  return dateTimeFormatter.format(value)
}

export const formatAttendanceCandidateLabel = (candidate: AttendanceCandidate) => {
  if (candidate.label.trim()) {
    return candidate.label
  }

  return formatAttendanceDateTime(candidate.startAt)
}

export const formatAttendanceCandidateRange = (candidate: AttendanceCandidate) => {
  const start = formatAttendanceDateTime(candidate.startAt)
  if (!candidate.endAt) {
    return start
  }

  return `${start} - ${formatAttendanceDateTime(candidate.endAt)}`
}

export const formatAttendanceStatusSymbol = (
  status: AttendanceStatus | null | undefined
) => {
  if (status === 'available') return '○'
  if (status === 'maybe') return '△'
  if (status === 'unavailable') return '×'
  return '—'
}

export const buildAttendanceSummaryRows = (
  event: AttendanceEvent
): AttendanceCandidateSummary[] =>
  event.candidates.map((candidate) => ({
    candidateId: candidate.id,
    label: formatAttendanceCandidateLabel(candidate),
    availableCount: event.candidateSummaries[candidate.id]?.availableCount ?? 0,
    maybeCount: event.candidateSummaries[candidate.id]?.maybeCount ?? 0,
    unavailableCount: event.candidateSummaries[candidate.id]?.unavailableCount ?? 0,
  }))

export const formatAttendanceAnswersForDisplay = (
  candidates: AttendanceCandidate[],
  answers: AttendanceAnswers
) =>
  candidates
    .map((candidate) => {
      const answer = answers[candidate.id]
      return `${formatAttendanceCandidateLabel(candidate)}: ${formatAttendanceStatusSymbol(
        answer?.status
      )}${answer?.note ? ` (${answer.note})` : ''}`
    })
    .join(' / ')

export const copyTextWithFallback = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
