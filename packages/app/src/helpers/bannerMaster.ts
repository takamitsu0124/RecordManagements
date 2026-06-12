import { BannerMaster, defaultBannerMaster } from '@rm/types'

const toValidDate = (value: Date | string | number | null | undefined) => {
  if (!value) return null

  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const createBannerRandomId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `banner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export const createBannerUploadFileName = (file: File) => {
  const extension = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : ''
  return `${createBannerRandomId()}${extension}`
}

export const normalizeBannerMasterRecord = (
  payload: Partial<BannerMaster> | null | undefined
): BannerMaster => {
  const base = defaultBannerMaster()

  return {
    ...base,
    ...(payload || {}),
    id: payload?.id || '',
    isActive: typeof payload?.isActive === 'boolean' ? payload.isActive : true,
    startAt: toValidDate(payload?.startAt),
    endAt: toValidDate(payload?.endAt),
    imageUrl: typeof payload?.imageUrl === 'string' ? payload.imageUrl : '',
  }
}

export const normalizeStartOfDay = (value: Date | null | undefined) => {
  const date = toValidDate(value)
  if (!date) return null

  date.setHours(0, 0, 0, 0)
  return date
}

export const normalizeEndOfDay = (value: Date | null | undefined) => {
  const date = toValidDate(value)
  if (!date) return null

  date.setHours(23, 59, 59, 999)
  return date
}

export const isBannerVisibleOnDate = (
  banner: BannerMaster,
  targetDate: Date
) => {
  if (!banner.isActive) return false
  if (!banner.imageUrl) return false

  const target = new Date(targetDate)
  target.setHours(12, 0, 0, 0)

  const startsOk = !banner.startAt || banner.startAt <= target
  const endsOk = !banner.endAt || banner.endAt >= target

  return startsOk && endsOk
}

export const formatBannerDate = (value: Date | null | undefined) => {
  const date = toValidDate(value)
  if (!date) return '未設定'

  return new Intl.DateTimeFormat('ja-JP').format(date)
}

export const formatBannerDateRange = (banner: BannerMaster) => {
  return `${formatBannerDate(banner.startAt)} 〜 ${formatBannerDate(
    banner.endAt
  )}`
}
