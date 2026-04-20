import { defaultAppUser } from '@rm/types'
import { dbUsersModule } from '@rm/db'
import { RegisterInfo } from 'src/pages/RMUserRegister/register'
import { useToast } from 'src/components/RMToast/RMToast'

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await dbUsersModule.doc(uid).insert({
      ...defaultAppUser(),
      id: uid,
      uid,
      email: info.email,
      displayName: info.name,
      guildId: info.guildId,
      role: info.role
    })
  } catch (e) {
    useToast({
      toastTitle: 'ユーザー登録に失敗しました',
      toastColor: 'red',
      toastMovingTime: 3,
      isCheckCircle: false
    })
    console.error(
      'Failed to create user document:',
      e
    )
    throw e
  }
}
