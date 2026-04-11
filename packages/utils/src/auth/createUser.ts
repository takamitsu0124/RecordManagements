import { firebaseConfig } from '@rm/db'
import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getAuth } from 'firebase/auth'

/**
 * 入力した情報をAuthに登録する(アカウント作成)
 * @param {string} email メールアドレス
 * @param {string} password パスワード
 */
export const createUser = async (
  email: string,
  password: string
): Promise<string> => {
  const secondaryAppName = 'rm-admin-user-creation'
  const secondaryApp = getApps().some((app) => app.name === secondaryAppName)
    ? getApp(secondaryAppName)
    : initializeApp(firebaseConfig, secondaryAppName)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    )

    return userCredential.user.uid
  } catch (error) {
    throw error
  } finally {
    if (secondaryAuth.currentUser) {
      await secondaryAuth.signOut()
    }
    await deleteApp(secondaryApp)
  }
}
