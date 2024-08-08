import { ref } from 'vue'
import { DateType } from './calendarDateType'

/**
 
選択された年月日のカレンダー情報を生成する関数**/
export const createCalendar = (yearValue: number, monthValue: number) => {
  // 1週目のカレンダー配列
  const weekOneDays = ref<DateType[]>([])

  // 最終週のカレンダー配列
  const lastWeekDays = ref<DateType[]>([])

  // 中間のカレンダー配列
  const midWeekDays = ref<DateType[]>([])

  // この月のカレンダー配列
  const thisMonthCalenderDays = ref<DateType[]>([])

  // 月初の曜日番号を取得する
  const isMonthStartDayOfWeekNumber = new Date(
    yearValue,
    monthValue,
    1
  ).getDay()

  // 1週目の配列を生成する
  for (let i = 0; i < 7; i++) {
    if (i >= isMonthStartDayOfWeekNumber) {
      weekOneDays.value.push({
        year: String(yearValue),
        month: String(monthValue),
        day: String(i - (isMonthStartDayOfWeekNumber - 1)),
      })
    } else {
      weekOneDays.value.push
      weekOneDays.value.push({
        year: ' ',
        month: ' ',
        day: ' ',
      })
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
      lastWeekDays.value.unshift({
        year: String(yearValue),
        month: String(monthValue),
        day: String(isMonthEndDate - i),
      })
    } else {
      lastWeekDays.value.push({
        year: ' ',
        month: ' ',
        day: ' ',
      })
    }
  }

  // 1週目と最終週以外の日付を格納する
  for (
    let i = Number(weekOneDays.value[6].day) + 1;
    i < Number(lastWeekDays.value[0].day);
    i++
  ) {
    midWeekDays.value.push({
      year: String(yearValue),
      month: String(monthValue),
      day: String(i),
    })
  }

  // この月のカレンダー配列
  thisMonthCalenderDays.value = [
    ...weekOneDays.value,
    ...midWeekDays.value,
    ...lastWeekDays.value,
  ]

  return thisMonthCalenderDays.value
}
