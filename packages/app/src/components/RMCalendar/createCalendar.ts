import type { DateType } from './calendarDateType'

/**
 
選択された年月日のカレンダー情報を生成する関数**/
export const createCalendar = (yearValue: number, monthValue: number) => {
  const weekOneDays: DateType[] = []
  const lastWeekDays: DateType[] = []
  const midWeekDays: DateType[] = []
  const createBlankDate = (): DateType => ({
    year: ' ',
    month: ' ',
    day: ' '
  })

  // 月初の曜日番号を取得する
  const isMonthStartDayOfWeekNumber = new Date(
    yearValue,
    monthValue,
    1
  ).getDay()

  // 1週目の配列を生成する
  for (let i = 0; i < 7; i++) {
    if (i >= isMonthStartDayOfWeekNumber) {
      weekOneDays.push({
        year: String(yearValue),
        month: String(monthValue),
        day: String(i - (isMonthStartDayOfWeekNumber - 1))
      })
    } else {
      weekOneDays.push(createBlankDate())
    }
  }

  // 月末の曜日番号を取得する
  const isMonthEndDayOfWeekNumber = new Date(
    yearValue,
    monthValue + 1,
    0
  ).getDay()

  // 月末の日を取得する
  const isMonthEndDate = new Date(yearValue, monthValue + 1, 0).getDate()

  // 最終週の配列を生成する
  for (let i = 0; i < 7; i++) {
    if (i <= isMonthEndDayOfWeekNumber) {
      lastWeekDays.unshift({
        year: String(yearValue),
        month: String(monthValue),
        day: String(isMonthEndDate - i)
      })
    } else {
      lastWeekDays.push(createBlankDate())
    }
  }

  // 1週目と最終週以外の日付を格納する
  for (
    let i = Number(weekOneDays[6].day) + 1;
    i < Number(lastWeekDays[0].day);
    i++
  ) {
    midWeekDays.push({
      year: String(yearValue),
      month: String(monthValue),
      day: String(i)
    })
  }

  return [
    ...weekOneDays,
    ...midWeekDays,
    ...lastWeekDays
  ]
}
