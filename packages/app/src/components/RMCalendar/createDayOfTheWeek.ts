class CreateDayOfTheWeek {
  /**
   * 英語の曜日を生成する
   */
  createEnglishDayOfTheWeek = (weekNumber: number) => {
    if (weekNumber === 0) {
      return 'Sun'
    } else if (weekNumber === 1) {
      return 'Mon'
    } else if (weekNumber === 2) {
      return 'Tue'
    } else if (weekNumber === 3) {
      return 'Wed'
    } else if (weekNumber === 4) {
      return 'Thu'
    } else if (weekNumber === 5) {
      return 'Fri'
    } else if (weekNumber === 6) {
      return 'Sat'
    }
    return ''
  }
  /**
   * 日本語の曜日を生成する
   */
  createJapaneseDayOfTheWeek = (weekNumber: number) => {
    if (weekNumber === 0) {
      return '日'
    } else if (weekNumber === 1) {
      return '月'
    } else if (weekNumber === 2) {
      return '火'
    } else if (weekNumber === 3) {
      return '水'
    } else if (weekNumber === 4) {
      return '木'
    } else if (weekNumber === 5) {
      return '金'
    } else if (weekNumber === 6) {
      return '土'
    }
    return ''
  }
  /**
   * どちらの関数を使うかを判定して発火させる関数
   * @param lang 言語
   * @param weekNumber 曜日の番号
   * @param internal 内部で使うかどうか
   */
  createDayOfTheWeekChoose = (
    lang: string,
    weekNumber: number,
    internal = false
  ) => {
    if (lang === 'ja') {
      return this.createJapaneseDayOfTheWeek(weekNumber)
    } else if (!internal && lang === 'en') {
      return this.createEnglishDayOfTheWeek(weekNumber)
    } else if (internal && lang === 'en') {
      return this.createEnglishDayOfTheWeek(weekNumber).charAt(0)
    } else {
      return ''
    }
  }
}

const createDayOfTheWeek = new CreateDayOfTheWeek()
export { createDayOfTheWeek }
