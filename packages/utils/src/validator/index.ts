// validatorの関数は、バリデーションに成功した場合、空文字列を返すように設計している
export function checkMailAddress(mailAddress: string): string {
  if (mailAddress === '') return 'メールアドレスを入力してください'
  const mailAddressRegExp =
    /^[A-Za-z0-9]+[+A-Za-z0-9_.-]*[A-Za-z0-9]@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

  return mailAddressRegExp.test(mailAddress)
    ? ''
    : 'メールアドレスの形式が正しくありません'
}
export function notEmpty(str: string): string {
  return str !== '' ? '' : '必須項目です'
}

export function kanaOnly(str: string): string {
  return /^[ァ-ヶー　]+$/.test(str) ? '' : '全角カタカナで入力してください'
}
export function checkPassword(str: string): string {
  // 6桁以上であればOK
  return /^[a-zA-Z0-9]{6,20}$/.test(str)
    ? ''
    : '6文字以上20文字以下の半角英数字で入力してください'
}
export function checkPhoneNumber(str: string): string {
  if (str === '') return ''
  if (str.includes('-')) return '電話番号にハイフンは不要です。'
  return /^0\d{9,10}$/.test(str) ? '' : '電話番号の形式が正しくありません'
}

export function checkSmsMobilePhoneNumber(str: string): string {
  if (str.includes('-')) return '電話番号にハイフンは不要です。'
  if (!/^\d{11}$/.test(str)) return 'SMS対応の電話番号を入力してください'

  // SMS対応の携帯番号かどうかをチェック
  const smsCompatibleRegex = /^(070|080|090)\d{8}$/
  if (!smsCompatibleRegex.test(str)) {
    return 'SMS対応の電話番号を入力してください'
  }
  return ''
}
/**
 * YYYYMMDD形式の文字列をDate型に変換し、有効な日付かを確認します。
 * @param dateStr - チェックする日付文字列 (YYYYMMDD形式)
 * @returns 日付が有効であればtrue、無効であればfalse
 */
function isValidDate(dateStr: string): boolean {
  const date = new Date(
    `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(
      6,
      8
    )}`
  )
  return (
    !isNaN(date.getTime()) &&
    dateStr === date.toISOString().substring(0, 10).replace(/-/g, '')
  )
}

/**
 * YYYYMMDD形式の文字列が有効な日付かどうかをチェックします。
 * @param str - チェックする文字列 (YYYYMMDD形式)
 * @returns エラーメッセージ。形式が正しくない場合はエラーメッセージを返し、正しければ空文字列を返します。
 */
export function checkDateFormat(str: string): string {
  const dateFormatRegExp = /^\d{8}$/
  if (str === '') return ''
  if (!dateFormatRegExp.test(str)) return '日付はYYYYMMDD形式で入力してください'
  return isValidDate(str) ? '' : '無効な日付です'
}
