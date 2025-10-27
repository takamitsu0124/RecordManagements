import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@rm/db'
import { Router } from 'vue-router'
import { boot } from 'quasar/wrappers'
import { computed, ref } from 'vue'
import { defaultUser, User } from '@rm/types'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { dbUserModule } from '@rm/db/src/fireStore/User'

export const globalPrePath = ref<string>('')
export const globalLoginUserData = ref<User>(defaultUser())
/** ギルドに所属、roleがエンドユーザー */
export const hasGuildId = computed(() => {
  const isGuild = globalLoginUserData.value.guildId === '' ? false : true
  const isRole = globalLoginUserData.value.role === '管理者' ? true : false

  return isGuild === true && isRole === false
})
/** ギルドに所属しておらず、roleがエンドユーザー */
export const lacksGuildId = computed(() => {
  const isGuild = globalLoginUserData.value.guildId === '' ? false : true
  const isRole = globalLoginUserData.value.role === '管理者' ? true : false

  return isGuild === false && isRole === false
})
/** roleが管理者 */
export const hasAdmin = computed(() => {
  return globalLoginUserData.value.role === '管理者'
})

const checkRouter = (router: Router) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await useSpinner(async () => {
        const userData: User =
          (await dbUserModule.doc(user.uid).fetch({ force: true })) ??
          defaultUser()
        if (userData.id) {
          console.log('動いてる？')
          // 最終ログイン日を更新
          await dbUserModule
            .doc(user.uid)
            .merge({ lastLoginDateAt: new Date() })
        }
        globalLoginUserData.value = userData
      })
      // userがある場合
      router.push({ name: 'RMHome' })
    } else {
      // userがない場合
      // router.push({ name: 'RMPreLogin' }) 完成までコメントアウト
    }
  })
}

export default boot(async ({ router }) => {
  checkRouter(router)
  router.beforeEach((to, from, next) => {
    // 前のpathを記録
    globalPrePath.value = from.path
    next()
  })
})
