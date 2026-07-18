import type { User as FirebaseAuthUser } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import type {
  AppRole,
  AppUser} from '@rm/types'
import {
  defaultAppUser,
  normalizeAttendanceFeatureVisibilityStatus,
  normalizeWeaponProficiencyLevels,
  normalizeWeaponProficiencySkillProgress
} from '@rm/types'
import { auth, dbUsersModule } from '@rm/db'
import type { Router } from 'vue-router'
import { boot } from 'quasar/wrappers'
import { computed, ref } from 'vue'
import PrimeVue from 'primevue/config'
import DialogService from 'primevue/dialogservice'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError } from 'src/composables/useAppNotifications'
import { setupAnalytics } from 'src/services/analytics'
import { useSkillStore } from 'src/store'
import { genFirebaseRandomId } from '@codelic/datagen'

export const globalPrePath = ref<string>('')
export const globalLoginUserData = ref<AppUser>(defaultAppUser())

export const hasGuildId = computed(() => {
  return globalLoginUserData.value.guildId !== ''
})

export const lacksGuildId = computed(() => {
  return !hasGuildId.value && globalLoginUserData.value.role !== 'admin'
})

export const hasAdmin = computed(() => {
  return globalLoginUserData.value.role === 'admin'
})

export const hasGuildAdmin = computed(() => {
  return globalLoginUserData.value.role === 'guild_admin'
})

export const canManageGuildMembers = computed(() => {
  return hasAdmin.value || hasGuildAdmin.value
})

export const canUseAttendance = computed(() => {
  return globalLoginUserData.value.attendanceFeatureVisibilityStatus !== 'hidden'
})

const guestOnlyRouteNames = new Set([
  'RMPreLogin',
  'RMMailLogin',
  'RMPhoneLogin',
  'RMLoginSmsCode'
])

const sharedPublicRouteNames = new Set(['RMAttendancePublic'])

const isGuestOnlyRoute = (routeName: unknown) => {
  return typeof routeName === 'string' && guestOnlyRouteNames.has(routeName)
}

const isPublicRoute = (routeName: unknown) => {
  return (
    typeof routeName === 'string' &&
    (guestOnlyRouteNames.has(routeName) || sharedPublicRouteNames.has(routeName))
  )
}

const getLandingRoute = (user: FirebaseAuthUser | null) => {
  return user ? { name: 'RMHome' } : { name: 'RMPreLogin' }
}

const attendancePrivateRouteNames = new Set([
  'RMAttendance',
  'RMAttendanceNew',
  'RMAttendanceManage'
])

const isAttendancePrivateRoute = (routeName: unknown) => {
  return (
    typeof routeName === 'string' && attendancePrivateRouteNames.has(routeName)
  )
}

const createFallbackAppUser = (authUser: FirebaseAuthUser | null): AppUser => {
  return {
    ...defaultAppUser(),
    id: authUser?.uid ?? '',
    uid: authUser?.uid ?? '',
    email: authUser?.email ?? '',
    displayName: authUser?.displayName ?? authUser?.email ?? ''
  }
}

const ensureAppUserDocument = async (
  authUser: FirebaseAuthUser
): Promise<AppUser> => {
  const fallbackAppUser = createFallbackAppUser(authUser)

  try {
    await dbUsersModule.doc(authUser.uid).insert(fallbackAppUser)
    return fallbackAppUser
  } catch (error) {
    const existingAppUser = await dbUsersModule
      .doc(authUser.uid)
      .fetch({ force: true })
    if (existingAppUser?.id) {
      return {
        ...defaultAppUser(),
        ...existingAppUser,
        id: existingAppUser.id || authUser.uid,
        uid: existingAppUser.uid || authUser.uid,
        email: existingAppUser.email || authUser.email || '',
        weaponProficiencyLevels: normalizeWeaponProficiencyLevels(
          existingAppUser.weaponProficiencyLevels
        ),
        weaponProficiencySkillProgress: normalizeWeaponProficiencySkillProgress(
          existingAppUser.weaponProficiencySkillProgress
        ),
        attendanceFeatureVisibilityStatus:
          normalizeAttendanceFeatureVisibilityStatus(
          	existingAppUser.attendanceFeatureVisibilityStatus
          ),
        displayName:
          existingAppUser.displayName ||
          authUser.displayName ||
          authUser.email ||
          ''
      }
    }

    throw error
  }
}

const loadAppUser = async (authUser: FirebaseAuthUser): Promise<AppUser> => {
  const appUser = await dbUsersModule.doc(authUser.uid).fetch({ force: true })

  if (appUser?.id) {
    return {
      ...defaultAppUser(),
      ...appUser,
      id: appUser.id || authUser.uid,
      uid: appUser.uid || authUser.uid,
      email: appUser.email || authUser.email || '',
      weaponProficiencyLevels: normalizeWeaponProficiencyLevels(
        appUser.weaponProficiencyLevels
      ),
      weaponProficiencySkillProgress: normalizeWeaponProficiencySkillProgress(
        appUser.weaponProficiencySkillProgress
      ),
      attendanceFeatureVisibilityStatus:
        normalizeAttendanceFeatureVisibilityStatus(
        	appUser.attendanceFeatureVisibilityStatus
        ),
      displayName:
        appUser.displayName || authUser.displayName || authUser.email || ''
    }
  }

  return ensureAppUserDocument(authUser)
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
    return isGuestOnlyRoute(routeName)
  }

  return !isPublicRoute(routeName)
}

const isDeniedGuildScope = (
  targetGuildId: unknown,
  currentUser: AppUser
): targetGuildId is string => {
  return (
    typeof targetGuildId === 'string' &&
    targetGuildId !== '' &&
    currentUser.role !== 'admin' &&
    targetGuildId !== currentUser.guildId
  )
}

const isDeniedUserScope = (
  targetUserId: unknown,
  currentUser: AppUser
): targetUserId is string => {
  return (
    typeof targetUserId === 'string' &&
    targetUserId !== '' &&
    currentUser.role !== 'admin' &&
    targetUserId !== currentUser.id
  )
}

const checkRouter = (router: Router) => {
  const skillStore = useSkillStore()
  let currentAuthUser: FirebaseAuthUser | null = auth.currentUser
  let resolveInitialAuthState: () => void = () => {}
  const initialAuthStateResolved = new Promise<void>((resolve) => {
    resolveInitialAuthState = resolve
  })
  let hasResolvedInitialAuthState = false

  const ensureRouteRoleAccess = async (routeName: unknown) => {
    const allowedRoles = router.currentRoute.value.meta?.roles as
      | AppRole[]
      | undefined

    if (!routeName || !allowedRoles?.length) {
      return
    }

    if (!allowedRoles.includes(globalLoginUserData.value.role)) {
      notifyError('この画面にアクセスする権限がありません。')
      await router.replace({ name: 'RMHome' })
    }
  }

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
    console.log('genFirebaseRandomId:', genFirebaseRandomId())

    if (user) {
      await useSpinner(async () => {
        skillStore.clearCurrentUserSkills()
        globalLoginUserData.value = await loadAppUser(user)
        try {
          await skillStore.fetchMasterData()
        } catch (error) {
          console.error('Failed to preload skill master data:', error)
        }
      })
    } else {
      skillStore.clearCurrentUserSkills()
      globalLoginUserData.value = defaultAppUser()
    }

    if (hasResolvedInitialAuthState === false) {
      hasResolvedInitialAuthState = true
      resolveInitialAuthState()
    }

    // router.currentRoute は初回ナビゲーションが確定するまで "/" のプレースホルダーの
    // ままなので、先に isReady() を待ってから読まないと、ログイン中に /a/:publicToken
    // のような深いリンクへ直接アクセスした際に "/" 宛の着地判定が誤発火してしまう。
    await router.isReady()

    await syncRouteWithAuthState(user)
    await ensureRouteRoleAccess(router.currentRoute.value.name)
  })

  return {
    initialAuthStateResolved,
    getCurrentAuthUser: () => currentAuthUser
  }
}

export default boot(async ({ app, router }) => {
  app.use(PrimeVue, {
    ripple: true,
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: false,
        cssLayer: false
      }
    }
  })
  app.use(DialogService)
  app.use(ToastService)

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

    if (authUser && isGuestOnlyRoute(to.name)) {
      next({ name: 'RMHome', replace: true })
      return
    }

    const allowedRoles = to.meta?.roles as AppRole[] | undefined

    if (
      authUser &&
      isAttendancePrivateRoute(to.name) &&
      !canUseAttendance.value
    ) {
      notifyError('このアカウントでは出欠確認を利用できません。')
      next({ name: 'RMHome', replace: true })
      return
    }

    if (
      authUser &&
      allowedRoles?.length &&
      !allowedRoles.includes(globalLoginUserData.value.role)
    ) {
      notifyError('この画面にアクセスする権限がありません。')
      next({ name: 'RMHome', replace: true })
      return
    }

    if (
      authUser &&
      isDeniedGuildScope(to.params.guildId, globalLoginUserData.value)
    ) {
      notifyError('他ギルドの画面にはアクセスできません。')
      next({ name: 'RMHome', replace: true })
      return
    }

    const isGuildAdminManagingOwnGuildMember =
      globalLoginUserData.value.role === 'guild_admin' &&
      typeof to.params.guildId === 'string' &&
      to.params.guildId === globalLoginUserData.value.guildId

    if (
      authUser &&
      isDeniedUserScope(to.params.userId, globalLoginUserData.value) &&
      !isGuildAdminManagingOwnGuildMember
    ) {
      notifyError('他ユーザーの画面にはアクセスできません。')
      next({ name: 'RMHome', replace: true })
      return
    }

    next()
  })

  void setupAnalytics(router)
})
