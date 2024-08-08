class CreatePagenaviMonthYear {
  /**
   * ページナビの年月を生成する
   */
  createPagenaviEnMonthYear = (yearValue: number, monthValue: number) => {
    if (monthValue + 1 === 1) {
      return 'January' + ' ' + yearValue
    } else if (monthValue + 1 === 2) {
      return 'February' + ' ' + yearValue
    } else if (monthValue + 1 === 3) {
      return 'March' + ' ' + yearValue
    } else if (monthValue + 1 === 4) {
      return 'April' + ' ' + yearValue
    } else if (monthValue + 1 === 5) {
      return 'May' + ' ' + yearValue
    } else if (monthValue + 1 === 6) {
      return 'June' + ' ' + yearValue
    } else if (monthValue + 1 === 7) {
      return 'July' + ' ' + yearValue
    } else if (monthValue + 1 === 8) {
      return 'August' + ' ' + yearValue
    } else if (monthValue + 1 === 9) {
      return 'September' + ' ' + yearValue
    } else if (monthValue + 1 === 10) {
      return 'October' + ' ' + yearValue
    } else if (monthValue + 1 === 11) {
      return 'November' + ' ' + yearValue
    } else if (monthValue + 1 === 12) {
      return 'December' + ' ' + yearValue
    }

    return ''
  }

  createPagenaviJaMonthYear = (yearValue: number, monthValue: number) => {
    if (monthValue + 1 === 1) {
      return `${yearValue}年 1月`
    } else if (monthValue + 1 === 2) {
      return `${yearValue}年 2月`
    } else if (monthValue + 1 === 3) {
      return `${yearValue}年 3月`
    } else if (monthValue + 1 === 4) {
      return `${yearValue}年 4月`
    } else if (monthValue + 1 === 5) {
      return `${yearValue}年 5月`
    } else if (monthValue + 1 === 6) {
      return `${yearValue}年 6月`
    } else if (monthValue + 1 === 7) {
      return `${yearValue}年 7月`
    } else if (monthValue + 1 === 8) {
      return `${yearValue}年 8月`
    } else if (monthValue + 1 === 9) {
      return `${yearValue}年 9月`
    } else if (monthValue + 1 === 10) {
      return `${yearValue}年 10月`
    } else if (monthValue + 1 === 11) {
      return `${yearValue}年 11月`
    } else if (monthValue + 1 === 12) {
      return `${yearValue}年 12月`
    }
    return ''
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
