import {
  getGoogleCalendarScopesForMode,
  googleCalendarUxMode,
  validateGoogleCalendarPublicConfig,
} from 'src/config/googleCalendar'

const googleIdentityScriptUrl = 'https://accounts.google.com/gsi/client'
const googleCalendarApiBaseUrl = 'https://www.googleapis.com/calendar/v3'

export type GoogleCalendarAccessMode = 'view' | 'edit'

export type GoogleCalendarApiEventDateTime = {
  date?: string
  dateTime?: string
  timeZone?: string
}

export type GoogleCalendarApiEvent = {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  status?: string
  start: GoogleCalendarApiEventDateTime
  end: GoogleCalendarApiEventDateTime
}

export type GoogleCalendarTokenResponse = {
  access_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

type GoogleCalendarListResponse = {
  items?: GoogleCalendarApiEvent[]
  error?: { message?: string }
}

type GoogleCalendarErrorResponse = {
  error?: { message?: string }
}

type GoogleCalendarPatchPayload = {
  summary: string
  description: string
  location: string
  start: GoogleCalendarApiEventDateTime
  end: GoogleCalendarApiEventDateTime
}

type GoogleIdentityPrompt = '' | 'consent'

type GoogleIdentityError = {
  type?: string
}

type GoogleIdentityTokenClientConfig = {
  client_id: string
  scope: string
  ux_mode: typeof googleCalendarUxMode
  callback: (response: GoogleCalendarTokenResponse) => void
  error_callback?: (error: GoogleIdentityError) => void
}

type GoogleIdentityRequestAccessTokenOptions = {
  prompt?: GoogleIdentityPrompt
  scope?: string
  hint?: string
}

type GoogleIdentityTokenClient = {
  requestAccessToken: (
    options?: GoogleIdentityRequestAccessTokenOptions
  ) => void
}

type GoogleIdentityOauth2 = {
  initTokenClient: (
    config: GoogleIdentityTokenClientConfig
  ) => GoogleIdentityTokenClient
  revoke: (token: string, callback?: () => void) => void
}

type GoogleIdentityNamespace = {
  accounts: {
    oauth2: GoogleIdentityOauth2
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityNamespace
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null

const readErrorMessage = (payload: unknown, fallbackMessage: string) => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message
  }

  return fallbackMessage
}

export const parseGrantedGoogleCalendarScopes = (scopeValue?: string) => {
  if (!scopeValue) {
    return []
  }

  return scopeValue
    .split(' ')
    .map((scope) => scope.trim())
    .filter(Boolean)
}

export const loadGoogleIdentityServicesScript = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Google Identity Services はブラウザ環境でのみ利用できます。')
  }

  if (window.google?.accounts?.oauth2) {
    return
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const rejectWithLoadError = (scriptElement?: HTMLScriptElement | null) => {
      googleIdentityScriptPromise = null
      scriptElement?.remove()
      reject(new Error('Google Identity Services の読み込みに失敗しました。'))
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${googleIdentityScriptUrl}"]`
    )

    if (existingScript) {
      if (window.google?.accounts?.oauth2) {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => rejectWithLoadError(existingScript),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.src = googleIdentityScriptUrl
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => rejectWithLoadError(script)
    document.head.appendChild(script)
  })

  return googleIdentityScriptPromise
}

export const requestGoogleCalendarAccessToken = async (options: {
  mode: GoogleCalendarAccessMode
  existingAccessToken?: string
  userHint?: string
}) => {
  const { clientId } = validateGoogleCalendarPublicConfig()
  const scopes = getGoogleCalendarScopesForMode(options.mode).join(' ')

  await loadGoogleIdentityServicesScript()

  const oauth2 = window.google?.accounts?.oauth2

  if (!oauth2) {
    throw new Error('Google Identity Services の初期化に失敗しました。')
  }

  return new Promise<GoogleCalendarTokenResponse>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      ux_mode: googleCalendarUxMode,
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Google OAuth の認可に失敗しました。'
            )
          )
          return
        }

        if (!response.access_token) {
          reject(new Error('Google access token が返されませんでした。'))
          return
        }

        resolve(response)
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.type
              ? `Google OAuth のポップアップ処理に失敗しました: ${error.type}`
              : 'Google OAuth のポップアップ処理に失敗しました。'
          )
        )
      },
    })

    tokenClient.requestAccessToken({
      prompt: options.existingAccessToken ? '' : 'consent',
      scope: scopes,
      hint: options.userHint,
    })
  })
}

export const revokeGoogleCalendarAccessToken = async (accessToken: string) => {
  if (!accessToken) {
    return
  }

  await loadGoogleIdentityServicesScript()

  const oauth2 = window.google?.accounts?.oauth2

  if (!oauth2) {
    return
  }

  await new Promise<void>((resolve) => {
    oauth2.revoke(accessToken, () => resolve())
  })
}

export const listGoogleCalendarEvents = async (options: {
  accessToken: string
  calendarId: string
  timeMin: Date
  timeMax: Date
}) => {
  const url = new URL(
    `${googleCalendarApiBaseUrl}/calendars/${encodeURIComponent(options.calendarId)}/events`
  )

  url.search = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: 'false',
    maxResults: '500',
    timeMin: options.timeMin.toISOString(),
    timeMax: options.timeMax.toISOString(),
  }).toString()

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  })

  const responseBody = (await response.json().catch(
    () => ({ items: [] } as GoogleCalendarListResponse)
  )) as GoogleCalendarListResponse

  if (!response.ok) {
    throw new Error(
      readErrorMessage(
        responseBody,
        `Google Calendar の予定取得に失敗しました (${response.status})。`
      )
    )
  }

  return Array.isArray(responseBody.items) ? responseBody.items : []
}

export const patchGoogleCalendarEvent = async (options: {
  accessToken: string
  calendarId: string
  eventId: string
  payload: GoogleCalendarPatchPayload
}) => {
  const response = await fetch(
    `${googleCalendarApiBaseUrl}/calendars/${encodeURIComponent(options.calendarId)}/events/${encodeURIComponent(options.eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.payload),
    }
  )

  const responseBody = (await response.json().catch(
    () => ({ error: { message: '' } } as GoogleCalendarErrorResponse)
  )) as GoogleCalendarApiEvent | GoogleCalendarErrorResponse

  if (!response.ok) {
    throw new Error(
      readErrorMessage(
        responseBody,
        `Google Calendar の予定更新に失敗しました (${response.status})。`
      )
    )
  }

  return responseBody as GoogleCalendarApiEvent
}
