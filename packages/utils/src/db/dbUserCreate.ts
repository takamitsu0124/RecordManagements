import { defaultAppUser, defaultUser } from '@rm/types'
import { dbUserModule, dbUsersModule } from '@rm/db'
import { RegisterInfo } from 'src/pages/RMUserRegister/register'
import { useToast } from 'src/components/RMToast/RMToast'

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await Promise.all([
      dbUsersModule.doc(uid).insert({
        ...defaultAppUser(),
        id: uid,
        uid,
        email: info.email,
        displayName: info.name,
        guildId: info.guildId,
        role: info.role,
      }),
      dbUserModule.doc(uid).insert({
        ...defaultUser(),
        id: uid,
        charaName: info.name,
        guildId: info.guildId,
        role: info.role === 'admin' ? '管理者' : 'エンドユーザー',
        contact: {
          email: info.email,
          phone: '',
        },
      }),
    ])
  } catch (e) {
    useToast({
      toastTitle: 'ユーザー登録に失敗しました',
      toastColor: 'red',
      toastMovingTime: 3,
      isCheckCircle: false
    })
    throw e
  }
}
