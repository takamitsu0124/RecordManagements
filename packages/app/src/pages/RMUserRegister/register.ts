import type { AppRole} from '@rm/types'
import { appRoles } from '@rm/types'
import {
  checkMailAddress,
  checkPassword,
  notEmpty
} from '@rm/utils'
import { ref } from 'vue'

/**
 * バリデーションエラーの情報を表す型
 */
type ValidationError = {
  field: string
  message: string
}

export type RegisterInfo = {
  email: string
  password: string
  name: string
  guildId: string
  role: AppRole
}

export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  guild_admin: 'Guild Admin',
  member: 'General Member'
}

const registerInfo = ref<RegisterInfo>({
  email: '',
  password: '',
  name: '',
  guildId: '',
  role: 'member'
})

const defaultRegisterInfo = (): RegisterInfo => ({
  email: '',
  password: '',
  name: '',
  guildId: '',
  role: 'member'
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
  guildId: string
  role: AppRole
}): ValidationError | null {
  const validators = [
    { field: 'email', validate: checkMailAddress },
    { field: 'password', validate: checkPassword },
    { field: 'name', validate: notEmpty }
  ]

  for (const { field, validate } of validators) {
    const error = validate(registerInfo[field as keyof typeof registerInfo])
    if (error) return { field, message: error } // 最初に発生したエラーを返す
  }

  if (!appRoles.includes(registerInfo.role)) {
    return { field: 'role', message: '権限を選択してください。' }
  }

  return null // エラーがない場合はnullを返す
}

export function getRegisterErrorMessage(error: unknown) {
  const errorCode =
    typeof error === 'object' && error && 'code' in error
      ? String(error.code)
      : String(error)

  if (errorCode === 'auth/email-already-in-use') {
    return 'このメールアドレスは既に登録されています'
  }
  if (errorCode === 'auth/invalid-email') {
    return 'メールアドレスの形式が無効です'
  }
  if (errorCode === 'auth/operation-not-allowed') {
    return 'メール/パスワードログインが有効になっていません。'
  }
  if (errorCode === 'auth/weak-password') {
    return 'パスワードが弱すぎます'
  }

  return ''
}

export const globalRegisterForm = () => ({
  registerInfo,
  defaultRegisterInfo,
  validateRegisterInfo
})
