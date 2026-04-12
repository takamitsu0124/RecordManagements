<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import Panel from 'primevue/panel'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@rm/db'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { AppRole, AppUser, Guild, User } from '@rm/types'
import { canManageGuildMembers, globalLoginUserData, hasAdmin } from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import {
	notifyError,
	notifyInfo,
	notifySuccess,
} from 'src/composables/useAppNotifications'

const route = useRoute()
const router = useRouter()

const guildId = ref<string | string[] | null>(null)
const guildDetail = ref<Guild | null>(null)
const guildUsers = ref<AppUser[]>([])
const isLoading = ref(true)
const isMemberLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isEditMode = ref(false)
const roleDrafts = ref<Record<string, AppRole>>({})

type GuildUserRow = {
	uid: string
	displayName: string
	role: AppRole
	hasUserDocument: boolean
}

const currentGuildId = computed(() =>
	typeof guildId.value === 'string' ? guildId.value : ''
)

const canEditGuild = computed(() => canManageGuildMembers.value)

const guildScopedUsers = computed(() =>
	guildUsers.value.filter((user) => user.guildId === currentGuildId.value)
)

const roleOptions = computed(() => {
	if (hasAdmin.value) {
		return [
			{ label: 'Admin', value: 'admin' as AppRole },
			{ label: 'Guild Admin', value: 'guild_admin' as AppRole },
			{ label: 'Member', value: 'member' as AppRole },
		]
	}

	return [
		{ label: 'Guild Admin', value: 'guild_admin' as AppRole },
		{ label: 'Member', value: 'member' as AppRole },
	]
})

const roleLabels: Record<AppRole, string> = {
	admin: 'Admin',
	guild_admin: 'Guild Admin',
	member: 'Member',
}

const guildUsersByUid = computed(() => {
	return new Map(
		guildUsers.value
			.filter((user) => user.guildId === currentGuildId.value)
			.map((user) => [user.uid || user.id, user])
	)
})

const approvedMembers = computed<GuildUserRow[]>(() => {
	const guildMember = guildDetail.value?.guildMember ?? {}

	return Object.entries(guildMember)
		.map(([uid, member]) => {
			const appUser = guildUsersByUid.value.get(uid)

			return {
				uid,
				displayName: appUser?.displayName || member.name || '未設定',
				role: appUser?.role || 'member',
				hasUserDocument: Boolean(appUser),
			}
		})
		.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
})

const pendingMembers = computed<GuildUserRow[]>(() => {
	const guildMember = guildDetail.value?.guildMember ?? {}

	return guildScopedUsers.value
		.filter(
			(user) =>
				user.guildId === currentGuildId.value &&
				!(user.uid in guildMember) &&
				user.uid !== ''
		)
		.map((user) => ({
			uid: user.uid,
			displayName: user.displayName || '未設定',
			role: user.role,
			hasUserDocument: true,
		}))
		.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'))
})

const summaryItems = computed(() => [
	{
		label: '承認済みメンバー',
		value: `${approvedMembers.value.length}人`,
		icon: 'pi pi-check-circle',
		tone: 'approved',
	},
	{
		label: '承認待ち',
		value: `${pendingMembers.value.length}人`,
		icon: 'pi pi-clock',
		tone: 'pending',
	},
	{
		label: 'guildId 登録ユーザー',
		value: `${guildScopedUsers.value.length}人`,
		icon: 'pi pi-users',
		tone: 'users',
	},
	{
		label: '現在の表示モード',
		value: isEditMode.value && canManageGuildMembers.value ? '管理モード' : '閲覧モード',
		icon: isEditMode.value && canManageGuildMembers.value ? 'pi pi-pencil' : 'pi pi-eye',
		tone: 'mode',
	},
])

const managerGuide = computed(() =>
	hasAdmin.value
		? 'Admin は承認、権限変更、ギルド編集までこの画面から進められます。'
		: 'Guild Admin は自ギルドの承認と権限変更をこの画面から管理できます。'
)

const syncRoleDrafts = () => {
	const nextDrafts: Record<string, AppRole> = {}

	for (const user of guildUsers.value) {
		if (user.uid) {
			nextDrafts[user.uid] = user.role
		}
	}

	roleDrafts.value = nextDrafts
}

const updateLocalGuildMembers = (guildMember: Guild['guildMember']) => {
	if (!guildDetail.value) return

	guildDetail.value = {
		...guildDetail.value,
		guildMember,
		officialMembers: Object.keys(guildMember).length,
	}
}

const toLegacyRole = (role: AppRole): User['role'] => {
	return role === 'admin' ? '管理者' : 'エンドユーザー'
}

const loadGuildUsers = async () => {
	if (!currentGuildId.value) return

	isMemberLoading.value = true

	try {
		const guildUsersQuery = query(
			collection(db, 'users'),
			where('guildId', '==', currentGuildId.value)
		)
		const guildUsersSnapshot = await getDocs(guildUsersQuery)
		guildUsers.value = guildUsersSnapshot.docs.map((doc) => {
			const data = doc.data() as AppUser
			return {
				...data,
				id: data.id || doc.id,
				uid: data.uid || doc.id,
			}
		})
		syncRoleDrafts()
	} catch (error) {
		notifyError('ギルドメンバー管理情報の取得に失敗しました。')
		console.error('Error fetching guild users:', error)
	} finally {
		isMemberLoading.value = false
	}
}

onMounted(async () => {
	guildId.value = route.params.guildId
	if (!guildId.value) {
		errorMessage.value = 'ギルドIDが指定されていません。'
		isLoading.value = false
		notifyError(errorMessage.value)
		router.push('/')
		return
	}

	try {
		isLoading.value = true
		await dbGuildModule.doc(guildId.value as string).fetch()
		const fetchedGuild = dbGuildModule.doc(guildId.value as string).data

		if (fetchedGuild) {
			guildDetail.value = fetchedGuild as Guild
			await loadGuildUsers()
		} else {
			errorMessage.value = '指定されたギルドが見つかりませんでした。'
			notifyError(errorMessage.value)
			router.push('/')
		}
	} catch (error) {
		errorMessage.value = 'ギルド情報の取得中にエラーが発生しました。'
		notifyError(errorMessage.value)
		console.error('Error fetching guild detail:', error)
		router.push('/')
	} finally {
		isLoading.value = false
	}
})

const formatGuildFoundingDate = (date: Date | null) => {
	if (!date) return '不明'
	return new Intl.DateTimeFormat('ja-JP').format(date)
}

const goToEditGuild = () => {
	if (!canEditGuild.value) {
		notifyError('ギルド情報を編集する権限がありません。')
		return
	}

	if (guildId.value) {
		router.push({
			name: 'RMGuildEdit',
			params: { guildId: guildId.value as string },
		})
	} else {
		notifyError('編集するギルドのIDが見つかりません。')
	}
}

const goBack = () => {
	router.go(-1)
}

const goToPostSkill = (userId: string) => {
	if (!isEditMode.value) return

	if (guildId.value) {
		router.push({
			name: 'RMSkillPost',
			params: { guildId: guildId.value as string, userId },
		})
	}
}

const approveMember = async (member: GuildUserRow) => {
	if (!guildDetail.value || !currentGuildId.value) {
		notifyError('承認対象のギルド情報が見つかりません。')
		return
	}

	await useSpinner(async () => {
		try {
			const guildMember = {
				...guildDetail.value?.guildMember,
				[member.uid]: {
					name: member.displayName,
				},
			}

			await dbGuildModule.doc(currentGuildId.value).merge({
				guildMember,
				officialMembers: Object.keys(guildMember).length,
			})

			updateLocalGuildMembers(guildMember)
			notifySuccess(`${member.displayName} さんを承認しました。`)
		} catch (error) {
			notifyError('メンバー承認に失敗しました。')
			console.error('Approve member failed:', error)
		}
	})
}

const revokeApproval = async (member: GuildUserRow) => {
	if (!guildDetail.value || !currentGuildId.value) {
		notifyError('更新対象のギルド情報が見つかりません。')
		return
	}

	await useSpinner(async () => {
		try {
			const guildMember = { ...guildDetail.value?.guildMember }
			delete guildMember[member.uid]

			await dbGuildModule.doc(currentGuildId.value).merge({
				guildMember,
				officialMembers: Object.keys(guildMember).length,
			})

			updateLocalGuildMembers(guildMember)
			notifyInfo(`${member.displayName} さんを承認待ちに戻しました。`)
		} catch (error) {
			notifyError('承認状態の更新に失敗しました。')
			console.error('Revoke approval failed:', error)
		}
	})
}

const saveRole = async (member: GuildUserRow) => {
	const nextRole = roleDrafts.value[member.uid]
	if (!nextRole) {
		notifyError('更新するロールが選択されていません。')
		return
	}

	if (!hasAdmin.value && nextRole === 'admin') {
		notifyError('Guild Admin は Admin 権限を付与できません。')
		roleDrafts.value[member.uid] = member.role
		return
	}

	await useSpinner(async () => {
		try {
			await dbUsersModule.doc(member.uid).merge({ role: nextRole })

			const legacyUser = await dbUserModule.doc(member.uid).fetch({ force: true })
			if (legacyUser?.id) {
				await dbUserModule.doc(member.uid).merge({ role: toLegacyRole(nextRole) })
			}

			guildUsers.value = guildUsers.value.map((user) =>
				user.uid === member.uid ? { ...user, role: nextRole } : user
			)
			roleDrafts.value[member.uid] = nextRole
			notifySuccess(`${member.displayName} さんの権限を更新しました。`)
		} catch (error) {
			roleDrafts.value[member.uid] = member.role
			notifyError('権限の更新に失敗しました。')
			console.error('Update role failed:', error)
		}
	})
}

const canChangeRole = (member: GuildUserRow) => {
	if (!member.hasUserDocument) return false
	if (!hasAdmin.value && member.role === 'admin') return false
	return true
}

const roleSeverity = (role: AppRole) => {
	if (role === 'admin') return 'danger'
	if (role === 'guild_admin') return 'info'
	return 'secondary'
}
</script>

<template>
	<div class="rm-page rm-page--top">
		<div v-if="isLoading" class="rm-state-card">
			<ProgressSpinner strokeWidth="5" />
			<p class="rm-muted">ギルド情報を読み込み中...</p>
		</div>

		<div v-else-if="errorMessage" class="rm-state-card">
			<RMEmptyState
				icon="pi pi-exclamation-circle"
				title="ギルド情報を表示できません"
				:message="errorMessage"
			>
				<template #actions>
					<RMButton label="ホームに戻る" color="primary" @click="router.push('/')" />
				</template>
			</RMEmptyState>
		</div>

		<Card v-else-if="guildDetail" class="guild-detail-card">
			<template #content>
				<div class="guild-detail-card__content">
					<RMPageHeader
						:title="guildDetail.guildName"
						:subtitle="`ID: ${guildDetail.id}`"
						:description="isEditMode && canManageGuildMembers ? '管理モードでは承認・権限変更・メンバー導線をそのまま操作できます。' : '通常は閲覧モードです。管理権限がある場合のみトグルで管理モードへ切り替えられます。'"
						icon="pi pi-users"
					>
						<template #actions>
							<RMModeToggle
								v-model="isEditMode"
								onLabel="管理モード"
								offLabel="閲覧モード"
								:disabled="!canManageGuildMembers"
							/>
						</template>
					</RMPageHeader>

					<div class="guild-detail-hero">
						<div
							class="guild-detail-card__notice"
							:class="{ 'guild-detail-card__notice--manager': canManageGuildMembers }"
						>
							{{ canManageGuildMembers
								? managerGuide
								: 'この画面は閲覧専用です。メンバー承認・権限変更・ギルド編集は Guild Admin 以上が実行できます。' }}
						</div>

						<div class="guild-summary-grid">
							<div
								v-for="item in summaryItems"
								:key="item.label"
								class="guild-summary-card"
								:class="`guild-summary-card--${item.tone}`"
							>
								<div class="guild-summary-card__icon">
									<i :class="item.icon" />
								</div>
								<div class="guild-summary-card__body">
									<div class="guild-summary-card__label">{{ item.label }}</div>
									<div class="guild-summary-card__value">{{ item.value }}</div>
								</div>
							</div>
						</div>
					</div>

					<Divider />

					<div class="guild-detail-overview-grid">
						<Panel class="guild-overview-panel">
							<template #header>
								<div class="guild-panel-header">
									<div>
										<div class="guild-panel-header__title">ギルド概要</div>
										<div class="guild-panel-header__subtitle">
											運営に必要な基本情報を一覧で確認できます。
										</div>
									</div>
								</div>
							</template>
							<div class="guild-detail-grid">
								<div class="guild-detail-field guild-detail-field--memo">
									<div class="guild-detail-label">ギルド説明</div>
									<div class="guild-detail-value guild-detail-value--memo">
										{{ guildDetail.guildMemo || '説明なし' }}
									</div>
								</div>
								<div class="guild-detail-field">
									<div class="guild-detail-label">状況</div>
									<div class="guild-detail-value">{{ guildDetail.situation || '不明' }}</div>
								</div>
								<div class="guild-detail-field">
									<div class="guild-detail-label">創設日</div>
									<div class="guild-detail-value">
										{{ formatGuildFoundingDate(guildDetail.guildFoundingDateAt) }}
									</div>
								</div>
								<div class="guild-detail-field">
									<div class="guild-detail-label">ゲーム内ギルドID</div>
									<div class="guild-detail-value">
										{{ guildDetail.guildIdInGame || '未登録' }}
									</div>
								</div>
								<div class="guild-detail-field">
									<div class="guild-detail-label">公式メンバー数</div>
									<div class="guild-detail-value">{{ guildDetail.officialMembers }}人</div>
								</div>
							</div>
						</Panel>

						<Panel class="guild-overview-panel">
							<template #header>
								<div class="guild-panel-header">
									<div>
										<div class="guild-panel-header__title">運用メモ</div>
										<div class="guild-panel-header__subtitle">
											この画面で何ができるかを役割ごとに整理しています。
										</div>
									</div>
								</div>
							</template>
							<div class="guild-operations">
								<div class="guild-operations__item">
									<div class="guild-operations__title">閲覧モード</div>
									<p class="guild-operations__text">
										ギルド概要、承認状況、ロール構成を確認するためのモードです。
									</p>
								</div>
								<div class="guild-operations__item">
									<div class="guild-operations__title">管理モード</div>
									<p class="guild-operations__text">
										承認済みメンバーからスキル画面へ進み、承認や権限変更をまとめて行えます。
									</p>
								</div>
								<div class="guild-operations__item">
									<div class="guild-operations__title">アクセス範囲</div>
									<p class="guild-operations__text">
										{{ canManageGuildMembers
											? '現在の権限でこのギルドの運用操作が可能です。'
											: '現在の権限では閲覧のみ可能です。編集操作は表示されても実行できません。' }}
									</p>
								</div>
							</div>
						</Panel>
					</div>

					<Divider />

					<div class="guild-member-sections">
						<Panel class="guild-members-panel">
							<template #header>
								<div class="guild-panel-header">
									<div>
										<div class="guild-panel-header__title">承認済みメンバー</div>
										<div class="guild-panel-header__subtitle">
											現在運用中のメンバー一覧です。
										</div>
									</div>
									<Tag
										:value="`${approvedMembers.length}人`"
										severity="success"
										class="guild-panel-header__tag"
									/>
								</div>
							</template>
							<div class="guild-panel-note">
								管理モード中は各メンバーからスキル・熟練度の編集画面へ移動できます。
							</div>
							<div v-if="approvedMembers.length > 0" class="guild-member-list">
								<div
									v-for="member in approvedMembers"
									:key="member.uid"
									class="guild-member-item"
									:class="{ 'guild-member-item--editable': isEditMode }"
								>
									<div class="guild-member-item__main">
										<div class="guild-member-item__identity">
											<div class="guild-member-item__icon">
												<RMIcon name="person" />
											</div>
											<div class="guild-member-item__body">
												<div class="guild-member-item__head">
													<div class="guild-member-item__name">{{ member.displayName }}</div>
													<div class="guild-member-item__meta">
														<Tag value="承認済み" severity="success" />
														<Tag
															:value="roleLabels[member.role]"
															:severity="roleSeverity(member.role)"
														/>
														<Tag
															v-if="member.uid === globalLoginUserData.id"
															value="自分"
															severity="info"
														/>
													</div>
												</div>
												<div class="guild-member-item__subtext">
													{{ isEditMode && canManageGuildMembers
														? '管理モード中は、このメンバーのスキル・熟練度編集画面へ進めます。'
														: '承認済みメンバーとして運用対象に含まれています。' }}
												</div>
											</div>
										</div>
										<Button
											v-if="isEditMode && canManageGuildMembers"
											label="スキル管理"
											outlined
											severity="contrast"
											class="guild-member-item__link"
											@click="goToPostSkill(member.uid)"
										/>
									</div>

									<div v-if="canManageGuildMembers" class="guild-member-item__management">
										<Dropdown
											v-model="roleDrafts[member.uid]"
											:options="roleOptions"
											optionLabel="label"
											optionValue="value"
											placeholder="ロールを選択"
											class="guild-member-item__dropdown"
											:disabled="!canChangeRole(member)"
										/>
										<RMButton
											label="権限を保存"
											color="primary"
											width="140px"
											:isDisable="!canChangeRole(member) || roleDrafts[member.uid] === member.role"
											@click="saveRole(member)"
										/>
										<RMButton
											label="承認解除"
											flat
											color="grey"
											width="120px"
											@click="revokeApproval(member)"
										/>
									</div>
								</div>
							</div>
							<RMEmptyState
								v-else
								icon="pi pi-user-minus"
								title="承認済みメンバーがいません"
								message="guildMember に追加されると、この一覧に表示されます。"
							/>
						</Panel>

						<Panel v-if="canManageGuildMembers" class="guild-members-panel">
							<template #header>
								<div class="guild-panel-header">
									<div>
										<div class="guild-panel-header__title">承認待ちメンバー</div>
										<div class="guild-panel-header__subtitle">
											users.guildId はあるが guildMember に未登録のユーザーです。
										</div>
									</div>
									<Tag
										:value="`${pendingMembers.length}人`"
										severity="warn"
										class="guild-panel-header__tag"
									/>
								</div>
							</template>
							<div v-if="isMemberLoading" class="guild-detail-card__substate">
								<ProgressSpinner strokeWidth="5" style="width: 40px; height: 40px" />
								<p class="rm-muted">承認待ちメンバーを読み込み中...</p>
							</div>
							<div v-else-if="pendingMembers.length > 0" class="guild-member-list">
								<div
									v-for="member in pendingMembers"
									:key="member.uid"
									class="guild-member-item guild-member-item--pending"
								>
									<div class="guild-member-item__main">
										<div class="guild-member-item__identity">
											<div class="guild-member-item__icon guild-member-item__icon--pending">
												<RMIcon name="pending" />
											</div>
											<div class="guild-member-item__body">
												<div class="guild-member-item__head">
													<div class="guild-member-item__name">{{ member.displayName }}</div>
													<div class="guild-member-item__meta">
														<Tag value="承認待ち" severity="warn" />
														<Tag
															:value="roleLabels[member.role]"
															:severity="roleSeverity(member.role)"
														/>
													</div>
												</div>
												<div class="guild-member-item__subtext">
													ロールを確認してから承認すると、そのまま運用対象に追加されます。
												</div>
											</div>
										</div>
									</div>

									<div class="guild-member-item__management">
										<Dropdown
											v-model="roleDrafts[member.uid]"
											:options="roleOptions"
											optionLabel="label"
											optionValue="value"
											placeholder="ロールを選択"
											class="guild-member-item__dropdown"
											:disabled="!canChangeRole(member)"
										/>
										<RMButton
											label="権限を保存"
											color="primary"
											width="140px"
											:isDisable="!canChangeRole(member) || roleDrafts[member.uid] === member.role"
											@click="saveRole(member)"
										/>
										<RMButton
											label="承認"
											color="primary"
											width="120px"
											@click="approveMember(member)"
										/>
									</div>
								</div>
							</div>
							<RMEmptyState
								v-else
								icon="pi pi-check-circle"
								title="承認待ちメンバーはいません"
								message="新しく同じ guildId を持つユーザーが作成されると、ここに表示されます。"
							/>
						</Panel>
					</div>

					<div class="rm-actions guild-detail-actions">
						<RMButton label="戻る" flat color="grey" @click="goBack" />
						<RMButton
							label="ギルドを編集"
							color="primary"
							:isDisable="!canEditGuild"
							@click="goToEditGuild"
						/>
					</div>
				</div>
			</template>
		</Card>
	</div>
</template>

<style lang="scss" scoped>
.guild-detail-card {
  width: min(100%, 1180px);
}

.guild-detail-card__content {
  padding: clamp(16px, 2vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guild-detail-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guild-detail-card__notice {
  padding: 12px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #dbe4f0;
  color: #475569;
}

.guild-detail-card__notice--manager {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.guild-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.guild-summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.guild-summary-card__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(75, 105, 130, 0.12);
  color: var(--rm-primary);
  font-size: 1.2rem;
}

.guild-summary-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guild-summary-card__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748b;
}

.guild-summary-card__value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-summary-card--approved {
  border-color: #bbf7d0;
}

.guild-summary-card--pending {
  border-color: #fde68a;
}

.guild-summary-card--mode {
  border-color: #bfdbfe;
}

.guild-detail-overview-grid,
.guild-member-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.guild-overview-panel,
.guild-members-panel {
  height: 100%;
}

.guild-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.guild-panel-header__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-panel-header__subtitle {
  margin-top: 4px;
  color: #64748b;
  line-height: 1.5;
}

.guild-panel-note {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  line-height: 1.7;
}

.guild-detail-card__substate {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 16px 0;
}

.guild-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.guild-detail-field {
  padding: 12px 13px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.guild-detail-field--memo {
  grid-column: 1 / -1;
}

.guild-detail-label {
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.guild-detail-value {
  color: #1f2937;
  line-height: 1.7;
}

.guild-detail-value--memo {
  min-height: 64px;
}

.guild-operations {
  display: grid;
  gap: 12px;
}

.guild-operations__item {
  padding: 12px 13px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.88);
}

.guild-operations__title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #1f2937;
}

.guild-operations__text {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.guild-member-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.guild-member-item {
  display: grid;
  gap: 14px;
  padding: 13px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.92);
  text-align: left;
}

.guild-member-item--pending {
  background: rgba(255, 251, 235, 0.96);
  border-color: #fcd34d;
}

.guild-member-item--editable {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.guild-member-item--editable:hover,
.guild-member-item--pending:hover {
  transform: translateY(-1px);
  border-color: #a1c2e1;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
}

.guild-member-item__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.guild-member-item__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.guild-member-item__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 14px;
  background: #e2e8f0;
  color: #475569;
}

.guild-member-item__icon--pending {
  background: #fef3c7;
  color: #92400e;
}

.guild-member-item__body {
  flex: 1;
  min-width: 0;
}

.guild-member-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.guild-member-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guild-member-item__name {
  font-weight: 700;
  color: #1f2937;
}

.guild-member-item__subtext {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.6;
}

.guild-member-item__link {
  flex: 0 0 auto;
  min-width: 120px;
}

.guild-member-item__management {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-start;
}

.guild-member-item__dropdown {
  width: min(240px, 100%);
}

.guild-detail-actions {
  margin-top: 4px;
}

@media (max-width: 1023px) {
  .guild-member-item__main {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .guild-detail-card__content {
    padding: 16px;
  }

  .guild-member-list {
    grid-template-columns: 1fr;
  }

  .guild-member-item__identity {
    width: 100%;
  }

  .guild-member-item__link {
    width: 100%;
  }

  .guild-member-item__management {
    flex-direction: column;
    align-items: stretch;
  }

  .guild-member-item__dropdown {
    width: 100%;
  }
}
</style>
