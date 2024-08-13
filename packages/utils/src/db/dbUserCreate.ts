import { defaultUser } from '@rm/types'
import { dbUserModule } from './../../../db/src/fireStore/User'
import { RegisterInfo } from 'src/pages/RMUserRegister/register'
import { parseDateString } from '../format'

export const dbUserCreate = async (uid: string, info: RegisterInfo) => {
  try {
    await dbUserModule.doc(uid).insert({
      ...defaultUser(),
      charaName: info.name,
      charaNameKana: info.nameKana,
      birthDateAt: parseDateString(info.birthDateAt) || null
    })
  } catch (e) {
    throw e
  }
}
