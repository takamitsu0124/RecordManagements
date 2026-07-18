class CreateDayOfTheWeek {
  private readonly englishDays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ]

  private readonly japaneseDays = ['日', '月', '火', '水', '木', '金', '土']

  /**
   * 英語の曜日を生成する
   */
  public createEnglishDayOfTheWeek = (weekNumber: number) => {
    return this.englishDays[weekNumber] ?? ''
  }
  /**
   * 日本語の曜日を生成する
   */
  public createJapaneseDayOfTheWeek = (weekNumber: number) => {
    return this.japaneseDays[weekNumber] ?? ''
  }
  /**
   * どちらの関数を使うかを判定して発火させる関数
   * @param lang 言語
   * @param weekNumber 曜日の番号
   * @param internal 内部で使うかどうか
   */
  public createDayOfTheWeekChoose = (
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
