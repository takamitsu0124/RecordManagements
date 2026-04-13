export type GuildScheduleMonthDay = {
	key: string
	date: Date
	dayNumber: number
	weekdayLabel: string
	isToday: boolean
	isWeekend: boolean
}

const monthFormatter = new Intl.DateTimeFormat('ja-JP', {
	year: 'numeric',
	month: 'long',
})

const fullDateFormatter = new Intl.DateTimeFormat('ja-JP', {
	month: 'numeric',
	day: 'numeric',
	weekday: 'short',
})

const weekdayFormatter = new Intl.DateTimeFormat('ja-JP', {
	weekday: 'short',
})

export const createMonthDate = (date = new Date()) => {
	return new Date(date.getFullYear(), date.getMonth(), 1)
}

export const addMonths = (date: Date, amount: number) => {
	return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export const formatDateKey = (date: Date) => {
	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}

export const parseDateKey = (value: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

	if (!match) {
		return null
	}

	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const date = new Date(year, month - 1, day)

	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null
	}

	return date
}

export const formatMonthLabel = (date: Date) => monthFormatter.format(date)

export const formatFullDateLabel = (value: string | Date) => {
	const date = typeof value === 'string' ? parseDateKey(value) : value
	return date ? fullDateFormatter.format(date) : ''
}

export const getMonthDays = (monthDate: Date): GuildScheduleMonthDay[] => {
	const year = monthDate.getFullYear()
	const month = monthDate.getMonth()
	const lastDate = new Date(year, month + 1, 0).getDate()
	const todayKey = formatDateKey(new Date())

	return Array.from({ length: lastDate }, (_, index) => {
		const date = new Date(year, month, index + 1)

		return {
			key: formatDateKey(date),
			date,
			dayNumber: index + 1,
			weekdayLabel: weekdayFormatter.format(date),
			isToday: formatDateKey(date) === todayKey,
			isWeekend: date.getDay() === 0 || date.getDay() === 6,
		}
	})
}
