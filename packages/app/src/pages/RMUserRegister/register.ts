import {
  checkDateFormat,
  checkMailAddress,
  checkPassword,
  kanaOnly,
  notEmpty,
} from '@rm/utils'
import { ref } from 'vue'

/**
 * バリデーションエラーの情報を表す型
 */
interface ValidationError {
  field: string
  message: string
}

export interface RegisterInfo {
  email: string
  password: string
  name: string
  nameKana: string
  birthDateAt: string
}

const registerInfo = ref<RegisterInfo>({
  email: '',
  password: '',
  name: '',
  nameKana: '',
  birthDateAt: '',
})

const defaultRegisterInfo = (): RegisterInfo => ({
  email: '',
  password: '',
  name: '',
  nameKana: '',
  birthDateAt: '',
})

/**
 * バリデーションを実行し、最初に発生したエラーメッセージとエラーが発生したフィールドを返します。
 * @param registerInfo - 登録情報オブジェクト
 * @returns エラーが発生した場合は、フィールド名とエラーメッセージを含むオブジェクトを返し、エラーがない場合はnullを返します。
 */
export function validateRegisterInfo(registerInfo: {
  email: string
  password: string
  name: string
  nameKana: string
  birthDateAt: string
}): ValidationError | null {
  const validators = [
    { field: 'email', validate: checkMailAddress },
    { field: 'password', validate: checkPassword },
    { field: 'name', validate: notEmpty },
    { field: 'nameKana', validate: kanaOnly },
    { field: 'birthDateAt', validate: checkDateFormat },
  ]

  for (const { field, validate } of validators) {
    const error = validate(registerInfo[field as keyof typeof registerInfo])
    if (error) return { field, message: error } // 最初に発生したエラーを返す
  }

  return null // エラーがない場合はnullを返す
}

export const globalRegisterForm = () => ({
  registerInfo,
  defaultRegisterInfo,
  validateRegisterInfo,
})
