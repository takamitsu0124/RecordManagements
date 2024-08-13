import type { Timestamp } from 'firebase/firestore'
import { copy } from 'copy-anything'
/**
 * YYYYMMDDの形式の文字列をYYYY/MM/DDの形式で返す
 * @param date YYYYMMDD
 */
export const stringDateFormat = (str: string) => {
  const year = str.substring(0, 4)
  const month = str.substring(4, 6)
  const day = str.substring(6, 8)
  return str !== '' ? `${year}/${month}/${day}` : ''
}

/**
 * 'YYYYMMDD' 形式の文字列を JavaScript の Date オブジェクトに変換します。
 *
 * @param {string} dateStr - 'YYYYMMDD' 形式の日付文字列。
 * @returns {Date | null} 入力が有効な場合は対応する Date オブジェクト、無効な場合は null を返します。
 */
export function parseDateString(dateStr: string): Date | null {
  // 入力が正しい形式であるかをチェック
  const datePattern = /^\d{8}$/
  if (!datePattern.test(dateStr)) {
    console.error('無効な日付形式です。期待される形式は YYYYMMDD です。')
    return null
  }

  // 入力文字列から年、月、日を抽出
  const year = parseInt(dateStr.substring(0, 4), 10)
  const month = parseInt(dateStr.substring(4, 6), 10) - 1 // 月は 0 ベース
  const day = parseInt(dateStr.substring(6, 8), 10)

  // 新しい Date オブジェクトを作成
  const date = new Date(year, month, day)

  // 作成した日付が有効であるかを確認
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    console.error('無効な日付値です。')
    return null
  }

  return date
}

/**
 * 入力されたパスワードと同じ長さのアスタリスク（*）の文字列を返します。
 * パスワードや他の機密情報をマスクするのに役立ちます。
 *
 * @param {string} password - マスクするパスワードや機密文字列。
 * @returns {string} 入力と同じ長さのアスタリスク（*）の文字列。
 *
 * @example
 * const masked = maskPassword('mySecretPassword');
 * console.log(masked);  // '***************' と表示されます
 */
export function maskPassword(password: string) {
  return '*'.repeat(password.length)
}

/**
 * 文字列内から数字のみを抽出する関数。
 * @param {string} stringWithNumbers - 数字を含む生の文字列（例：'+81-080-1234-5678'）
 * @returns {string} 数字のみを抽出した文字列（例：'8108012345678'）
 */
export const onlyNumbers = (stringWithNumbers: string): string => {
  // 正規表現を使用して非数字（\D）を空文字に置換し、数字のみを残す
  return stringWithNumbers.replace(/\D/g, '')
}

/**
 * 電話番号を整形する関数。
 * @param {string} phoneNumberRaw - 電話番号形式（例：'080-1234-5678'）
 * @param {string} [countryCode='+81'] - 国コード（デフォルトは日本の国コード）
 * @returns {string} 整形された電話番号（例：'+818012345678'）
 * @throws {Error} サポートされていない国コードが指定された場合にエラーを投げる
 */
export const cleanPhoneNumber = (
  phoneNumberRaw: string = '',
  countryCode: string = '+81'
): string => {
  // サポートされている国コードのリスト
  const validCountryCodes: string[] = ['+81']

  // サポートされている国コード以外が指定された場合はエラーを投げる
  if (!validCountryCodes.includes(countryCode)) {
    throw new Error('unsupported country code')
  }

  // ユーザーが国コードを入力していた場合、そのままの数字のみを返す
  const countryCodeWasTypedByUser: boolean = phoneNumberRaw.startsWith('+')
  if (countryCodeWasTypedByUser) {
    return '+' + onlyNumbers(phoneNumberRaw)
  }

  // ユーザーが00で国コードを入力していた場合、00を取り除いた数字のみを返す
  const countryCodeWasTypedByUserAs00: boolean = phoneNumberRaw.startsWith('00')
  if (countryCodeWasTypedByUserAs00) {
    return '+' + onlyNumbers(phoneNumberRaw.slice(2))
  }

  // 上記の条件に該当しない場合、国コードを付加して数字のみを返す
  return phoneNumberRaw.startsWith('0')
    ? countryCode + onlyNumbers(phoneNumberRaw.slice(1))
    : countryCode + onlyNumbers(phoneNumberRaw)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTimestamp = (payload: any): payload is Timestamp => {
  return payload.toDate !== undefined
}

/**
 * 時間を文字に変換
 * @param payload Date | Timestamp | string | null
 * @param format YYYY/MM/DD hh:mm:ss
 */
export const dateFormat = (
  payload: Date | Timestamp | string | number | null | undefined,
  format: string = 'YYYY/MM/DD'
) => {
  let date = copy(payload)
  if (!date) return ''
  if (typeof date === 'string') {
    if (!/^(\d{4}).([0-1]\d).([0-3]\d).*$/.test(date)) return 'error'
    const strYear = Number(date.slice(0, 4))
    const strMonth = Number(date.slice(5, 7)) - 1
    const strDate = Number(date.slice(8, 10))
    date = new Date(strYear, strMonth, strDate)
  }
  if (typeof date === 'number') {
    date = new Date(date)
  }
  if (isTimestamp(date)) {
    date = date.toDate()
  }

  format = format.replace(/YYYY/g, date.getFullYear().toString())
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
  format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2))
  format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2))
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
  format = format.replace(
    /aaa/g,
    ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  )
  // if (format.includes('-')) {
  //   console.log('「-」includes warning')
  // }

  return format
}
