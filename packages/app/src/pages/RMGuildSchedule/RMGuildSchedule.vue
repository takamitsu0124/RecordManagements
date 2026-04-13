<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Divider from 'primevue/divider'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, dbGuildModule, dbGuildScheduleResponsesModule } from '@rm/db'
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
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { notifyError, notifyInfo, notifySuccess } from 'src/composables/useAppNotifications'
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
const errorMessage = ref('')
const draftStatus = ref<GuildScheduleStatus | null>(null)
const draftNote = ref('')
const selectedDayPanelRef = ref<HTMLElement | null>(null)

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

const statusSeverity: Record<GuildScheduleStatus, 'success' | 'warn' | 'danger'> = {
	available: 'success',
	maybe: 'warn',
	unavailable: 'danger',
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
		.sort((left, right) => left.displayName.localeCompare(right.displayName, 'ja'))
})

const approvedMemberIds = computed(() => new Set(approvedMembers.value.map((member) => member.uid)))

const responseByUserId = computed(() => {
	return new Map(
		scheduleResponses.value
			.filter((response) => response.guildId === currentGuildId.value)
			.map((response) => [response.userId, response])
	)
})

const currentUserId = computed(() => globalLoginUserData.value.id || globalLoginUserData.value.uid)

const currentUserResponse = computed(() => {
	return currentUserId.value ? responseByUserId.value.get(currentUserId.value) || null : null
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

			const respondedCount = available.length + maybe.length + unavailable.length

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
				totalMembers > 0 ? `${respondedCount}/${totalMembers}人` : '対象メンバーなし',
			myStatus: myEntry?.status || null,
			myStatusLabel: myEntry ? statusLabels[myEntry.status] : '未回答',
		}
	})
})

const monthRowsByKey = computed(() => {
	return new Map(monthRows.value.map((row) => [row.key, row]))
})

const answeredDaysCount = computed(() => {
	return monthDays.value.filter((day) => currentUserResponse.value?.entries?.[day.key]).length
})

const respondedMemberCount = computed(() => {
	return approvedMembers.value.filter((member) =>
		monthDays.value.some((day) => responseByUserId.value.get(member.uid)?.entries?.[day.key])
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
		value: `${respondedMemberCount.value}/${approvedMembers.value.length || 0}人`,
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
			(item) => !(item.guildId === response.guildId && item.userId === response.userId)
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
	const guildUsersQuery = query(collection(db, 'users'), where('guildId', '==', guildId))
	const guildUsersSnapshot = await getDocs(guildUsersQuery)

	guildUsers.value = guildUsersSnapshot.docs.map((docSnapshot) => {
		const data = docSnapshot.data() as AppUser

		return {
			...data,
			id: data.id || docSnapshot.id,
			uid: data.uid || docSnapshot.id,
		}
	})
}

const loadScheduleResponses = async (guildId: string) => {
	const responsesQuery = query(
		collection(db, 'guild_schedule_responses'),
		where('guildId', '==', guildId)
	)
	const responsesSnapshot = await getDocs(responsesQuery)

	scheduleResponses.value = responsesSnapshot.docs.map((docSnapshot) => {
		const data = docSnapshot.data() as GuildScheduleResponse

		return {
			...data,
			id: data.id || docSnapshot.id,
		}
	})
}

const loadPageData = async (guildId: string) => {
	isLoading.value = true
	errorMessage.value = ''

	try {
		await dbGuildModule.doc(guildId).fetch({ force: true })
		const guild = dbGuildModule.doc(guildId).data || null

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
			error instanceof Error ? error.message : '日程調整データの取得に失敗しました。'
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

const shouldAutoScrollToSelectedDayPanel = () => {
	return typeof window !== 'undefined' && window.innerWidth <= 1180
}

const scrollToSelectedDayPanel = async () => {
	if (!shouldAutoScrollToSelectedDayPanel()) {
		return
	}

	await nextTick()
	selectedDayPanelRef.value?.scrollIntoView({
		behavior: 'smooth',
		block: 'start',
	})
}

const openDate = async (dateKey: string) => {
	selectedDateKey.value = dateKey
	await scrollToSelectedDayPanel()
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

	if (!currentGuildId.value || !currentUserId.value || !currentResponseDocId.value) {
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
			await dbGuildScheduleResponsesModule.doc(currentResponseDocId.value).merge({
				entries: nextEntries,
			})
		} else {
			await dbGuildScheduleResponsesModule.doc(currentResponseDocId.value).insert(nextPayload)
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

watch([selectedDateKey, currentUserResponse], syncDraftWithSelectedDate, { immediate: true })
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
					<RMButton label="ギルドへ戻る" width="180px" color="primary" @click="goToGuildDetail" />
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
						<RMButton label="今月" width="120px" outline @click="goToCurrentMonth" />
						<RMButton label="ギルドへ戻る" width="160px" flat color="grey" @click="goToGuildDetail" />
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
								<div class="schedule-month-toolbar__title">{{ formatMonthLabel(currentMonth) }}</div>
								<Button
									label="翌月"
									icon="pi pi-chevron-right"
									iconPos="right"
									outlined
									severity="secondary"
									@click="moveMonth(1)"
								/>
							</div>

							<div v-if="approvedMembers.length === 0" class="schedule-main-card__empty">
								<RMEmptyState
									icon="pi pi-users"
									title="集計対象の承認済みメンバーがいません"
									message="guildMember に登録済みのメンバーが増えると、ここで日程回答を集計できます。"
								/>
							</div>

							<div v-else class="schedule-content-grid">
								<Panel class="schedule-calendar-panel">
									<template #header>
										<div class="schedule-panel-header">
											<div>
												<div class="schedule-panel-header__title">月間集計カレンダー</div>
												<div class="schedule-panel-header__subtitle">
													日を選ぶと右側で自分の回答編集とメンバー内訳を確認できます。
												</div>
											</div>
											<Tag
												:value="`${approvedMembers.length}人で集計`"
												severity="info"
												class="schedule-panel-header__tag"
											/>
										</div>
									</template>

									<div class="schedule-weekday-grid">
										<span
											v-for="weekday in ['日', '月', '火', '水', '木', '金', '土']"
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
												'schedule-day-card--selected': selectedDateKey === day.key,
												'schedule-day-card--today': day.isToday,
												'schedule-day-card--weekend': day.isWeekend,
											}"
											@click="openDate(day.key)"
										>
											<div class="schedule-day-card__head">
												<div class="schedule-day-card__date">{{ day.dayNumber }}</div>
												<div class="schedule-day-card__weekday">{{ day.weekdayLabel }}</div>
											</div>
											<div class="schedule-day-card__counts">
												<span class="schedule-count-pill schedule-count-pill--success">
													可 {{ dayBreakdowns.get(day.key)?.available.length || 0 }}
												</span>
												<span class="schedule-count-pill schedule-count-pill--warn">
													未 {{ dayBreakdowns.get(day.key)?.maybe.length || 0 }}
												</span>
												<span class="schedule-count-pill schedule-count-pill--danger">
													不可 {{ dayBreakdowns.get(day.key)?.unavailable.length || 0 }}
												</span>
											</div>
											<Tag
												:value="monthRowsByKey.get(day.key)?.myStatusLabel || '未回答'"
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
								</Panel>

								<div ref="selectedDayPanelRef" class="schedule-editor-panel-anchor">
									<Panel class="schedule-editor-panel">
									<template #header>
										<div class="schedule-panel-header">
											<div>
												<div class="schedule-panel-header__title">選択日の回答と内訳</div>
												<div class="schedule-panel-header__subtitle">
													{{ formatFullDateLabel(selectedDateKey) }}
												</div>
											</div>
											<Tag
												:value="selectedResponseRateText"
												severity="contrast"
												class="schedule-panel-header__tag"
											/>
										</div>
									</template>

									<div class="schedule-editor-card">
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
												width="190px"
												color="primary"
												:isDisable="!canEditOwnResponse || isSaving"
												@click="saveOwnResponse"
											/>
											<RMButton
												label="回答をクリア"
												width="160px"
												outline
												:isDisable="!canEditOwnResponse || isSaving"
												@click="clearOwnResponse"
											/>
										</div>
										<p v-if="!canEditOwnResponse" class="schedule-editor-card__note">
											承認済みメンバー本人のみ、自分の回答を登録・更新できます。
										</p>
									</div>

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
											<div v-if="group.members.length === 0" class="schedule-breakdown-empty">
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
									</Panel>
								</div>
							</div>
						</div>
					</template>
				</Card>

				<Panel class="schedule-table-panel">
					<template #header>
						<div class="schedule-panel-header">
							<div>
								<div class="schedule-panel-header__title">日別一覧</div>
								<div class="schedule-panel-header__subtitle">
									一覧性を優先した表形式でも、日ごとの集計を見比べられます。
								</div>
							</div>
						</div>
					</template>

					<div class="rm-mobile-scroll">
							<DataTable :value="monthRows" responsiveLayout="scroll" class="schedule-table">
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
							<Column field="myStatusLabel" header="自分" style="min-width: 120px">
								<template #body="{ data }">
									<Tag
										:value="data.myStatusLabel"
										:severity="data.myStatus ? statusSeverity[data.myStatus] : 'secondary'"
									/>
								</template>
							</Column>
							<Column field="availableCount" header="参加可" style="min-width: 100px" />
							<Column field="maybeCount" header="未定" style="min-width: 100px" />
							<Column field="unavailableCount" header="参加不可" style="min-width: 120px" />
							<Column field="unansweredCount" header="未回答" style="min-width: 100px" />
							<Column field="responseRateText" header="回答状況" style="min-width: 120px" />
						</DataTable>
					</div>
				</Panel>
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
	background: linear-gradient(180deg, rgba(161, 194, 225, 0.18), rgba(255, 255, 255, 0.9));
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
	padding: 16px;
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
	background: linear-gradient(180deg, rgba(22, 163, 74, 0.08), rgba(255, 255, 255, 0.94));
}

.schedule-summary-card--mine {
	background: linear-gradient(180deg, rgba(75, 105, 130, 0.12), rgba(255, 255, 255, 0.94));
}

.schedule-summary-card--progress {
	background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(255, 255, 255, 0.94));
}

.schedule-summary-card--members {
	background: linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(255, 255, 255, 0.94));
}

.schedule-main-card__content {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.schedule-month-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
}

.schedule-month-toolbar__title {
	font-size: 1.1rem;
	font-weight: 700;
	color: var(--rm-text);
}

.schedule-main-card__empty {
	padding: 8px 0;
}

.schedule-content-grid {
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
	gap: 16px;
	align-items: start;
}

.schedule-panel-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	width: 100%;
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
	padding: 14px;
	border: 1px solid rgba(148, 163, 184, 0.24);
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.92);
	text-align: left;
	transition:
		transform 0.18s ease,
		border-color 0.18s ease,
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
	background: linear-gradient(180deg, rgba(161, 194, 225, 0.16), rgba(255, 255, 255, 0.94));
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

@media (max-width: 1180px) {
	.schedule-content-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 767px) {
	.schedule-weekday-grid,
	.schedule-day-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.schedule-weekday-grid {
		display: none;
	}

	.schedule-day-card {
		min-height: 122px;
	}

	.schedule-month-toolbar {
		align-items: stretch;
	}

	.schedule-month-toolbar :deep(.p-button) {
		width: 100%;
	}
}
</style>
