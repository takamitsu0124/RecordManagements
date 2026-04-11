import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth'
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

const publicRouteNames = new Set([
  'RMPreLogin',
  'RMMailLogin',
  'RMPhoneLogin',
  'RMLoginSmsCode',
  'RMUserRegister',
  'RMUserRegisterConfirm',
])

const isPublicRoute = (routeName: unknown) => {
  return typeof routeName === 'string' && publicRouteNames.has(routeName)
}

const getLandingRoute = (user: FirebaseAuthUser | null) => {
  return user ? { name: 'RMHome' } : { name: 'RMPreLogin' }
}

const shouldRedirectForAuthState = (
  path: string,
  routeName: unknown,
  user: FirebaseAuthUser | null
) => {
  if (path === '/') {
    return true
  }

  if (!routeName) {
    return false
  }

  if (user) {
    return isPublicRoute(routeName)
  }

  return !isPublicRoute(routeName)
}

const checkRouter = (router: Router) => {
  let currentAuthUser: FirebaseAuthUser | null = auth.currentUser
  let resolveInitialAuthState: () => void = () => {}
  const initialAuthStateResolved = new Promise<void>((resolve) => {
    resolveInitialAuthState = resolve
  })
  let hasResolvedInitialAuthState = false

  const syncRouteWithAuthState = async (user: FirebaseAuthUser | null) => {
    const { path, name } = router.currentRoute.value

    if (!shouldRedirectForAuthState(path, name, user)) {
      return
    }

    const landingRoute = getLandingRoute(user)

    if (name === landingRoute.name) {
      return
    }

    await router.replace(landingRoute)
  }

  onAuthStateChanged(auth, async (user) => {
    currentAuthUser = user

    if (user) {
      await useSpinner(async () => {
        const userData: User =
          (await dbUserModule.doc(user.uid).fetch({ force: true })) ??
          defaultUser()
        if (userData.id) {
          await dbUserModule
            .doc(user.uid)
            .merge({ lastLoginDateAt: new Date() })
        }
        globalLoginUserData.value = userData
      })
    } else {
      globalLoginUserData.value = defaultUser()
    }

    if (hasResolvedInitialAuthState === false) {
      hasResolvedInitialAuthState = true
      resolveInitialAuthState()
    }

    await syncRouteWithAuthState(user)
  })

  return {
    initialAuthStateResolved,
    getCurrentAuthUser: () => currentAuthUser,
  }
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

  const { initialAuthStateResolved, getCurrentAuthUser } = checkRouter(router)

  router.beforeEach(async (to, from, next) => {
    globalPrePath.value = from.path

    await initialAuthStateResolved

    const authUser = getCurrentAuthUser()

    if (to.path === '/') {
      next({ ...getLandingRoute(authUser), replace: true })
      return
    }

    if (!to.name) {
      next()
      return
    }

    if (!authUser && !isPublicRoute(to.name)) {
      next({ name: 'RMPreLogin', replace: true })
      return
    }

    if (authUser && isPublicRoute(to.name)) {
      next({ name: 'RMHome', replace: true })
      return
    }

    next()
  })
})
