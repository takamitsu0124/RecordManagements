<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import jaLocale from '@fullcalendar/core/locales/ja'
import {
  CalendarOptions,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from '@fullcalendar/core'
import { Guild } from '@rm/types'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import { globalLoginUserData } from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import {
  getGoogleCalendarRolePolicy,
  googleCalendarPublicConfig,
  googleCalendarScopes,
  validateGoogleCalendarPublicConfig,
} from 'src/config/googleCalendar'
import {
  notifyError,
  notifyInfo,
  notifySuccess,
} from 'src/composables/useAppNotifications'
import {
  GoogleCalendarApiEvent,
  GoogleCalendarTokenResponse,
  listGoogleCalendarEvents,
  parseGrantedGoogleCalendarScopes,
  patchGoogleCalendarEvent,
  requestGoogleCalendarAccessToken,
  revokeGoogleCalendarAccessToken,
} from 'src/services/googleCalendar'
import { fetchGuild } from 'src/services/guildData'

type CalendarSourceKey = 'guild' | 'personal'

type CalendarSourceOption = {
  key: CalendarSourceKey
  label: string
  description: string
  calendarId: string
  editable: boolean
}

type CalendarEventEntry = {
  id: string
  googleEventId: string
  source: CalendarSourceKey
  calendarId: string
  apiEvent: GoogleCalendarApiEvent
}

type CalendarEventForm = {
  id: string
  googleEventId: string
  source: CalendarSourceKey
  calendarId: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  htmlLink: string
}

const router = useRouter()

const activeSource = ref<CalendarSourceKey>('guild')
const guildDetail = ref<Guild | null>(null)
const accessToken = ref('')
const grantedScopes = ref<string[]>([])
const eventEntries = ref<CalendarEventEntry[]>([])
const selectedEvent = ref<CalendarEventEntry | null>(null)
const eventDialogVisible = ref(false)
const isLoadingGuild = ref(false)
const isConnecting = ref(false)
const isLoadingEvents = ref(false)
const isSaving = ref(false)
const isMobile = ref(false)
const currentRange = ref<{ start: Date; end: Date } | null>(null)
const configurationErrorMessage = ref('')
const eventForm = ref<CalendarEventForm>({
  id: '',
  googleEventId: '',
  source: 'guild',
  calendarId: '',
  title: '',
  description: '',
  location: '',
  start: '',
  end: '',
  allDay: false,
  htmlLink: '',
})

const localTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'

const updateViewportState = () => {
  isMobile.value = window.innerWidth < 768
}

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addLocalDays = (value: string, days: number) => {
  const date = parseLocalDate(value)
  if (!date) {
    return value
  }

  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

const toDateTimeLocalValue = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const toInclusiveAllDayEnd = (endDate?: string, fallbackDate?: string) => {
  if (!endDate) {
    return fallbackDate || ''
  }

  return addLocalDays(endDate, -1)
}

const getEventStartDate = (event: GoogleCalendarApiEvent) => {
  return event.start.dateTime || event.start.date || ''
}

const isAllDayEvent = (event: GoogleCalendarApiEvent) => {
  return Boolean(event.start.date && !event.start.dateTime)
}

const toSortableTime = (value: string) => {
  if (!value) {
    return 0
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = parseLocalDate(value)
    return date?.getTime() || 0
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const buildEventKey = (
  source: CalendarSourceKey,
  calendarId: string,
  googleEventId: string
) => {
  return `${source}:${calendarId}:${googleEventId}`
}

const sortEventEntries = (entries: CalendarEventEntry[]) => {
  return [...entries].sort(
    (left, right) =>
      toSortableTime(getEventStartDate(left.apiEvent)) -
      toSortableTime(getEventStartDate(right.apiEvent))
  )
}

const createDefaultRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

const toEventForm = (entry: CalendarEventEntry): CalendarEventForm => {
  const allDay = isAllDayEvent(entry.apiEvent)
  const startValue = allDay
    ? entry.apiEvent.start.date || ''
    : toDateTimeLocalValue(entry.apiEvent.start.dateTime)
  const endValue = allDay
    ? toInclusiveAllDayEnd(entry.apiEvent.end.date, entry.apiEvent.start.date)
    : toDateTimeLocalValue(
        entry.apiEvent.end.dateTime || entry.apiEvent.start.dateTime
      )

  return {
    id: entry.id,
    googleEventId: entry.googleEventId,
    source: entry.source,
    calendarId: entry.calendarId,
    title: entry.apiEvent.summary || '',
    description: entry.apiEvent.description || '',
    location: entry.apiEvent.location || '',
    start: startValue,
    end: endValue || startValue,
    allDay,
    htmlLink: entry.apiEvent.htmlLink || '',
  }
}

const clearSelectedEvent = () => {
  selectedEvent.value = null
  eventDialogVisible.value = false
  eventForm.value = {
    id: '',
    googleEventId: '',
    source: activeSource.value,
    calendarId: '',
    title: '',
    description: '',
    location: '',
    start: '',
    end: '',
    allDay: false,
    htmlLink: '',
  }
}

const clearCalendarSession = () => {
  accessToken.value = ''
  grantedScopes.value = []
  eventEntries.value = []
  clearSelectedEvent()
}

const rolePolicy = computed(() =>
  getGoogleCalendarRolePolicy(globalLoginUserData.value.role)
)

const guildCalendarId = computed(
  () => guildDetail.value?.googleCalendarId?.trim() || ''
)
const guildName = computed(() => guildDetail.value?.guildName || '所属ギルド')

const sourceOptions = computed<CalendarSourceOption[]>(() => {
  const options: CalendarSourceOption[] = []

  if (
    googleCalendarPublicConfig.enableGuildCalendar &&
    rolePolicy.value.canViewGuildCalendar &&
    globalLoginUserData.value.guildId
  ) {
    options.push({
      key: 'guild',
      label: 'ギルド共有',
      description: `${guildName.value} の共有予定を確認します。`,
      calendarId: guildCalendarId.value,
      editable: rolePolicy.value.canEditGuildCalendar,
    })
  }

  if (
    googleCalendarPublicConfig.enablePersonalCalendar &&
    rolePolicy.value.canConnectPersonalCalendar
  ) {
    options.push({
      key: 'personal',
      label: '個人カレンダー',
      description: 'Google アカウント本人の primary calendar を表示します。',
      calendarId: 'primary',
      editable: rolePolicy.value.canEditPersonalCalendar,
    })
  }

  return options
})

const activeSourceOption = computed(() => {
  return (
    sourceOptions.value.find((option) => option.key === activeSource.value) ||
    sourceOptions.value[0] ||
    null
  )
})

const calendarEvents = computed<EventInput[]>(() =>
  eventEntries.value.map((entry) => ({
    id: entry.id,
    title: entry.apiEvent.summary || '(無題)',
    start: entry.apiEvent.start.dateTime || entry.apiEvent.start.date,
    end: entry.apiEvent.end.dateTime || entry.apiEvent.end.date,
    allDay: isAllDayEvent(entry.apiEvent),
    extendedProps: {
      description: entry.apiEvent.description || '',
      location: entry.apiEvent.location || '',
      source: entry.source,
      htmlLink: entry.apiEvent.htmlLink || '',
    },
  }))
)

const calendarLayoutKey = computed(() =>
  isMobile.value ? 'mobile' : 'desktop'
)

const isConnected = computed(() => accessToken.value !== '')
const hasEditScope = computed(() =>
  grantedScopes.value.includes(googleCalendarScopes.manageEvents)
)
const canEditActiveSource = computed(
  () => activeSourceOption.value?.editable ?? false
)
const isDialogReadOnly = computed(
  () => !canEditActiveSource.value || isSaving.value
)
const canShowCalendarSetupAction = computed(
  () =>
    activeSource.value === 'guild' &&
    rolePolicy.value.canEditGuildCalendar &&
    globalLoginUserData.value.guildId !== ''
)

const statusPills = computed(() => [
  {
    label: isConnected.value ? 'Google 接続中' : '未接続',
    tone: isConnected.value ? 'success' : 'muted',
  },
  {
    label: canEditActiveSource.value ? '編集可' : '閲覧専用',
    tone: canEditActiveSource.value ? 'info' : 'muted',
  },
  {
    label: hasEditScope.value ? 'edit scope 取得済み' : 'readonly scope',
    tone: hasEditScope.value ? 'warning' : 'muted',
  },
])

const currentScopeText = computed(() => {
  if (!grantedScopes.value.length) {
    return '未取得'
  }

  return grantedScopes.value.join('\n')
})

const sourceNotice = computed(() => {
  if (!activeSourceOption.value) {
    return ''
  }

  if (activeSource.value === 'guild') {
    return canEditActiveSource.value
      ? 'Guild Admin / Admin は共有予定を Dialog からそのまま更新できます。'
      : 'メンバーは共有予定を閲覧専用で確認できます。編集は Guild Admin 以上に限定されます。'
  }

  return '個人カレンダーは接続した Google アカウント本人の予定だけを扱います。'
})

const getSourceBlocker = () => {
  if (configurationErrorMessage.value) {
    return {
      title: 'Google Calendar の public 設定が不足しています',
      message: configurationErrorMessage.value,
    }
  }

  if (!sourceOptions.value.length) {
    return {
      title: '利用できるカレンダーがありません',
      message:
        '所属ギルドの共有カレンダー設定、または personal calendar の feature flag を確認してください。',
    }
  }

  if (activeSource.value === 'guild' && !guildCalendarId.value) {
    return {
      title: '共有カレンダー ID が未設定です',
      message:
        'ギルド編集画面で共有 Google Calendar ID を登録すると、ギルド予定を表示できます。',
    }
  }

  return null
}

const calendarBlocker = computed(() => getSourceBlocker())

const updateEventEntry = (
  apiEvent: GoogleCalendarApiEvent,
  source: CalendarSourceKey,
  calendarId: string
) => {
  const nextEntry: CalendarEventEntry = {
    id: buildEventKey(source, calendarId, apiEvent.id),
    googleEventId: apiEvent.id,
    source,
    calendarId,
    apiEvent,
  }

  const nextEntries = eventEntries.value.filter(
    (entry) => entry.id !== nextEntry.id
  )
  nextEntries.push(nextEntry)
  eventEntries.value = sortEventEntries(nextEntries)

  if (selectedEvent.value?.id === nextEntry.id) {
    selectedEvent.value = nextEntry
    eventForm.value = toEventForm(nextEntry)
  }
}

const loadGuildCalendarConfig = async () => {
  if (
    !globalLoginUserData.value.guildId ||
    !googleCalendarPublicConfig.enableGuildCalendar
  ) {
    guildDetail.value = null
    return
  }

  isLoadingGuild.value = true

  try {
    const guildId = globalLoginUserData.value.guildId
    guildDetail.value = await fetchGuild(guildId)
  } catch (error) {
    guildDetail.value = null
    notifyError('ギルドのカレンダー設定取得に失敗しました。')
    console.error('Failed to load guild calendar config:', error)
  } finally {
    isLoadingGuild.value = false
  }
}

const ensureCalendarAccess = async (
  mode: 'view' | 'edit',
  notifyOnSuccess = false
) => {
  if (
    mode === 'view' &&
    accessToken.value &&
    grantedScopes.value.includes(googleCalendarScopes.readonlyEvents)
  ) {
    return accessToken.value
  }

  if (
    mode === 'edit' &&
    accessToken.value &&
    grantedScopes.value.includes(googleCalendarScopes.manageEvents)
  ) {
    return accessToken.value
  }

  isConnecting.value = true

  try {
    const response: GoogleCalendarTokenResponse =
      await requestGoogleCalendarAccessToken({
        mode,
        existingAccessToken: accessToken.value,
        userHint: globalLoginUserData.value.email || undefined,
      })

    accessToken.value = response.access_token || ''
    grantedScopes.value = [
      ...new Set([
        ...grantedScopes.value,
        ...parseGrantedGoogleCalendarScopes(response.scope),
      ]),
    ]

    if (notifyOnSuccess) {
      notifySuccess(
        mode === 'edit'
          ? 'Google Calendar の編集権限を取得しました。'
          : 'Google Calendar に接続しました。'
      )
    }

    return accessToken.value
  } finally {
    isConnecting.value = false
  }
}

const handleCalendarError = (error: unknown, fallbackMessage: string) => {
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage

  if (/\b401\b/.test(message)) {
    clearCalendarSession()
    notifyInfo('Google 連携の有効期限が切れました。再接続してください。')
    return
  }

  notifyError(message || fallbackMessage)
}

const reloadEvents = async () => {
  if (
    !activeSourceOption.value ||
    !accessToken.value ||
    calendarBlocker.value
  ) {
    eventEntries.value = []
    return
  }

  isLoadingEvents.value = true

  try {
    const range = currentRange.value || createDefaultRange()
    const items = await listGoogleCalendarEvents({
      accessToken: accessToken.value,
      calendarId: activeSourceOption.value.calendarId,
      timeMin: range.start,
      timeMax: range.end,
    })

    eventEntries.value = sortEventEntries(
      items.map((item) => ({
        id: buildEventKey(
          activeSource.value,
          activeSourceOption.value?.calendarId || '',
          item.id
        ),
        googleEventId: item.id,
        source: activeSource.value,
        calendarId: activeSourceOption.value?.calendarId || '',
        apiEvent: item,
      }))
    )

    if (selectedEvent.value) {
      const refreshedSelectedEvent =
        eventEntries.value.find(
          (entry) => entry.id === selectedEvent.value?.id
        ) || null
      selectedEvent.value = refreshedSelectedEvent
      if (refreshedSelectedEvent) {
        eventForm.value = toEventForm(refreshedSelectedEvent)
      }
    }
  } catch (error) {
    eventEntries.value = []
    handleCalendarError(error, 'Google Calendar の予定取得に失敗しました。')
  } finally {
    isLoadingEvents.value = false
  }
}

const connectCalendar = async () => {
  if (calendarBlocker.value) {
    notifyError(calendarBlocker.value.message)
    return
  }

  try {
    await ensureCalendarAccess('view', true)
    await reloadEvents()
  } catch (error) {
    handleCalendarError(error, 'Google Calendar への接続に失敗しました。')
  }
}

const disconnectCalendar = async () => {
  const token = accessToken.value
  clearCalendarSession()

  try {
    await revokeGoogleCalendarAccessToken(token)
    notifyInfo('Google Calendar との接続を解除しました。')
  } catch (error) {
    handleCalendarError(error, 'Google Calendar の接続解除に失敗しました。')
  }
}

const onDatesSet = async (arg: DatesSetArg) => {
  currentRange.value = { start: arg.start, end: arg.end }

  if (isConnected.value) {
    await reloadEvents()
  }
}

const onEventClick = (arg: EventClickArg) => {
  const entry = eventEntries.value.find(
    (eventEntry) => eventEntry.id === arg.event.id
  )

  if (!entry) {
    notifyError('選択した予定の詳細を取得できませんでした。')
    return
  }

  selectedEvent.value = entry
  eventForm.value = toEventForm(entry)
  eventDialogVisible.value = true
}

const validateEventForm = () => {
  if (!eventForm.value.title.trim()) {
    notifyError('タイトルを入力してください。')
    return false
  }

  if (!eventForm.value.start || !eventForm.value.end) {
    notifyError('開始日時と終了日時を入力してください。')
    return false
  }

  if (eventForm.value.allDay) {
    if (eventForm.value.end < eventForm.value.start) {
      notifyError('終了日は開始日以降を指定してください。')
      return false
    }

    return true
  }

  const start = new Date(eventForm.value.start)
  const end = new Date(eventForm.value.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    notifyError('日時の形式が正しくありません。')
    return false
  }

  if (end.getTime() < start.getTime()) {
    notifyError('終了日時は開始日時以降を指定してください。')
    return false
  }

  return true
}

const saveEventChanges = async () => {
  if (!selectedEvent.value) {
    return
  }

  if (!canEditActiveSource.value) {
    notifyError('このカレンダーを編集する権限がありません。')
    return
  }

  if (!validateEventForm()) {
    return
  }

  isSaving.value = true

  try {
    const token = await ensureCalendarAccess('edit', true)
    const payload = eventForm.value.allDay
      ? {
          summary: eventForm.value.title.trim(),
          description: eventForm.value.description.trim(),
          location: eventForm.value.location.trim(),
          start: { date: eventForm.value.start },
          end: { date: addLocalDays(eventForm.value.end, 1) },
        }
      : {
          summary: eventForm.value.title.trim(),
          description: eventForm.value.description.trim(),
          location: eventForm.value.location.trim(),
          start: {
            dateTime: new Date(eventForm.value.start).toISOString(),
            timeZone: localTimeZone,
          },
          end: {
            dateTime: new Date(eventForm.value.end).toISOString(),
            timeZone: localTimeZone,
          },
        }

    const updatedEvent = await patchGoogleCalendarEvent({
      accessToken: token,
      calendarId: selectedEvent.value.calendarId,
      eventId: selectedEvent.value.googleEventId,
      payload,
    })

    updateEventEntry(
      updatedEvent,
      selectedEvent.value.source,
      selectedEvent.value.calendarId
    )

    eventDialogVisible.value = false
    notifySuccess('予定を更新しました。')
  } catch (error) {
    handleCalendarError(error, '予定の更新に失敗しました。')
  } finally {
    isSaving.value = false
  }
}

const goToGuildEdit = () => {
  if (!globalLoginUserData.value.guildId) {
    notifyError('編集対象のギルドが見つかりません。')
    return
  }

  router.push({
    name: 'RMGuildEdit',
    params: { guildId: globalLoginUserData.value.guildId },
  })
}

watch(
  sourceOptions,
  (options) => {
    if (!options.length) {
      return
    }

    if (!options.some((option) => option.key === activeSource.value)) {
      activeSource.value = options[0].key
    }
  },
  { immediate: true }
)

watch(activeSource, async () => {
  clearSelectedEvent()
  eventEntries.value = []

  if (isConnected.value) {
    await reloadEvents()
  }
})

watch(guildCalendarId, async () => {
  if (isConnected.value && activeSource.value === 'guild') {
    await reloadEvents()
  }
})

onMounted(async () => {
  try {
    validateGoogleCalendarPublicConfig()
  } catch (error) {
    configurationErrorMessage.value =
      error instanceof Error
        ? error.message
        : 'Google Calendar の設定確認に失敗しました。'
  }

  updateViewportState()
  window.addEventListener('resize', updateViewportState)
  await loadGuildCalendarConfig()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportState)
})

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, listPlugin, interactionPlugin],
  locale: jaLocale,
  initialView: isMobile.value ? 'listWeek' : 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,listWeek',
  },
  buttonText: {
    today: '今日',
    dayGridMonth: '月',
    listWeek: '週リスト',
  },
  events: calendarEvents.value,
  eventClick: onEventClick,
  datesSet: onDatesSet,
  editable: false,
  selectable: false,
  dayMaxEvents: true,
  nowIndicator: true,
  height: 'auto',
  noEventsContent: '予定はありません',
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
}))
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <RMPageHeader
        title="イベントカレンダー"
        subtitle="Google Calendar の予定確認と必要範囲の編集をアプリ内で完結します。"
        description="共有ギルド予定は role に応じて閲覧 / 編集を分け、personal calendar は token owner の primary calendar だけを扱います。"
        icon="pi pi-calendar"
      >
        <template #actions>
          <RMButton
            v-if="isConnected"
            :label="isLoadingEvents ? '更新中...' : '再読み込み'"
            width="170px"
            outline
            :isDisable="
              isLoadingEvents || isConnecting || Boolean(calendarBlocker)
            "
            @click="reloadEvents"
          />
          <RMButton
            v-if="isConnected"
            label="接続解除"
            width="170px"
            flat
            color="grey"
            :isDisable="isLoadingEvents || isConnecting"
            @click="disconnectCalendar"
          />
          <RMButton
            v-else
            :label="isConnecting ? '接続中...' : 'Google に接続'"
            width="190px"
            color="primary"
            :isDisable="isConnecting || Boolean(calendarBlocker)"
            @click="connectCalendar"
          />
        </template>
      </RMPageHeader>

      <div class="calendar-overview-grid">
        <Card class="calendar-panel-card">
          <template #content>
            <div class="calendar-panel-card__content">
              <div class="calendar-panel-card__title">表示対象</div>
              <div class="calendar-source-list">
                <button
                  v-for="option in sourceOptions"
                  :key="option.key"
                  type="button"
                  class="calendar-source-button"
                  :class="{
                    'calendar-source-button--active':
                      activeSource === option.key,
                  }"
                  @click="activeSource = option.key"
                >
                  <div class="calendar-source-button__label">
                    {{ option.label }}
                  </div>
                  <div class="calendar-source-button__description">
                    {{ option.description }}
                  </div>
                </button>
              </div>
            </div>
          </template>
        </Card>

        <Card class="calendar-panel-card">
          <template #content>
            <div class="calendar-panel-card__content">
              <div class="calendar-panel-card__title">接続状態</div>
              <div class="calendar-status-pill_list">
                <span
                  v-for="pill in statusPills"
                  :key="pill.label"
                  class="calendar-status-pill"
                  :class="`calendar-status-pill--${pill.tone}`"
                >
                  {{ pill.label }}
                </span>
              </div>

              <dl class="calendar-status-list">
                <div class="calendar-status-list__row">
                  <dt>現在の表示先</dt>
                  <dd>{{ activeSourceOption?.label || '未選択' }}</dd>
                </div>
                <div class="calendar-status-list__row">
                  <dt>カレンダー ID</dt>
                  <dd>{{ activeSourceOption?.calendarId || '未設定' }}</dd>
                </div>
                <div class="calendar-status-list__row">
                  <dt>取得済み scope</dt>
                  <dd class="calendar-status-list__scopes">
                    {{ currentScopeText }}
                  </dd>
                </div>
              </dl>
            </div>
          </template>
        </Card>
      </div>

      <Card class="calendar-main-card">
        <template #content>
          <div class="calendar-main-card__content">
            <div v-if="isLoadingGuild" class="rm-state-card">
              <ProgressSpinner strokeWidth="5" />
              <p class="rm-muted">カレンダー設定を読み込み中...</p>
            </div>

            <RMEmptyState
              v-else-if="calendarBlocker"
              icon="pi pi-calendar-times"
              :title="calendarBlocker.title"
              :message="calendarBlocker.message"
            >
              <template #actions>
                <RMButton
                  v-if="canShowCalendarSetupAction"
                  label="ギルド設定を開く"
                  width="190px"
                  color="primary"
                  @click="goToGuildEdit"
                />
                <RMButton
                  v-if="
                    activeSource === 'guild' &&
                    sourceOptions.some((option) => option.key === 'personal')
                  "
                  label="個人カレンダーへ切替"
                  width="210px"
                  outline
                  @click="activeSource = 'personal'"
                />
              </template>
            </RMEmptyState>

            <template v-else>
              <div
                class="calendar-notice"
                :class="{ 'calendar-notice--editable': canEditActiveSource }"
              >
                {{ sourceNotice }}
              </div>

              <RMEmptyState
                v-if="!isConnected"
                icon="pi pi-google"
                title="Google Calendar へ接続してください"
                message="接続後、この期間の予定を FullCalendar で表示します。編集権限がある場合は Dialog から直接更新できます。"
              >
                <template #actions>
                  <RMButton
                    :label="isConnecting ? '接続中...' : 'Google に接続'"
                    width="190px"
                    color="primary"
                    :isDisable="isConnecting"
                    @click="connectCalendar"
                  />
                </template>
              </RMEmptyState>

              <template v-else>
                <div v-if="isLoadingEvents" class="rm-state-card">
                  <ProgressSpinner strokeWidth="5" />
                  <p class="rm-muted">Google Calendar の予定を取得中...</p>
                </div>

                <template v-else>
                  <FullCalendar
                    :key="calendarLayoutKey"
                    :options="calendarOptions"
                  />
                  <div
                    v-if="calendarEvents.length === 0"
                    class="calendar-empty-inline"
                  >
                    この表示範囲に予定はありません。
                  </div>
                </template>
              </template>
            </template>
          </div>
        </template>
      </Card>
    </div>

    <Dialog
      v-model:visible="eventDialogVisible"
      modal
      header="予定の詳細"
      :style="{ width: 'min(96vw, 720px)' }"
      @hide="clearSelectedEvent"
    >
      <div v-if="selectedEvent" class="calendar-dialog">
        <div class="calendar-status-pill_list">
          <span class="calendar-status-pill calendar-status-pill--info">
            {{ activeSourceOption?.label || '予定' }}
          </span>
          <span
            class="calendar-status-pill"
            :class="
              eventForm.allDay
                ? 'calendar-status-pill--warning'
                : 'calendar-status-pill--success'
            "
          >
            {{ eventForm.allDay ? '終日予定' : '時刻指定' }}
          </span>
          <span
            v-if="!canEditActiveSource"
            class="calendar-status-pill calendar-status-pill--muted"
          >
            閲覧専用
          </span>
        </div>

        <div class="calendar-dialog__grid">
          <RMInput
            v-model="eventForm.title"
            label="タイトル *"
            :outline="true"
            :disabled="isDialogReadOnly"
          />

          <div class="calendar-dialog__date-grid">
            <RMInput
              v-model="eventForm.start"
              :label="eventForm.allDay ? '開始日 *' : '開始日時 *'"
              :type="eventForm.allDay ? 'date' : 'datetime-local'"
              :outline="true"
              :disabled="isDialogReadOnly"
            />
            <RMInput
              v-model="eventForm.end"
              :label="eventForm.allDay ? '終了日 *' : '終了日時 *'"
              :type="eventForm.allDay ? 'date' : 'datetime-local'"
              :outline="true"
              :disabled="isDialogReadOnly"
            />
          </div>

          <RMInput
            v-model="eventForm.location"
            label="場所"
            hint="Google Calendar の location を更新します"
            :outline="true"
            :disabled="isDialogReadOnly"
          />

          <RMInput
            v-model="eventForm.description"
            label="メモ"
            type="textarea"
            hint="Google Calendar の description を更新します"
            :outline="true"
            :disabled="isDialogReadOnly"
          />

          <a
            v-if="eventForm.htmlLink"
            :href="eventForm.htmlLink"
            target="_blank"
            rel="noopener noreferrer"
            class="calendar-dialog__link"
          >
            Google Calendar で開く
          </a>
        </div>
      </div>

      <template #footer>
        <div class="calendar-dialog__footer">
          <RMButton
            label="閉じる"
            width="150px"
            flat
            color="grey"
            :isDisable="isSaving"
            @click="eventDialogVisible = false"
          />
          <RMButton
            v-if="canEditActiveSource"
            :label="isSaving ? '保存中...' : '保存'"
            width="150px"
            color="primary"
            :isDisable="isSaving"
            @click="saveEventChanges"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.calendar-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.calendar-panel-card,
.calendar-main-card {
  border-radius: 24px;
}

.calendar-panel-card__content,
.calendar-main-card__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: clamp(16px, 2vw, 22px);
}

.calendar-panel-card__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--rm-text);
}

.calendar-source-list,
.calendar-status-pill_list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.calendar-source-button {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid rgba(75, 105, 130, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.calendar-source-button:hover {
  transform: translateY(-1px);
}

.calendar-source-button--active {
  border-color: rgba(75, 105, 130, 0.42);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.calendar-source-button__label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rm-text);
}

.calendar-source-button__description,
.calendar-empty-inline,
.calendar-notice,
.calendar-dialog__link {
  line-height: 1.7;
}

.calendar-source-button__description,
.calendar-empty-inline,
.calendar-status-list dd,
.calendar-notice,
.calendar-dialog__link {
  color: var(--rm-text-soft);
}

.calendar-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
}

.calendar-status-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.calendar-status-pill--info {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.calendar-status-pill--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.calendar-status-pill--muted {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.calendar-status-list {
  display: grid;
  gap: 10px;
  margin: 0;
}

.calendar-status-list__row {
  display: grid;
  gap: 6px;
}

.calendar-status-list dt {
  font-size: 0.86rem;
  font-weight: 700;
  color: #475569;
}

.calendar-status-list dd {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.calendar-status-list__scopes {
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco,
    Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.82rem;
}

.calendar-notice {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(100, 116, 139, 0.1);
}

.calendar-notice--editable {
  background: rgba(59, 130, 246, 0.1);
}

.calendar-empty-inline {
  text-align: center;
}

.calendar-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.calendar-dialog__grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.calendar-dialog__date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.calendar-dialog__link {
  font-weight: 700;
  text-decoration: none;
}

.calendar-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.calendar-main-card :deep(.fc) {
  --fc-border-color: rgba(148, 163, 184, 0.22);
  --fc-button-bg-color: #4b6982;
  --fc-button-border-color: #4b6982;
  --fc-button-hover-bg-color: #355268;
  --fc-button-hover-border-color: #355268;
  --fc-button-active-bg-color: #355268;
  --fc-button-active-border-color: #355268;
  --fc-event-bg-color: #4b6982;
  --fc-event-border-color: #4b6982;
  --fc-page-bg-color: transparent;
}

.calendar-main-card :deep(.fc-toolbar.fc-header-toolbar) {
  gap: 12px;
  margin-bottom: 16px;
}

.calendar-main-card :deep(.fc-daygrid-event),
.calendar-main-card :deep(.fc-list-event) {
  cursor: pointer;
}

.calendar-main-card :deep(.fc-list-empty) {
  background: transparent;
}

@media (max-width: 767px) {
  .calendar-dialog__date-grid {
    grid-template-columns: 1fr;
  }

  .calendar-dialog__footer {
    flex-direction: column-reverse;
  }

  .calendar-main-card :deep(.fc-toolbar.fc-header-toolbar) {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-main-card :deep(.fc-toolbar-chunk) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
