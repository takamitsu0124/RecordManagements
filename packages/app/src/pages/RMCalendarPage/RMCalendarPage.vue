<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import jaLocale from '@fullcalendar/core/locales/ja'
import {
  CalendarOptions,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from '@fullcalendar/core'
import { useDialog } from 'primevue/usedialog'
import { Guild, GuildCalendarEvent } from '@rm/types'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import { globalLoginUserData } from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMFlowGuide from 'src/components/RMFlowGuide/RMFlowGuide.vue'
import RMFloatingGuideButton from 'src/components/RMFloatingGuideButton/RMFloatingGuideButton.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import RMCalendarEventDialogContent from 'src/pages/RMCalendarPage/components/RMCalendarEventDialogContent.vue'
import {
  notifyError,
  notifySuccess,
} from 'src/composables/useAppNotifications'
import {
  createGuildCalendarEvent,
  deleteGuildCalendarEvent,
  fetchGuild,
  fetchGuildCalendarEvents,
  updateGuildCalendarEvent,
} from 'src/services/guildData'

type CalendarEventForm = {
  id: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
}

const dialog = useDialog()

const guildDetail = ref<Guild | null>(null)
const eventEntries = ref<GuildCalendarEvent[]>([])
const isLoadingGuild = ref(false)
const isLoadingEvents = ref(false)
const isSaving = ref(false)
const isMobile = ref(false)
const isTablet = ref(false)
const currentRange = ref<{ start: Date; end: Date } | null>(null)

const updateViewportState = () => {
  const width = window.innerWidth
  isMobile.value = width < 768
  isTablet.value = width >= 768 && width < 1120
}

const parseLocalDate = (value: string) => {
  const normalized = value.replace(/\//g, '-').trim()
  const [year, month, day] = normalized.split('-').map(Number)
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

const formatDateTimeLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const addLocalDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const toInclusiveAllDayEnd = (date: Date) => {
  return formatLocalDate(addLocalDays(date, -1))
}

const roundToNextHour = (value: Date) => {
  const nextDate = new Date(value)
  nextDate.setSeconds(0, 0)

  if (nextDate.getMinutes() > 0) {
    nextDate.setHours(nextDate.getHours() + 1, 0, 0, 0)
    return nextDate
  }

  return nextDate
}

const createDefaultTimedWindow = () => {
  const start = roundToNextHour(new Date())
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start, end }
}

const sortEventEntries = (entries: GuildCalendarEvent[]) => {
  return [...entries].sort(
    (left, right) => left.startAt.getTime() - right.startAt.getTime()
  )
}

const createNewEventForm = (options?: { date?: Date; allDay?: boolean }) => {
  const allDay = options?.allDay ?? false

  if (allDay) {
    const date = options?.date || new Date()
    const value = formatLocalDate(date)
    return {
      id: '',
      title: '',
      description: '',
      location: '',
      start: value,
      end: value,
      allDay: true,
    }
  }

  const { start, end } = createDefaultTimedWindow()
  return {
    id: '',
    title: '',
    description: '',
    location: '',
    start: formatDateTimeLocal(start),
    end: formatDateTimeLocal(end),
    allDay: false,
  }
}

const toEventForm = (entry: GuildCalendarEvent): CalendarEventForm => {
  if (entry.allDay) {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      location: entry.location,
      start: formatLocalDate(entry.startAt),
      end: toInclusiveAllDayEnd(entry.endAt),
      allDay: true,
    }
  }

  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    location: entry.location,
    start: formatDateTimeLocal(entry.startAt),
    end: formatDateTimeLocal(entry.endAt),
    allDay: false,
  }
}

const guildId = computed(() => globalLoginUserData.value.guildId || '')
const guildName = computed(() => guildDetail.value?.guildName || '所属ギルド')
const canEditCalendar = computed(
  () =>
    globalLoginUserData.value.role === 'admin' ||
    globalLoginUserData.value.role === 'guild_admin'
)
const calendarGuideItems = computed(() => {
  const items = [
    {
      title: '表示期間を切り替える',
      description:
        '月表示と週リストを切り替えながら、ギルドの共有予定を見たい粒度で確認できます。',
      targetId: 'calendar-board',
    },
    {
      title: '予定を開いて更新する',
      description:
        '予定を押すと詳細が開き、権限があればそのまま更新・削除できます。',
      targetId: 'calendar-board',
    },
  ]

  if (canEditCalendar.value) {
    items.splice(1, 0, {
      title: '予定を追加する',
      description:
        'Guild Admin / Admin は右上の「予定を追加」から新しい共有予定を登録できます。',
      targetId: 'calendar-actions',
    })
  }

  return items
})

const calendarBlocker = computed(() => {
  if (!guildId.value) {
    return {
      title: '所属ギルドが未設定です',
      message:
        'イベントカレンダーは所属ギルドの共有予定を表示します。ギルド参加後に利用してください。',
    }
  }

  return null
})

const sourceNotice = computed(() =>
  canEditCalendar.value
    ? 'Guild Admin / Admin は共有予定を追加・更新・削除できます。メンバー向けの分かりやすいタイトルと補足を残してください。'
    : 'メンバーは共有予定を閲覧専用で確認できます。更新が必要な場合は Guild Admin 以上へ依頼してください。'
)

const currentRangeText = computed(() => {
  if (!currentRange.value) {
    return '未取得'
  }

  const formatter = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return `${formatter.format(currentRange.value.start)} 〜 ${formatter.format(
    currentRange.value.end
  )}`
})

const statusPills = computed(() => [
  {
    label: guildName.value,
    tone: 'info',
  },
  {
    label: canEditCalendar.value ? '編集可' : '閲覧専用',
    tone: canEditCalendar.value ? 'success' : 'muted',
  },
  {
    label: `予定 ${eventEntries.value.length} 件`,
    tone: eventEntries.value.length > 0 ? 'warning' : 'muted',
  },
])

const calendarEvents = computed<EventInput[]>(() =>
  eventEntries.value.map((entry) => ({
    id: entry.id,
    title: entry.title || '(無題)',
    start: entry.startAt,
    end: entry.endAt,
    allDay: entry.allDay,
    extendedProps: {
      description: entry.description,
      location: entry.location,
    },
  }))
)

const calendarViewport = computed<'mobile' | 'tablet' | 'desktop'>(() => {
  if (isMobile.value) {
    return 'mobile'
  }

  if (isTablet.value) {
    return 'tablet'
  }

  return 'desktop'
})

const calendarLayoutKey = computed(() => calendarViewport.value)

const calendarHeaderToolbar = computed(() => {
  if (calendarViewport.value === 'mobile') {
    return {
      left: 'prev,next',
      center: 'title',
      right: 'today dayGridMonth,listWeek',
    }
  }

  if (calendarViewport.value === 'tablet') {
    return {
      left: 'prev,next',
      center: 'title',
      right: 'today dayGridMonth,listWeek',
    }
  }

  return {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,listWeek',
  }
})

const calendarTitleFormat = computed(() => {
  if (calendarViewport.value === 'mobile') {
    return {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  }

  if (calendarViewport.value === 'tablet') {
    return {
      year: 'numeric',
      month: 'long',
    }
  }

  return undefined
})

const calendarRoleLabel = computed(() => {
  if (globalLoginUserData.value.role === 'admin') {
    return 'Admin'
  }

  if (globalLoginUserData.value.role === 'guild_admin') {
    return 'Guild Admin'
  }

  return 'Member'
})

const calendarHintText = computed(() => {
  if (calendarViewport.value === 'mobile') {
    return 'スマホでも月表示を主役にしつつ、ツールバーだけを圧縮して PC と近い見え方を保っています。'
  }

  if (calendarViewport.value === 'tablet') {
    return 'タブレットでは月表示を保ちつつ、ツールバーが折り返しても操作しやすい幅に調整しています。'
  }

  return 'PC では月表示と週リストを切り替えながら、広い表示領域で共有予定を確認できます。'
})

const loadGuildDetail = async () => {
  if (!guildId.value) {
    guildDetail.value = null
    return
  }

  isLoadingGuild.value = true

  try {
    guildDetail.value = await fetchGuild(guildId.value, { force: true })
  } catch (error) {
    guildDetail.value = null
    notifyError('ギルド情報の取得に失敗しました。')
    console.error('Failed to load guild detail for calendar:', error)
  } finally {
    isLoadingGuild.value = false
  }
}

const reloadEvents = async () => {
  if (!guildId.value) {
    eventEntries.value = []
    return
  }

  isLoadingEvents.value = true

  try {
    const events = await fetchGuildCalendarEvents(guildId.value)
    eventEntries.value = sortEventEntries(events)
  } catch (error) {
    eventEntries.value = []
    notifyError('共有予定の取得に失敗しました。')
    console.error('Failed to load guild calendar events:', error)
  } finally {
    isLoadingEvents.value = false
  }
}

const openEventDialog = (eventForm: CalendarEventForm, header: string) => {
  dialog.open(RMCalendarEventDialogContent, {
    props: {
      header,
      modal: true,
      style: {
        width: 'min(96vw, 720px)',
      },
    },
    data: {
      eventForm,
      canEdit: canEditCalendar.value,
      sourceLabel: `${guildName.value} の共有予定`,
      isNew: !eventForm.id,
      onSave: (form: CalendarEventForm) => saveEventChanges(form),
      onDelete: eventForm.id
        ? (form: CalendarEventForm) => deleteEvent(form.id, form.title)
        : undefined,
    },
  })
}

const openCreateDialog = (options?: { date?: Date; allDay?: boolean }) => {
  if (!canEditCalendar.value) {
    notifyError('このカレンダーを編集する権限がありません。')
    return
  }

  openEventDialog(createNewEventForm(options), '予定を追加')
}

const onDatesSet = async (arg: DatesSetArg) => {
  currentRange.value = { start: arg.start, end: arg.end }
}

const onDateClick = (arg: DateClickArg) => {
  if (!canEditCalendar.value) {
    return
  }

  openCreateDialog({ date: arg.date, allDay: true })
}

const onEventClick = (arg: EventClickArg) => {
  const entry = eventEntries.value.find((eventEntry) => eventEntry.id === arg.event.id)

  if (!entry) {
    notifyError('選択した予定の詳細を取得できませんでした。')
    return
  }

  openEventDialog(toEventForm(entry), '予定の詳細')
}

const validateEventForm = (form: CalendarEventForm) => {
  if (!form.title.trim()) {
    notifyError('タイトルを入力してください。')
    return false
  }

  if (!form.start || !form.end) {
    notifyError('開始日時と終了日時を入力してください。')
    return false
  }

  if (form.allDay) {
    const start = parseLocalDate(form.start)
    const end = parseLocalDate(form.end)

    if (!start || !end) {
      notifyError('日付の形式が正しくありません。')
      return false
    }

    if (end.getTime() < start.getTime()) {
      notifyError('終了日は開始日以降を指定してください。')
      return false
    }

    return true
  }

  const start = new Date(form.start)
  const end = new Date(form.end)

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

const buildEventPayload = (form: CalendarEventForm) => {
  if (form.allDay) {
    const start = parseLocalDate(form.start)
    const end = parseLocalDate(form.end)

    if (!start || !end) {
      throw new Error('日付の形式が正しくありません。')
    }

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      allDay: true,
      startAt: start,
      endAt: addLocalDays(end, 1),
    }
  }

  const start = new Date(form.start)
  const end = new Date(form.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('日時の形式が正しくありません。')
  }

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    allDay: false,
    startAt: start,
    endAt: end,
  }
}

const saveEventChanges = async (form: CalendarEventForm) => {
  if (!canEditCalendar.value) {
    notifyError('このカレンダーを編集する権限がありません。')
    return false
  }

  if (!guildId.value) {
    notifyError('所属ギルド情報が見つかりません。')
    return false
  }

  if (!validateEventForm(form)) {
    return false
  }

  isSaving.value = true

  try {
    const payload = buildEventPayload(form)

    if (form.id) {
      await updateGuildCalendarEvent(form.id, payload)
      notifySuccess('予定を更新しました。')
    } else {
      await createGuildCalendarEvent({
        guildId: guildId.value,
        ...payload,
      })
      notifySuccess('予定を作成しました。')
    }

    await reloadEvents()
    return true
  } catch (error) {
    notifyError('予定の保存に失敗しました。')
    console.error('Failed to save guild calendar event:', error)
    return false
  } finally {
    isSaving.value = false
  }
}

const deleteEvent = async (eventId: string, eventTitle: string) => {
  if (!canEditCalendar.value) {
    notifyError('このカレンダーを編集する権限がありません。')
    return false
  }

  isSaving.value = true

  try {
    await deleteGuildCalendarEvent(eventId)
    await reloadEvents()
    notifySuccess(
      `${eventTitle?.trim() || '選択した予定'}を削除しました。`
    )
    return true
  } catch (error) {
    notifyError('予定の削除に失敗しました。')
    console.error('Failed to delete guild calendar event:', error)
    return false
  } finally {
    isSaving.value = false
  }
}

const loadCalendarPage = async () => {
  await Promise.all([loadGuildDetail(), reloadEvents()])
}

onMounted(async () => {
  updateViewportState()
  window.addEventListener('resize', updateViewportState)
  await loadCalendarPage()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportState)
})

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, listPlugin, interactionPlugin],
  locale: jaLocale,
  initialView: 'dayGridMonth',
  headerToolbar: calendarHeaderToolbar.value,
  buttonText: {
    today: '今日',
    dayGridMonth: '月',
    listWeek: '週リスト',
  },
  titleFormat: calendarTitleFormat.value,
  events: calendarEvents.value,
  eventClick: onEventClick,
  dateClick: onDateClick,
  datesSet: onDatesSet,
  editable: false,
  selectable: false,
  dayMaxEvents: isMobile.value ? 2 : true,
  nowIndicator: true,
  height: 'auto',
  contentHeight: isMobile.value ? 'auto' : undefined,
  fixedWeekCount: !isMobile.value,
  displayEventTime: !isMobile.value,
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
        subtitle="ギルドの共有予定をアプリ内で管理"
        description="Google 連携なしで、所属ギルドの共有予定を FullCalendar 上で確認できます。Guild Admin / Admin は予定の追加・更新・削除もこの画面で行えます。"
        icon="pi pi-calendar"
      >
        <template #actions>
          <RMButton
            label="再読み込み"
            width="170px"
            outline
            :isDisable="isLoadingEvents || Boolean(calendarBlocker)"
            @click="reloadEvents"
          />
          <RMButton
            v-if="canEditCalendar && !calendarBlocker"
            id="calendar-actions"
            label="予定を追加"
            width="170px"
            color="primary"
            :isDisable="isSaving || isLoadingEvents"
            @click="openCreateDialog()"
          />
        </template>
      </RMPageHeader>

      <div class="calendar-quick-bar">
        <span
          v-for="pill in statusPills"
          :key="pill.label"
          class="calendar-status-pill"
          :class="`calendar-status-pill--${pill.tone}`"
        >
          {{ pill.label }}
        </span>
      </div>

      <Card id="calendar-board" class="calendar-main-card calendar-anchor">
        <template #content>
          <div class="calendar-main-card__content">
            <div
              v-if="isLoadingGuild || (isLoadingEvents && calendarEvents.length === 0)"
              class="rm-state-card"
            >
              <ProgressSpinner strokeWidth="5" />
              <p class="rm-muted">カレンダーを読み込み中...</p>
            </div>

            <RMEmptyState
              v-else-if="calendarBlocker"
              icon="pi pi-calendar-times"
              :title="calendarBlocker.title"
              :message="calendarBlocker.message"
            />

            <template v-else>
              <div
                class="calendar-notice"
                :class="{ 'calendar-notice--editable': canEditCalendar }"
              >
                {{ sourceNotice }}
              </div>

              <div v-if="isLoadingEvents" class="rm-state-card">
                <ProgressSpinner strokeWidth="5" />
                <p class="rm-muted">共有予定を更新中...</p>
              </div>

              <template v-else>
                <div
                  class="calendar-frame"
                  :class="`calendar-frame--${calendarViewport}`"
                >
                  <p class="calendar-frame__hint">
                    {{ calendarHintText }}
                  </p>
                  <FullCalendar
                    :key="calendarLayoutKey"
                    :options="calendarOptions"
                  />
                </div>
                <div
                  v-if="calendarEvents.length === 0"
                  class="calendar-empty-inline"
                >
                  この表示範囲に予定はありません。
                  <template v-if="canEditCalendar">
                    右上の「予定を追加」から最初の共有予定を登録できます。
                  </template>
                </div>
              </template>
            </template>
          </div>
        </template>
      </Card>
    </div>

    <RMFloatingGuideButton
      v-if="guildDetail && !calendarBlocker"
      buttonAriaLabel="カレンダーの表示ガイドを開く"
      drawerHeader="表示ガイドと現在の状態"
      :drawerStyle="{ width: 'min(96vw, 34rem)' }"
    >
      <template #default="{ closeDrawer }">
        <div class="calendar-settings-drawer__content">
          <RMFlowGuide
            title="この画面で触る場所"
            description="月/週を切り替えながら共有予定を確認し、必要に応じて作成や更新へ進めます。"
            :items="calendarGuideItems"
            @select="closeDrawer"
          />

          <Card class="calendar-panel-card calendar-anchor">
            <template #content>
              <div class="calendar-panel-card__content">
                <div class="calendar-panel-card__title">現在の状態</div>

                <div class="calendar-status-pill-list">
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
                    <dt>所属ギルド</dt>
                    <dd>{{ guildName }}</dd>
                  </div>
                  <div class="calendar-status-list__row">
                    <dt>現在の権限</dt>
                    <dd>{{ calendarRoleLabel }}</dd>
                  </div>
                  <div class="calendar-status-list__row">
                    <dt>表示中の期間</dt>
                    <dd>{{ currentRangeText }}</dd>
                  </div>
                  <div class="calendar-status-list__row">
                    <dt>登録済み予定</dt>
                    <dd>{{ eventEntries.length }} 件</dd>
                  </div>
                </dl>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </RMFloatingGuideButton>
  </div>
</template>

<style lang="scss" scoped>
.calendar-panel-card,
.calendar-main-card {
  border-radius: 24px;
}

.calendar-anchor {
  scroll-margin-top: calc(var(--rm-header-height) + 28px);
}

.calendar-panel-card__content,
.calendar-main-card__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: clamp(16px, 2vw, 22px);
}

.calendar-quick-bar,
.calendar-settings-drawer__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.calendar-quick-bar {
  padding: 16px 18px;
  border: 1px solid rgba(75, 105, 130, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
}

.calendar-panel-card__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--rm-text);
}

.calendar-frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.calendar-frame__hint {
  margin: 0;
  color: var(--rm-text-soft);
  font-size: 0.92rem;
  line-height: 1.6;
}

.calendar-frame :deep(.fc) {
  width: 100%;
  min-width: 0;
}

.calendar-frame :deep(.fc-header-toolbar) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.calendar-frame :deep(.fc-toolbar-chunk) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.calendar-frame :deep(.fc-toolbar-title) {
  font-size: clamp(1rem, 2.6vw, 1.5rem);
  line-height: 1.25;
  word-break: keep-all;
}

.calendar-frame :deep(.fc-button-group) {
  display: inline-flex;
  flex-wrap: wrap;
}

.calendar-frame :deep(.fc-button) {
  min-height: 40px;
  padding: 0.55rem 0.82rem;
  font-size: 0.82rem;
}

.calendar-frame :deep(.fc-scrollgrid) {
  overflow: hidden;
  border-radius: 20px;
}

.calendar-frame :deep(.fc-view-harness) {
  min-height: 520px;
}

.calendar-frame :deep(.fc-daygrid-day-frame) {
  min-height: 96px;
}

.calendar-frame :deep(.fc-daygrid-event) {
  border-radius: 10px;
}

.calendar-frame :deep(.fc-daygrid-event .fc-event-main) {
  padding: 2px 4px;
}

.calendar-frame :deep(.fc-col-header-cell-cushion),
.calendar-frame :deep(.fc-daygrid-day-number) {
  padding: 6px;
  font-size: 0.84rem;
}

.calendar-frame :deep(.fc-event-title),
.calendar-frame :deep(.fc-list-event-title) {
  white-space: normal;
}

.calendar-status-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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

.calendar-notice {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(100, 116, 139, 0.1);
  color: #475569;
  font-weight: 600;
  line-height: 1.7;
}

.calendar-notice--editable {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.calendar-empty-inline {
  padding: 18px 8px 6px;
  text-align: center;
  color: var(--rm-text-soft);
  font-weight: 600;
  line-height: 1.7;
}

.calendar-status-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.calendar-status-list__row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 16px;
  align-items: start;
}

.calendar-status-list__row dt {
  color: var(--rm-text-soft);
  font-weight: 700;
}

.calendar-status-list__row dd {
  margin: 0;
  color: var(--rm-text);
  line-height: 1.7;
}

@media (max-width: 767px) {
  .calendar-status-list__row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .calendar-main-card__content,
  .calendar-panel-card__content {
    gap: 16px;
    padding: 16px;
  }

  .calendar-frame :deep(.fc-header-toolbar) {
    justify-content: space-between;
  }

  .calendar-frame :deep(.fc-toolbar-chunk) {
    justify-content: flex-start;
  }

  .calendar-frame :deep(.fc-toolbar-title) {
    text-align: center;
  }

  .calendar-frame :deep(.fc-view-harness) {
    min-height: 460px;
  }
}

@media (max-width: 767px) {
  .calendar-quick-bar {
    padding: 14px;
    border-radius: 20px;
  }

  .calendar-main-card__content,
  .calendar-panel-card__content {
    gap: 14px;
    padding: 14px;
  }

  .calendar-status-pill {
    min-height: 32px;
    padding: 0 12px;
    font-size: 0.8rem;
  }

  .calendar-notice {
    padding: 12px 14px;
    font-size: 0.92rem;
  }

  .calendar-empty-inline {
    padding: 14px 4px 2px;
    font-size: 0.92rem;
  }

  .calendar-frame {
    overflow: hidden;
  }

  .calendar-frame__hint {
    font-size: 0.86rem;
  }

  .calendar-frame :deep(.fc) {
    min-width: 0;
  }

  .calendar-frame :deep(.fc-header-toolbar) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'title title'
      'nav actions';
    align-items: center;
    gap: 10px;
  }

  .calendar-frame :deep(.fc-toolbar-chunk) {
    min-width: 0;
  }

  .calendar-frame :deep(.fc-toolbar-chunk:nth-child(1)) {
    grid-area: nav;
    justify-content: flex-start;
  }

  .calendar-frame :deep(.fc-toolbar-chunk:nth-child(2)) {
    grid-area: title;
    justify-content: center;
  }

  .calendar-frame :deep(.fc-toolbar-chunk:nth-child(3)) {
    grid-area: actions;
    justify-content: flex-end;
  }

  .calendar-frame :deep(.fc-toolbar-title) {
    font-size: 1rem;
    text-align: center;
  }

  .calendar-frame :deep(.fc-button-group) {
    width: auto;
    max-width: 100%;
  }

  .calendar-frame :deep(.fc-button) {
    min-height: 36px;
    padding: 0.42rem 0.6rem;
    font-size: 0.76rem;
  }

  .calendar-frame :deep(.fc-view-harness) {
    min-height: 380px;
  }

  .calendar-frame :deep(.fc-daygrid-day-frame) {
    min-height: 72px;
  }

  .calendar-frame :deep(.fc-col-header-cell-cushion),
  .calendar-frame :deep(.fc-daygrid-day-number) {
    padding: 4px;
    font-size: 0.74rem;
  }

  .calendar-frame :deep(.fc-event) {
    font-size: 0.72rem;
  }

  .calendar-frame :deep(.fc-list-event-time),
  .calendar-frame :deep(.fc-list-event-title) {
    font-size: 0.78rem;
  }
}
</style>
