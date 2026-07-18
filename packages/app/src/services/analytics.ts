import { firebaseApp } from '@rm/db'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type * as FirebaseAnalyticsModule from 'firebase/analytics'

type AnalyticsModule = typeof FirebaseAnalyticsModule

type AnalyticsContext = {
  analytics: ReturnType<AnalyticsModule['getAnalytics']>
  logEvent: AnalyticsModule['logEvent']
}

let analyticsContextPromise: Promise<AnalyticsContext | null> | null = null

const getAnalyticsContext = async (): Promise<AnalyticsContext | null> => {
  if (typeof window === 'undefined') {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Promiseのキャッシュ未作成(null)判定であり、解決値のboolean判定ではない
  if (!analyticsContextPromise) {
    analyticsContextPromise = (async () => {
      const analyticsModule = await import('firebase/analytics')

      if (!(await analyticsModule.isSupported())) {
        return null
      }

      return {
        analytics: analyticsModule.getAnalytics(firebaseApp),
        logEvent: analyticsModule.logEvent
      }
    })()
  }

  return analyticsContextPromise
}

const getPageViewParams = (route: RouteLocationNormalizedLoaded) => ({
  page_title: document.title || String(route.name ?? route.path),
  page_location: window.location.href,
  page_path: route.fullPath
})

export const setupAnalytics = async (router: Router) => {
  const analyticsContext = await getAnalyticsContext()

  if (!analyticsContext) {
    return
  }

  let lastTrackedFullPath = ''

  const trackPageView = (route: RouteLocationNormalizedLoaded) => {
    if (route.fullPath === lastTrackedFullPath) {
      return
    }

    lastTrackedFullPath = route.fullPath

    analyticsContext.logEvent(
      analyticsContext.analytics,
      'page_view',
      getPageViewParams(route)
    )
  }

  router.afterEach((to) => {
    trackPageView(to)
  })

  await router.isReady()
  trackPageView(router.currentRoute.value)
}
