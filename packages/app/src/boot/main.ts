import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@rm/db'
import { Router } from 'vue-router'
import { boot } from 'quasar/wrappers'
import { computed, ref } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { defaultUser, User } from '@rm/types'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { dbUserModule } from '@rm/db/src/fireStore/User'

export const globalPrePath = ref<string>('')
export const globalLoginUserData = ref<User>(defaultUser())

export const hasGuildId = computed(() => {
  const isGuild = globalLoginUserData.value.guildId === '' ? false : true
  const isRole = globalLoginUserData.value.role === '管理者' ? true : false

  return isGuild === true && isRole === false
})

export const lacksGuildId = computed(() => {
  const isGuild = globalLoginUserData.value.guildId === '' ? false : true
  const isRole = globalLoginUserData.value.role === '管理者' ? true : false

  return isGuild === false && isRole === false
})

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
          await dbUserModule.doc(user.uid).merge({ lastLoginDateAt: new Date() })
        }
        globalLoginUserData.value = userData
      })
      router.push({ name: 'RMHome' })
    }
  })
}

export default boot(async ({ app, router }) => {
  app.use(PrimeVue, {
    ripple: true,
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: false,
        cssLayer: false,
      },
    },
  })

  checkRouter(router)
  router.beforeEach((to, from, next) => {
    globalPrePath.value = from.path
    next()
  })
})
