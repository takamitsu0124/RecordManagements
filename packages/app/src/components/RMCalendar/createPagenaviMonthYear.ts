class CreatePagenaviMonthYear {
  private readonly englishMonths = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  /**
   * ページナビの年月を生成する
   */
  createPagenaviEnMonthYear = (yearValue: number, monthValue: number) => {
    return this.englishMonths[monthValue]
      ? `${this.englishMonths[monthValue]} ${yearValue}`
      : ''
  }

  createPagenaviJaMonthYear = (yearValue: number, monthValue: number) => {
    return monthValue >= 0 && monthValue <= 11 ? `${yearValue}年 ${monthValue + 1}月` : ''
  }
  createPagenaviMonthYearChoose = (
    language: string,
    yearValue: number,
    monthValue: number
  ) => {
    if (language === 'ja') {
      return this.createPagenaviJaMonthYear(yearValue, monthValue)
    } else if (language === 'en') {
      return this.createPagenaviEnMonthYear(yearValue, monthValue)
    } else {
      return ''
    }
  }
}

const createPagenaviMonthYear = new CreatePagenaviMonthYear()
export { createPagenaviMonthYear }
