import { signInWithEmailAndPassword, Auth } from 'firebase/auth'
import { Router } from 'vue-router'

export const mailLogin = async (
  auth: Auth,
  mail: string,
  password: string,
  router: Router,
  redirectUrl: string,
  hasTwoFactor?: boolean
): Promise<void> => {
  try {
    // 引数がメールアドレスの場合
    // メールアドレスとパスワードでログインする
    await signInWithEmailAndPassword(auth, mail, password)

    if (hasTwoFactor) {
      router.push('/2factorAuth')
      return
    }

    // ログイン成功後の遷移は呼び出し元(コンポーネント)が行うため、
    // ここでは重複してnavigationを発生させない
    return
  } catch (e) {
    console.log(e)
    throw e
  }
}
