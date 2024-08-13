import { auth } from '@rm/db'
import { createUserWithEmailAndPassword } from 'firebase/auth'

/**
 * 入力した情報をAuthに登録する(アカウント作成)
 * @param {string} email メールアドレス
 * @param {string} password パスワード
 */
export const createUser = async (
  email: string,
  password: string
): Promise<string> => {
  return new Promise((resolve, rejects) => {
    // 入力情報(メールアドレス、パスワードでアカウント作成する)
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // 登録成功
        const user = userCredential.user
        resolve(user.uid)
      })
      .catch((error) => {
        rejects(error.code)
        throw error.code
      })
  })
}
