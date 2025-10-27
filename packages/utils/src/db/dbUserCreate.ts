import { defaultUser } from '@rm/types'
import { dbUserModule } from './../../../db/src/fireStore/User'
import { RegisterInfo } from 'src/pages/RMUserRegister/register'
import { parseDateString } from '../format'
import { useToast } from 'src/components/RMToast/RMToast'

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await dbUserModule.doc(uid).insert({
      ...defaultUser(),
      charaName: info.name,
      charaNameKana: info.nameKana,
      birthDateAt: parseDateString(info.birthDateAt) || null,
      id: uid
    })
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
