<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { dbGuildScheduleResponsesModule } from '@rm/db'
import {
  AppRole,
  AppUser,
  Guild,
  GuildScheduleResponse,
  GuildScheduleStatus,
  defaultGuildScheduleResponse,
} from '@rm/types'
import { globalLoginUserData, hasAdmin, hasGuildAdmin } from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMFlowGuide from 'src/components/RMFlowGuide/RMFlowGuide.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import {
  notifyError,
  notifyInfo,
  notifySuccess,
} from 'src/composables/useAppNotifications'
import {
  fetchGuild,
  fetchGuildScheduleResponses,
  fetchGuildUsers,
} from 'src/services/guildData'
import {
  addMonths,
  createMonthDate,
  formatDateKey,
  formatFullDateLabel,
  formatMonthLabel,
  getMonthDays,
} from './date'

type ApprovedMember = {
  uid: string
  displayName: string
  role: AppRole
}

type DayMemberItem = {
  uid: string
  displayName: string
  role: AppRole
  note: string
  isCurrentUser: boolean
}

type DayBreakdown = {
  key: string
  available: DayMemberItem[]
  maybe: DayMemberItem[]
  unavailable: DayMemberItem[]
  unanswered: DayMemberItem[]
  respondedCount: number
  totalMembers: number
}

type ScheduleTableRow = {
  key: string
  dateLabel: string
  availableCount: number
  maybeCount: number
  unavailableCount: number
  unansweredCount: number
  responseRateText: string
  myStatus: GuildScheduleStatus | null
  myStatusLabel: string
}

const route = useRoute()
const router = useRouter()

const guildDetail = ref<Guild | null>(null)
const guildUsers = ref<AppUser[]>([])
const scheduleResponses = ref<GuildScheduleResponse[]>([])
const currentMonth = ref(createMonthDate())
const selectedDateKey = ref(formatDateKey(new Date()))
const isLoading = ref(true)
const isSaving = ref(false)
const isMobile = ref(false)
const isTablet = ref(false)
const isCompactMobile = ref(false)
const errorMessage = ref('')
const draftStatus = ref<GuildScheduleStatus | null>(null)
const draftNote = ref('')
const isSelectedDayDialogVisible = ref(false)

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  guild_admin: 'Guild Admin',
  member: 'Member',
}

const statusLabels: Record<GuildScheduleStatus, string> = {
  available: '参加可',
  maybe: '未定',
  unavailable: '参加不可',
}

const compactStatusLabels: Record<GuildScheduleStatus, string> = {
  available: '可',
  maybe: '未',
  unavailable: '不可',
}

const statusSeverity: Record<
  GuildScheduleStatus,
  'success' | 'warn' | 'danger'
> = {
  available: 'success',
  maybe: 'warn',
  unavailable: 'danger',
}

const selectedDayGuideItems = [
  {
    title: '自分の回答を更新する',
    description:
      '参加可否とメモを選んで、その日だけを迷わず保存できます。',
    targetId: 'schedule-answer',
  },
  {
    title: '集計内訳を見る',
    description:
      '参加可・未定・参加不可・未回答をメンバー単位でそのまま確認できます。',
    targetId: 'schedule-breakdown',
  },
]

const updateViewportState = () => {
  const width = window.innerWidth
  isMobile.value = width < 768
  isTablet.value = width >= 768 && width < 1120
  isCompactMobile.value = width < 380
}

const currentGuildId = computed(() =>
  typeof route.params.guildId === 'string' ? route.params.guildId : ''
)

const guildUsersByUid = computed(() => {
  return new Map(
    guildUsers.value
      .filter((user) => user.guildId === currentGuildId.value && user.uid)
      .map((user) => [user.uid, user])
  )
})

const approvedMembers = computed<ApprovedMember[]>(() => {
  const guildMember = guildDetail.value?.guildMember ?? {}

  return Object.entries(guildMember)
    .map(([uid, member]) => {
      const appUser = guildUsersByUid.value.get(uid)

      return {
        uid,
        displayName: appUser?.displayName || member.name || '未設定',
        role: appUser?.role || 'member',
      }
    })
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'ja')
    )
})

const approvedMemberIds = computed(
  () => new Set(approvedMembers.value.map((member) => member.uid))
)

const responseByUserId = computed(() => {
  return new Map(
    scheduleResponses.value
      .filter((response) => response.guildId === currentGuildId.value)
      .map((response) => [response.userId, response])
  )
})

const currentUserId = computed(
  () => globalLoginUserData.value.id || globalLoginUserData.value.uid
)

const currentUserResponse = computed(() => {
  return currentUserId.value
    ? responseByUserId.value.get(currentUserId.value) || null
    : null
})

const currentResponseDocId = computed(() => {
  if (!currentGuildId.value || !currentUserId.value) {
    return ''
  }

  return `${currentGuildId.value}_${currentUserId.value}`
})

const canEditOwnResponse = computed(() => {
  return (
    currentGuildId.value !== '' &&
    currentUserId.value !== '' &&
    globalLoginUserData.value.guildId === currentGuildId.value &&
    approvedMemberIds.value.has(currentUserId.value)
  )
})

const canManageSchedule = computed(() => hasAdmin.value || hasGuildAdmin.value)

const monthDays = computed(() => getMonthDays(currentMonth.value))

const dayBreakdowns = computed(() => {
  return new Map(
    monthDays.value.map((day) => {
      const available: DayMemberItem[] = []
      const maybe: DayMemberItem[] = []
      const unavailable: DayMemberItem[] = []
      const unanswered: DayMemberItem[] = []

      for (const member of approvedMembers.value) {
        const entry = responseByUserId.value.get(member.uid)?.entries?.[day.key]
        const payload: DayMemberItem = {
          uid: member.uid,
          displayName: member.displayName,
          role: member.role,
          note: entry?.note || '',
          isCurrentUser: member.uid === currentUserId.value,
        }

        if (!entry) {
          unanswered.push(payload)
          continue
        }

        if (entry.status === 'available') {
          available.push(payload)
          continue
        }

        if (entry.status === 'unavailable') {
          unavailable.push(payload)
          continue
        }

        maybe.push(payload)
      }

      const respondedCount =
        available.length + maybe.length + unavailable.length

      return [
        day.key,
        {
          key: day.key,
          available,
          maybe,
          unavailable,
          unanswered,
          respondedCount,
          totalMembers: approvedMembers.value.length,
        } satisfies DayBreakdown,
      ]
    })
  )
})

const selectedDayBreakdown = computed(() => {
  return dayBreakdowns.value.get(selectedDateKey.value) || null
})

const selectedStatusGroups = computed(() => {
  const breakdown = selectedDayBreakdown.value

  return [
    {
      key: 'available',
      label: '参加可',
      severity: 'success' as const,
      members: breakdown?.available || [],
    },
    {
      key: 'maybe',
      label: '未定',
      severity: 'warn' as const,
      members: breakdown?.maybe || [],
    },
    {
      key: 'unavailable',
      label: '参加不可',
      severity: 'danger' as const,
      members: breakdown?.unavailable || [],
    },
    {
      key: 'unanswered',
      label: '未回答',
      severity: 'secondary' as const,
      members: breakdown?.unanswered || [],
    },
  ]
})

const monthRows = computed<ScheduleTableRow[]>(() => {
  return monthDays.value.map((day) => {
    const breakdown = dayBreakdowns.value.get(day.key)
    const myEntry = currentUserResponse.value?.entries?.[day.key]
    const totalMembers = breakdown?.totalMembers || 0
    const respondedCount = breakdown?.respondedCount || 0

    return {
      key: day.key,
      dateLabel: formatFullDateLabel(day.date),
      availableCount: breakdown?.available.length || 0,
      maybeCount: breakdown?.maybe.length || 0,
      unavailableCount: breakdown?.unavailable.length || 0,
      unansweredCount: breakdown?.unanswered.length || 0,
      responseRateText:
        totalMembers > 0
          ? `${respondedCount}/${totalMembers}人`
          : '対象メンバーなし',
      myStatus: myEntry?.status || null,
      myStatusLabel: myEntry ? statusLabels[myEntry.status] : '未回答',
    }
  })
})

const monthRowsByKey = computed(() => {
  return new Map(monthRows.value.map((row) => [row.key, row]))
})

const answeredDaysCount = computed(() => {
  return monthDays.value.filter(
    (day) => currentUserResponse.value?.entries?.[day.key]
  ).length
})

const respondedMemberCount = computed(() => {
  return approvedMembers.value.filter((member) =>
    monthDays.value.some(
      (day) => responseByUserId.value.get(member.uid)?.entries?.[day.key]
    )
  ).length
})

const bestAvailableDay = computed(() => {
  if (monthRows.value.length === 0) {
    return null
  }

  return monthRows.value.reduce<ScheduleTableRow | null>((best, row) => {
    if (!best || row.availableCount > best.availableCount) {
      return row
    }

    if (row.availableCount === best.availableCount && row.key < best.key) {
      return row
    }

    return best
  }, null)
})

const summaryItems = computed(() => [
  {
    label: '対象メンバー',
    value: `${approvedMembers.value.length}人`,
    tone: 'members',
  },
  {
    label: '回答済みメンバー',
    value: `${respondedMemberCount.value}/${
      approvedMembers.value.length || 0
    }人`,
    tone: 'progress',
  },
  {
    label: '自分の回答日数',
    value: `${answeredDaysCount.value}日`,
    tone: 'mine',
  },
  {
    label: '参加可が多い日',
    value: bestAvailableDay.value
      ? `${bestAvailableDay.value.dateLabel} (${bestAvailableDay.value.availableCount}人)`
      : '未集計',
    tone: 'available',
  },
])

const selectedResponseRateText = computed(() => {
  const breakdown = selectedDayBreakdown.value

  if (!breakdown) {
    return '0/0人'
  }

  return `${breakdown.respondedCount}/${breakdown.totalMembers}人`
})

const selectedDateLabel = computed(() =>
  selectedDateKey.value ? formatFullDateLabel(selectedDateKey.value) : '日付未選択'
)

const selectedDaySummaryItems = computed(() => {
  const breakdown = selectedDayBreakdown.value

  return [
    {
      key: 'response',
      label: '回答状況',
      value: selectedResponseRateText.value,
      tone: 'response',
    },
    {
      key: 'available',
      label: '参加可',
      value: `${breakdown?.available.length || 0}人`,
      tone: 'available',
    },
    {
      key: 'maybe',
      label: '未定',
      value: `${breakdown?.maybe.length || 0}人`,
      tone: 'maybe',
    },
    {
      key: 'unavailable',
      label: '参加不可',
      value: `${breakdown?.unavailable.length || 0}人`,
      tone: 'unavailable',
    },
    {
      key: 'unanswered',
      label: '未回答',
      value: `${breakdown?.unanswered.length || 0}人`,
      tone: 'unanswered',
    },
  ]
})

const selectedDayDialogStyle = computed(() => {
  if (isCompactMobile.value) {
    return { width: 'calc(100vw - 0.75rem)' }
  }

  if (isMobile.value) {
    return { width: 'calc(100vw - 1.5rem)' }
  }

  if (isTablet.value) {
    return { width: 'min(96vw, 52rem)' }
  }

  return { width: 'min(92vw, 68rem)' }
})

const getScheduleStatusLabel = (
  status: GuildScheduleStatus | null | undefined,
  options?: {
    emptyLabel?: string
    compactEmptyLabel?: string
  }
) => {
  if (!status) {
    return isCompactMobile.value
      ? options?.compactEmptyLabel || '未'
      : options?.emptyLabel || '未回答'
  }

  return isCompactMobile.value ? compactStatusLabels[status] : statusLabels[status]
}

const pageNotice = computed(() => {
  if (canEditOwnResponse.value) {
    return '日を選ぶと自分の回答を更新できます。集計とメンバー内訳は全員分を即時に見比べられます。'
  }

  return 'この画面は閲覧できますが、回答入力は承認済みギルドメンバー本人だけに限定されています。'
})

const managerNotice = computed(() => {
  if (!canManageSchedule.value) {
    return 'Guild Admin 以上は集計を見ながら日ごとの状況確認に使えます。'
  }

  return 'Admin / Guild Admin も他人の回答は上書きせず、閲覧と運用判断に集中できる設計です。'
})

const upsertLocalScheduleResponse = (response: GuildScheduleResponse) => {
  scheduleResponses.value = [
    ...scheduleResponses.value.filter(
      (item) =>
        !(item.guildId === response.guildId && item.userId === response.userId)
    ),
    response,
  ]
}

const syncDraftWithSelectedDate = () => {
  const entry = currentUserResponse.value?.entries?.[selectedDateKey.value]
  draftStatus.value = entry?.status || null
  draftNote.value = entry?.note || ''
}

const syncSelectedDateWithinMonth = () => {
  const availableDateKeys = monthDays.value.map((day) => day.key)

  if (availableDateKeys.length === 0) {
    selectedDateKey.value = ''
    return
  }

  if (availableDateKeys.includes(selectedDateKey.value)) {
    return
  }

  const todayKey = formatDateKey(new Date())
  selectedDateKey.value = availableDateKeys.includes(todayKey)
    ? todayKey
    : availableDateKeys[0]
}

const loadGuildUsers = async (guildId: string) => {
  guildUsers.value = await fetchGuildUsers(guildId)
}

const loadScheduleResponses = async (guildId: string) => {
  scheduleResponses.value = await fetchGuildScheduleResponses(guildId)
}

const loadPageData = async (guildId: string) => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const guild = await fetchGuild(guildId, { force: true })

    if (!guild) {
      throw new Error('指定されたギルドが見つかりません。')
    }

    guildDetail.value = guild
    await Promise.all([loadGuildUsers(guildId), loadScheduleResponses(guildId)])
  } catch (error) {
    guildDetail.value = null
    guildUsers.value = []
    scheduleResponses.value = []
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '日程調整データの取得に失敗しました。'
    notifyError(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}

const goToCurrentMonth = () => {
  currentMonth.value = createMonthDate()
}

const moveMonth = (amount: number) => {
  currentMonth.value = addMonths(currentMonth.value, amount)
}

const openDate = (dateKey: string) => {
  selectedDateKey.value = dateKey
  isSelectedDayDialogVisible.value = true
}

const goToGuildDetail = () => {
  if (!currentGuildId.value) {
    notifyError('ギルド情報が見つかりません。')
    return
  }

  router.push({
    name: 'RMGuildDetail',
    params: { guildId: currentGuildId.value },
  })
}

const saveOwnResponse = async () => {
  if (!canEditOwnResponse.value) {
    notifyError('自分の回答を更新できるのは承認済みメンバー本人だけです。')
    return
  }

  if (!draftStatus.value) {
    notifyError('参加可・未定・参加不可のいずれかを選択してください。')
    return
  }

  if (
    !currentGuildId.value ||
    !currentUserId.value ||
    !currentResponseDocId.value
  ) {
    notifyError('保存に必要なユーザー情報が不足しています。')
    return
  }

  isSaving.value = true

  try {
    const nextEntries = {
      ...(currentUserResponse.value?.entries || {}),
      [selectedDateKey.value]: {
        status: draftStatus.value,
        note: draftNote.value.trim(),
      },
    }

    const nextPayload: GuildScheduleResponse = currentUserResponse.value
      ? {
          ...currentUserResponse.value,
          entries: nextEntries,
          updatedAt: new Date(),
          updatedBy: currentUserId.value,
        }
      : {
          ...defaultGuildScheduleResponse(),
          id: currentResponseDocId.value,
          guildId: currentGuildId.value,
          userId: currentUserId.value,
          entries: nextEntries,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUserId.value,
          updatedBy: currentUserId.value,
        }

    if (currentUserResponse.value) {
      await dbGuildScheduleResponsesModule
        .doc(currentResponseDocId.value)
        .merge({
          entries: nextEntries,
        })
    } else {
      await dbGuildScheduleResponsesModule
        .doc(currentResponseDocId.value)
        .insert(nextPayload)
    }

    upsertLocalScheduleResponse(nextPayload)
    notifySuccess('自分の日程回答を保存しました。')
  } catch (error) {
    notifyError('日程回答の保存に失敗しました。')
    console.error('Save guild schedule response failed:', error)
  } finally {
    isSaving.value = false
  }
}

const clearOwnResponse = async () => {
  if (!canEditOwnResponse.value) {
    notifyError('自分の回答だけ削除できます。')
    return
  }

  if (!currentUserResponse.value?.entries?.[selectedDateKey.value]) {
    notifyInfo('この日の回答はまだ登録されていません。')
    return
  }

  if (!currentResponseDocId.value || !currentUserId.value) {
    notifyError('削除に必要な情報が不足しています。')
    return
  }

  isSaving.value = true

  try {
    const nextEntries = { ...currentUserResponse.value.entries }
    delete nextEntries[selectedDateKey.value]

    await dbGuildScheduleResponsesModule.doc(currentResponseDocId.value).merge({
      entries: nextEntries,
    })

    upsertLocalScheduleResponse({
      ...currentUserResponse.value,
      entries: nextEntries,
      updatedAt: new Date(),
      updatedBy: currentUserId.value,
    })
    notifyInfo('選択日の回答を削除しました。')
  } catch (error) {
    notifyError('回答の削除に失敗しました。')
    console.error('Clear guild schedule response failed:', error)
  } finally {
    isSaving.value = false
  }
}

watch(
  () => route.params.guildId,
  async (value) => {
    if (typeof value !== 'string' || value === '') {
      errorMessage.value = 'ギルドIDが指定されていません。'
      isLoading.value = false
      notifyError(errorMessage.value)
      return
    }

    await loadPageData(value)
  },
  { immediate: true }
)

watch(monthDays, syncSelectedDateWithinMonth, { immediate: true })

watch([selectedDateKey, currentUserResponse], syncDraftWithSelectedDate, {
  immediate: true,
})

onMounted(() => {
  updateViewportState()
  window.addEventListener('resize', updateViewportState)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportState)
})
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="rm-page-stack">
      <div v-if="isLoading" class="rm-state-card">
        <ProgressSpinner strokeWidth="5" />
        <p class="rm-muted">ギルド日程調整を読み込み中...</p>
      </div>

      <RMEmptyState
        v-else-if="errorMessage"
        icon="pi pi-calendar-times"
        title="ギルド日程調整を表示できません"
        :message="errorMessage"
      >
        <template #actions>
          <RMButton
            label="ギルドへ戻る"
            width="180px"
            color="primary"
            @click="goToGuildDetail"
          />
        </template>
      </RMEmptyState>

      <template v-else-if="guildDetail">
        <RMPageHeader
          :title="`${guildDetail.guildName} の日程調整`"
          :subtitle="formatMonthLabel(currentMonth)"
          description="日単位の回答をメンバーごとに集め、参加可・未定・参加不可の集計と内訳を同じ画面で確認できます。"
          icon="pi pi-calendar-plus"
        >
          <template #actions>
            <RMButton
              label="今月"
              :width="isMobile ? '100%' : '120px'"
              outline
              @click="goToCurrentMonth"
            />
            <RMButton
              :label="isCompactMobile ? '戻る' : 'ギルドへ戻る'"
              :width="isMobile ? '100%' : '160px'"
              flat
              color="grey"
              @click="goToGuildDetail"
            />
          </template>
        </RMPageHeader>

        <div class="schedule-notice-grid">
          <div class="schedule-notice-card schedule-notice-card--primary">
            {{ pageNotice }}
          </div>
          <div class="schedule-notice-card">
            {{ managerNotice }}
          </div>
        </div>

        <div class="schedule-summary-grid">
          <Card
            v-for="item in summaryItems"
            :key="item.label"
            class="schedule-summary-card"
            :class="`schedule-summary-card--${item.tone}`"
          >
            <template #content>
              <div class="schedule-summary-card__content">
                <div class="schedule-summary-card__label">{{ item.label }}</div>
                <div class="schedule-summary-card__value">{{ item.value }}</div>
              </div>
            </template>
          </Card>
        </div>

        <Card class="schedule-main-card">
          <template #content>
            <div class="schedule-main-card__content">
              <div class="schedule-month-toolbar">
                <Button
                  icon="pi pi-chevron-left"
                  label="前月"
                  outlined
                  severity="secondary"
                  @click="moveMonth(-1)"
                />
                <div class="schedule-month-toolbar__title">
                  {{ formatMonthLabel(currentMonth) }}
                </div>
                <Button
                  label="翌月"
                  icon="pi pi-chevron-right"
                  iconPos="right"
                  outlined
                  severity="secondary"
                  @click="moveMonth(1)"
                />
              </div>

              <div
                v-if="approvedMembers.length === 0"
                class="schedule-main-card__empty"
              >
                <RMEmptyState
                  icon="pi pi-users"
                  title="集計対象の承認済みメンバーがいません"
                  message="guildMember に登録済みのメンバーが増えると、ここで日程回答を集計できます。"
                />
              </div>

              <div v-else class="schedule-content-grid">
                <Panel id="schedule-calendar" class="schedule-calendar-panel">
                  <template #header>
                    <div class="schedule-panel-header">
                      <div>
                        <div class="schedule-panel-header__title">
                          月間集計カレンダー
                        </div>
                        <div class="schedule-panel-header__subtitle">
                          日を選ぶとポップアップで自分の回答編集とメンバー内訳を確認できます。
                        </div>
                      </div>
                      <div class="schedule-panel-header__actions">
                        <Tag
                          :value="`${approvedMembers.length}人で集計`"
                          severity="info"
                          class="schedule-panel-header__tag"
                        />
                        <Button
                          type="button"
                          :label="
                            isMobile ? '選択日の詳細' : '選択日の集計を開く'
                          "
                          outlined
                          severity="secondary"
                          @click="isSelectedDayDialogVisible = true"
                        />
                      </div>
                    </div>
                  </template>

                  <div class="schedule-selected-overview">
                    <div class="schedule-selected-overview__body">
                      <div class="schedule-selected-overview__label">選択中</div>
                      <div class="schedule-selected-overview__title">
                        {{ selectedDateLabel }}
                      </div>
                      <div class="schedule-selected-overview__meta">
                        {{ selectedResponseRateText }} / 自分
                        {{
                          getScheduleStatusLabel(
                            monthRowsByKey.get(selectedDateKey)?.myStatus,
                            {
                              compactEmptyLabel: '未',
                            }
                          )
                        }}
                      </div>
                    </div>
                    <Button
                      type="button"
                      :label="isMobile ? '詳細を見る' : 'ポップアップで詳細を見る'"
                      severity="contrast"
                      @click="isSelectedDayDialogVisible = true"
                    />
                  </div>

                  <p v-if="isMobile" class="schedule-calendar-frame__hint">
                    カレンダーは左右にスワイプできます。
                  </p>

                  <div class="schedule-calendar-frame">
                    <div class="schedule-calendar-grid">
                      <div class="schedule-weekday-grid">
                        <span
                          v-for="weekday in [
                            '日',
                            '月',
                            '火',
                            '水',
                            '木',
                            '金',
                            '土',
                          ]"
                          :key="weekday"
                          class="schedule-weekday-grid__item"
                        >
                          {{ weekday }}
                        </span>
                      </div>

                      <div class="schedule-day-grid">
                        <button
                          v-for="day in monthDays"
                          :key="day.key"
                          type="button"
                          class="schedule-day-card"
                          :class="{
                            'schedule-day-card--selected':
                              selectedDateKey === day.key,
                            'schedule-day-card--today': day.isToday,
                            'schedule-day-card--weekend': day.isWeekend,
                          }"
                          @click="openDate(day.key)"
                        >
                          <div class="schedule-day-card__head">
                            <div class="schedule-day-card__date">
                              {{ day.dayNumber }}
                            </div>
                            <div
                              v-if="!isCompactMobile"
                              class="schedule-day-card__weekday"
                            >
                              {{ day.weekdayLabel }}
                            </div>
                          </div>
                          <div class="schedule-day-card__counts">
                            <span
                              class="schedule-count-pill schedule-count-pill--success"
                            >
                              可
                              {{
                                dayBreakdowns.get(day.key)?.available.length || 0
                              }}
                            </span>
                            <span
                              class="schedule-count-pill schedule-count-pill--warn"
                            >
                              未 {{ dayBreakdowns.get(day.key)?.maybe.length || 0 }}
                            </span>
                            <span
                              class="schedule-count-pill schedule-count-pill--danger"
                            >
                              不可
                              {{
                                dayBreakdowns.get(day.key)?.unavailable.length || 0
                              }}
                            </span>
                          </div>
                          <Tag
                            :value="
                              getScheduleStatusLabel(
                                monthRowsByKey.get(day.key)?.myStatus,
                                {
                                  compactEmptyLabel: '未',
                                }
                              )
                            "
                            :severity="
                              monthRowsByKey.get(day.key)?.myStatus
                                ? statusSeverity[
                                    monthRowsByKey.get(day.key)?.myStatus || 'maybe'
                                  ]
                                : 'secondary'
                            "
                            class="schedule-day-card__tag"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </template>
        </Card>

        <Panel id="schedule-list" class="schedule-table-panel">
          <template #header>
            <div class="schedule-panel-header">
              <div>
                <div class="schedule-panel-header__title">日別一覧</div>
                <div class="schedule-panel-header__subtitle">
                  表形式でも日ごとの集計を見比べられ、日付を押すと同じ詳細ポップアップを開けます。
                </div>
              </div>
            </div>
          </template>

          <div v-if="isMobile" class="schedule-mobile-list">
            <button
              v-for="row in monthRows"
              :key="row.key"
              type="button"
              class="schedule-mobile-row"
              :class="{ 'schedule-mobile-row--selected': selectedDateKey === row.key }"
              @click="openDate(row.key)"
            >
              <div class="schedule-mobile-row__head">
                <div class="schedule-mobile-row__date-group">
                  <div class="schedule-mobile-row__date">{{ row.dateLabel }}</div>
                  <div class="schedule-mobile-row__meta">
                    <span class="schedule-mobile-row__meta-item">
                      回答 {{ row.responseRateText }}
                    </span>
                    <span
                      class="schedule-mobile-row__meta-item"
                      :class="
                        row.myStatus
                          ? `schedule-mobile-row__meta-item--${statusSeverity[row.myStatus]}`
                          : 'schedule-mobile-row__meta-item--secondary'
                      "
                    >
                      自分 {{ row.myStatusLabel }}
                    </span>
                  </div>
                </div>
                <span class="schedule-mobile-row__hint">詳細</span>
              </div>
              <div class="schedule-mobile-row__summary">
                <span
                  class="schedule-mobile-row__count schedule-mobile-row__count--success"
                >
                  可 {{ row.availableCount }}
                </span>
                <span
                  class="schedule-mobile-row__count schedule-mobile-row__count--warn"
                >
                  未 {{ row.maybeCount }}
                </span>
                <span
                  class="schedule-mobile-row__count schedule-mobile-row__count--danger"
                >
                  不 {{ row.unavailableCount }}
                </span>
                <span class="schedule-mobile-row__count">
                  未回 {{ row.unansweredCount }}
                </span>
              </div>
            </button>
          </div>

          <div v-else class="schedule-table-scroll rm-mobile-scroll">
            <DataTable
              :value="monthRows"
              responsiveLayout="scroll"
              class="schedule-table"
            >
              <Column field="dateLabel" header="日付" style="min-width: 160px">
                <template #body="{ data }">
                  <button
                    type="button"
                    class="schedule-table__date-link"
                    @click="openDate(data.key)"
                  >
                    {{ data.dateLabel }}
                  </button>
                </template>
              </Column>
              <Column
                field="myStatusLabel"
                header="自分"
                style="min-width: 120px"
              >
                <template #body="{ data }">
                  <Tag
                    :value="data.myStatusLabel"
                    :severity="
                      data.myStatus
                        ? statusSeverity[data.myStatus]
                        : 'secondary'
                    "
                  />
                </template>
              </Column>
              <Column
                field="availableCount"
                header="参加可"
                style="min-width: 100px"
              />
              <Column
                field="maybeCount"
                header="未定"
                style="min-width: 100px"
              />
              <Column
                field="unavailableCount"
                header="参加不可"
                style="min-width: 120px"
              />
              <Column
                field="unansweredCount"
                header="未回答"
                style="min-width: 100px"
              />
              <Column
                field="responseRateText"
                header="回答状況"
                style="min-width: 120px"
              />
            </DataTable>
          </div>
        </Panel>

        <Dialog
          v-model:visible="isSelectedDayDialogVisible"
          modal
          :draggable="false"
          dismissableMask
          :style="selectedDayDialogStyle"
          :breakpoints="{
            '1120px': '96vw',
            '820px': 'calc(100vw - 1.25rem)',
            '640px': 'calc(100vw - 1rem)',
          }"
          class="schedule-detail-dialog"
        >
          <template #header>
            <div class="schedule-dialog-header">
              <div>
                <div class="schedule-dialog-header__title">
                  {{ selectedDateLabel }} の詳細
                </div>
                <div
                  v-if="!isCompactMobile"
                  class="schedule-dialog-header__subtitle"
                >
                  自分の回答更新と当日の集計確認を同じポップアップで行えます。
                </div>
              </div>
              <div class="schedule-dialog-header__meta">
                <Tag :value="selectedResponseRateText" severity="contrast" />
                <Tag
                  :value="
                    getScheduleStatusLabel(
                      monthRowsByKey.get(selectedDateKey)?.myStatus,
                      {
                        compactEmptyLabel: '未',
                      }
                    )
                  "
                  :severity="
                    monthRowsByKey.get(selectedDateKey)?.myStatus
                      ? statusSeverity[
                          monthRowsByKey.get(selectedDateKey)?.myStatus || 'maybe'
                        ]
                      : 'secondary'
                  "
                />
              </div>
            </div>
          </template>

          <div id="schedule-answer" class="schedule-editor-panel-anchor">
            <RMFlowGuide
              v-if="!isCompactMobile"
              title="この日の確認フロー"
              description="まず自分の参加可否を更新し、そのまま集計内訳を見ると判断しやすくなります。"
              :items="selectedDayGuideItems"
            />

            <div class="schedule-dialog-grid">
              <div class="schedule-dialog-sidebar">
                <div class="schedule-surface-card schedule-editor-card">
                  <div class="schedule-editor-card__title">自分の回答</div>
                  <div class="schedule-editor-statuses">
                    <Button
                      v-for="status in ['available', 'maybe', 'unavailable']"
                      :key="status"
                      :label="statusLabels[status]"
                      :outlined="draftStatus !== status"
                      :severity="statusSeverity[status]"
                      :disabled="!canEditOwnResponse || isSaving"
                      class="schedule-editor-statuses__button"
                      @click="draftStatus = status"
                    />
                  </div>
                  <Textarea
                    v-model="draftNote"
                    rows="4"
                    autoResize
                    placeholder="補足が必要な場合だけメモを残せます。"
                    :disabled="!canEditOwnResponse || isSaving"
                    class="schedule-editor-card__textarea"
                  />
                  <div class="schedule-editor-card__actions">
                    <RMButton
                      :label="isSaving ? '保存中...' : 'この日の回答を保存'"
                      :width="isMobile ? '100%' : '190px'"
                      color="primary"
                      :isDisable="!canEditOwnResponse || isSaving"
                      @click="saveOwnResponse"
                    />
                    <RMButton
                      label="回答をクリア"
                      :width="isMobile ? '100%' : '160px'"
                      outline
                      :isDisable="!canEditOwnResponse || isSaving"
                      @click="clearOwnResponse"
                    />
                  </div>
                  <p
                    v-if="!canEditOwnResponse"
                    class="schedule-editor-card__note"
                  >
                    承認済みメンバー本人のみ、自分の回答を登録・更新できます。
                  </p>
                </div>

                <div class="schedule-surface-card">
                  <div class="schedule-surface-card__title">当日の集計</div>
                  <div class="schedule-day-summary-grid">
                    <div
                      v-for="item in selectedDaySummaryItems"
                      :key="item.key"
                      class="schedule-day-summary-card"
                      :class="`schedule-day-summary-card--${item.tone}`"
                    >
                      <div class="schedule-day-summary-card__label">
                        {{ item.label }}
                      </div>
                      <div class="schedule-day-summary-card__value">
                        {{ item.value }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="schedule-breakdown" class="schedule-breakdown-panel">
                <Divider />

                <div class="schedule-breakdown-list">
                  <div
                    v-for="group in selectedStatusGroups"
                    :key="group.key"
                    class="schedule-breakdown-section"
                  >
                    <div class="schedule-breakdown-section__head">
                      <Tag :value="group.label" :severity="group.severity" />
                      <span class="schedule-breakdown-section__count">
                        {{ group.members.length }}人
                      </span>
                    </div>
                    <div
                      v-if="group.members.length === 0"
                      class="schedule-breakdown-empty"
                    >
                      該当メンバーはいません。
                    </div>
                    <div v-else class="schedule-breakdown-members">
                      <div
                        v-for="member in group.members"
                        :key="`${group.key}-${member.uid}`"
                        class="schedule-breakdown-member"
                      >
                        <div class="schedule-breakdown-member__head">
                          <div class="schedule-breakdown-member__name">
                            {{ member.displayName }}
                          </div>
                          <div class="schedule-breakdown-member__meta">
                            <Tag
                              :value="roleLabels[member.role]"
                              severity="secondary"
                            />
                            <Tag
                              v-if="member.isCurrentUser"
                              value="自分"
                              severity="info"
                            />
                          </div>
                        </div>
                        <p
                          v-if="member.note"
                          class="schedule-breakdown-member__note"
                        >
                          {{ member.note }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.schedule-notice-grid,
.schedule-summary-grid {
  display: grid;
  gap: 14px;
}

.schedule-notice-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.schedule-notice-card {
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.2);
  line-height: 1.7;
  color: var(--rm-text-soft);
}

.schedule-notice-card--primary {
  background: linear-gradient(
    180deg,
    rgba(161, 194, 225, 0.18),
    rgba(255, 255, 255, 0.9)
  );
  color: var(--rm-text);
}

.schedule-summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.schedule-summary-card {
  height: 100%;
}

.schedule-summary-card__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: clamp(14px, 2vw, 16px);
}

.schedule-summary-card__label {
  font-size: 0.88rem;
  color: var(--rm-text-soft);
}

.schedule-summary-card__value {
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--rm-text);
  line-height: 1.5;
}

.schedule-summary-card--available {
  background: linear-gradient(
    180deg,
    rgba(22, 163, 74, 0.08),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-summary-card--mine {
  background: linear-gradient(
    180deg,
    rgba(75, 105, 130, 0.12),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-summary-card--progress {
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.12),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-calendar-panel,
.schedule-table-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  scroll-margin-top: calc(var(--rm-header-height) + 28px);
}

.schedule-calendar-panel :deep(.p-panel-content-container),
.schedule-table-panel :deep(.p-panel-content-container),
.schedule-calendar-panel :deep(.p-panel-content),
.schedule-table-panel :deep(.p-panel-content) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.schedule-calendar-panel :deep(.p-panel-content > *),
.schedule-table-panel :deep(.p-panel-content > *) {
  min-width: 0;
  max-width: 100%;
}

.schedule-summary-card--members {
  background: linear-gradient(
    180deg,
    rgba(59, 130, 246, 0.08),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-main-card__content {
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vw, 18px);
}

.schedule-calendar-frame {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.schedule-calendar-frame__hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--rm-text-soft);
}

.schedule-calendar-grid {
  min-width: 700px;
}

.schedule-month-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.schedule-month-toolbar > * {
  min-width: 0;
}

.schedule-month-toolbar__title {
  font-size: clamp(1rem, 2vw, 1.1rem);
  font-weight: 700;
  color: var(--rm-text);
  overflow-wrap: anywhere;
}

.schedule-main-card__empty {
  padding: 8px 0;
}

.schedule-content-grid {
  display: block;
  min-width: 0;
}

.schedule-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.schedule-panel-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.schedule-panel-header__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-panel-header__subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--rm-text-soft);
}

.schedule-panel-header__tag {
  flex-shrink: 0;
}

.schedule-editor-panel-anchor {
  scroll-margin-top: calc(var(--rm-header-height) + 20px);
}

.schedule-selected-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  padding: clamp(12px, 2vw, 16px);
  border-radius: 20px;
  box-sizing: border-box;
  background: rgba(241, 245, 249, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.schedule-selected-overview__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.schedule-selected-overview__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rm-text-soft);
}

.schedule-selected-overview__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rm-text);
  overflow-wrap: anywhere;
}

.schedule-selected-overview__meta {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--rm-text-soft);
  overflow-wrap: anywhere;
}

.schedule-detail-dialog :deep(.p-dialog-content) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schedule-weekday-grid,
.schedule-day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.schedule-weekday-grid {
  margin-bottom: 10px;
}

.schedule-weekday-grid__item {
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--rm-text-soft);
}

.schedule-day-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 134px;
  padding: clamp(12px, 2vw, 14px);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.schedule-day-card:hover {
  transform: translateY(-1px);
  border-color: rgba(75, 105, 130, 0.34);
}

.schedule-day-card--selected {
  border-color: rgba(75, 105, 130, 0.7);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.1);
}

.schedule-day-card--today {
  background: linear-gradient(
    180deg,
    rgba(161, 194, 225, 0.16),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-day-card--weekend {
  background-color: rgba(248, 250, 252, 0.98);
}

.schedule-day-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.schedule-day-card__date {
  font-size: 1.28rem;
  font-weight: 800;
  color: var(--rm-text);
}

.schedule-day-card__weekday {
  font-size: 0.82rem;
  color: var(--rm-text-soft);
}

.schedule-day-card__counts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schedule-count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.schedule-count-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.schedule-count-pill--warn {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.schedule-count-pill--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.schedule-day-card__tag {
  align-self: flex-start;
}

.schedule-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.schedule-dialog-header__title,
.schedule-surface-card__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-dialog-header__subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--rm-text-soft);
}

.schedule-dialog-header__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.schedule-dialog-grid {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.schedule-dialog-sidebar,
.schedule-breakdown-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.schedule-surface-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(14px, 2vw, 16px);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.schedule-editor-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-editor-card__title {
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-editor-statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.schedule-editor-statuses__button {
  flex: 1 1 110px;
}

.schedule-editor-card__textarea {
  width: 100%;
}

.schedule-editor-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.schedule-editor-card__note {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--rm-text-soft);
}

.schedule-day-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.schedule-day-summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(248, 250, 252, 0.96);
}

.schedule-day-summary-card__label {
  font-size: 0.8rem;
  color: var(--rm-text-soft);
}

.schedule-day-summary-card__value {
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-day-summary-card--response {
  background: linear-gradient(
    180deg,
    rgba(75, 105, 130, 0.12),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-day-summary-card--available {
  background: linear-gradient(
    180deg,
    rgba(22, 163, 74, 0.1),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-day-summary-card--maybe {
  background: linear-gradient(
    180deg,
    rgba(245, 158, 11, 0.12),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-day-summary-card--unavailable {
  background: linear-gradient(
    180deg,
    rgba(239, 68, 68, 0.1),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-day-summary-card--unanswered {
  background: linear-gradient(
    180deg,
    rgba(148, 163, 184, 0.12),
    rgba(255, 255, 255, 0.94)
  );
}

.schedule-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.schedule-breakdown-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.schedule-breakdown-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.schedule-breakdown-section__count,
.schedule-breakdown-empty {
  font-size: 0.86rem;
  color: var(--rm-text-soft);
}

.schedule-breakdown-members {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.schedule-breakdown-member {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.schedule-breakdown-member__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.schedule-breakdown-member__name {
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-breakdown-member__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-breakdown-member__note {
  margin: 8px 0 0;
  line-height: 1.6;
  color: var(--rm-text-soft);
  white-space: pre-wrap;
}

.schedule-table-panel {
  margin-top: 2px;
}

.schedule-table__date-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--rm-primary);
  font-weight: 700;
  cursor: pointer;
}

.schedule-table-scroll {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.schedule-table {
  width: max-content;
  min-width: 840px;
}

.schedule-table :deep(.p-datatable-wrapper),
.schedule-table :deep(.p-datatable-table-container) {
  width: auto;
  min-width: 100%;
  overflow: visible;
}

.schedule-table :deep(.p-datatable-table) {
  min-width: 100%;
  width: max-content;
  table-layout: auto;
}

.schedule-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-mobile-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.94);
  text-align: left;
}

.schedule-mobile-row--selected {
  border-color: rgba(75, 105, 130, 0.55);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.schedule-mobile-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.schedule-mobile-row__date-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.schedule-mobile-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-mobile-row__date {
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-mobile-row__meta-item,
.schedule-mobile-row__hint,
.schedule-mobile-row__count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--rm-text-soft);
}

.schedule-mobile-row__hint {
  flex-shrink: 0;
}

.schedule-mobile-row__meta-item,
.schedule-mobile-row__count {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.schedule-mobile-row__meta-item--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.schedule-mobile-row__meta-item--warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.schedule-mobile-row__meta-item--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.schedule-mobile-row__meta-item--secondary {
  background: rgba(148, 163, 184, 0.12);
}

.schedule-mobile-row__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schedule-mobile-row__count {
  font-weight: 700;
  color: var(--rm-text);
}

.schedule-mobile-row__count--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.schedule-mobile-row__count--warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.schedule-mobile-row__count--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

@media (min-width: 768px) and (max-width: 1119px) {
  .schedule-calendar-panel :deep(.p-panel-content),
  .schedule-table-panel :deep(.p-panel-content) {
    padding: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    overscroll-behavior-x: contain;
  }

  .schedule-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .schedule-main-card__content {
    gap: 16px;
  }

  .schedule-month-toolbar {
    align-items: stretch;
  }

  .schedule-panel-header,
  .schedule-panel-header__actions,
  .schedule-selected-overview,
  .schedule-dialog-header {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-dialog-header__meta {
    justify-content: flex-start;
  }

  .schedule-selected-overview :deep(.p-button),
  .schedule-panel-header__actions :deep(.p-button) {
    width: 100%;
  }

  .schedule-calendar-grid {
    min-width: 0;
    width: 100%;
  }

  .schedule-day-grid,
  .schedule-weekday-grid {
    gap: 8px;
  }

  .schedule-day-card {
    min-height: 118px;
    gap: 8px;
  }

  .schedule-day-card__date {
    font-size: 1.12rem;
  }

  .schedule-day-card__weekday,
  .schedule-count-pill {
    font-size: 0.74rem;
  }

  .schedule-dialog-grid {
    grid-template-columns: 1fr;
  }

  .schedule-day-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .schedule-calendar-panel :deep(.p-panel-content),
  .schedule-table-panel :deep(.p-panel-content) {
    padding: 12px;
    overflow-x: hidden;
  }

  .schedule-month-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'title title'
      'prev next';
    align-items: stretch;
  }

  .schedule-month-toolbar > :nth-child(1) {
    grid-area: prev;
  }

  .schedule-month-toolbar > :nth-child(2) {
    grid-area: title;
  }

  .schedule-month-toolbar > :nth-child(3) {
    grid-area: next;
  }

  .schedule-month-toolbar__title {
    text-align: center;
  }

  .schedule-dialog-grid {
    grid-template-columns: 1fr;
  }

  .schedule-selected-overview,
  .schedule-dialog-header,
  .schedule-panel-header,
  .schedule-panel-header__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-calendar-frame__hint {
    font-size: 0.78rem;
  }

  .schedule-selected-overview {
    gap: 10px;
    overflow: hidden;
  }

  .schedule-dialog-header__meta {
    justify-content: flex-start;
  }

  .schedule-calendar-grid {
    min-width: 0;
    width: 100%;
  }

  .schedule-weekday-grid,
  .schedule-day-grid {
    gap: 6px;
  }

  .schedule-weekday-grid__item {
    font-size: 0.74rem;
  }

  .schedule-day-card {
    min-height: 96px;
    padding: 8px 6px;
    gap: 6px;
  }

  .schedule-day-card__date {
    font-size: 1.04rem;
  }

  .schedule-day-card__weekday,
  .schedule-count-pill {
    font-size: 0.72rem;
  }

  .schedule-day-summary-grid {
    grid-template-columns: 1fr;
  }

  .schedule-editor-card__actions,
  .schedule-breakdown-section__head,
  .schedule-breakdown-member__head {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-selected-overview :deep(.p-button),
  .schedule-panel-header__actions :deep(.p-button) {
    width: 100%;
  }

  .schedule-month-toolbar :deep(.p-button),
  .schedule-selected-overview :deep(.p-button) {
    justify-content: center;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .schedule-table-scroll {
    margin: 0;
    padding: 0 0 6px;
  }

  .schedule-table :deep(.p-datatable-table) {
    min-width: 840px;
  }

  .schedule-month-toolbar :deep(.p-button) {
    width: 100%;
  }
}

@media (max-width: 379px) {
  .schedule-notice-card {
    padding: 14px;
    border-radius: 18px;
    font-size: 0.92rem;
  }

  .schedule-summary-grid {
    grid-template-columns: 1fr;
  }

  .schedule-summary-card__content,
  .schedule-surface-card {
    padding: 12px;
  }

  .schedule-panel-header__subtitle,
  .schedule-selected-overview__meta,
  .schedule-editor-card__note,
  .schedule-breakdown-member__note {
    font-size: 0.82rem;
  }

  .schedule-selected-overview {
    padding: 12px;
  }

  .schedule-selected-overview__body,
  .schedule-selected-overview :deep(.p-button) {
    width: 100%;
    max-width: 100%;
  }

  .schedule-selected-overview__title,
  .schedule-dialog-header__title,
  .schedule-surface-card__title {
    font-size: 0.94rem;
  }

  .schedule-detail-dialog :deep(.p-dialog-header),
  .schedule-detail-dialog :deep(.p-dialog-content) {
    padding-left: 12px;
    padding-right: 12px;
  }

  .schedule-calendar-grid {
    min-width: 0;
    width: 100%;
  }

  .schedule-table-scroll {
    margin: 0;
    padding: 0 0 6px;
  }

  .schedule-weekday-grid__item {
    font-size: 0.68rem;
  }

  .schedule-weekday-grid,
  .schedule-day-grid {
    gap: 4px;
  }

  .schedule-day-card {
    min-height: 78px;
    padding: 6px 4px;
    gap: 4px;
    border-radius: 14px;
  }

  .schedule-day-card__date {
    font-size: 0.96rem;
  }

  .schedule-day-card__counts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
  }

  .schedule-count-pill {
    justify-content: center;
    padding: 3px 2px;
    border-radius: 10px;
    font-size: 0.58rem;
  }

  .schedule-day-card__tag {
    width: 100%;
    align-self: stretch;
    justify-content: center;
    font-size: 0.62rem;
    padding: 0.18rem 0.35rem;
  }

  .schedule-editor-statuses__button {
    min-height: 34px;
    font-size: 0.74rem;
  }

  .schedule-day-summary-card {
    padding: 10px;
  }

  .schedule-day-summary-card__label {
    font-size: 0.74rem;
  }

  .schedule-breakdown-section {
    padding: 12px;
  }

  .schedule-table :deep(.p-datatable-table) {
    min-width: 840px;
  }

  .schedule-mobile-row {
    padding: 10px;
  }

  .schedule-mobile-row__head {
    gap: 8px;
  }
}
</style>
