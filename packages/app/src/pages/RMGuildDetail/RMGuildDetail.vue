<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleButton from 'primevue/togglebutton'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@rm/db'
import { dbGuildModule } from '@rm/db/src/fireStore/Guild'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { AppRole, AppUser, Guild, User } from '@rm/types'
import { canManageGuildMembers, globalLoginUserData, hasAdmin } from 'src/boot/main'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
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

	return guildUsers.value
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
</script>

<template>
	<div class="rm-page rm-page--top">
		<div v-if="isLoading" class="rm-state-card">
			<ProgressSpinner strokeWidth="5" />
			<p class="rm-muted">ギルド情報を読み込み中...</p>
		</div>

		<div v-else-if="errorMessage" class="rm-state-card">
			<p class="rm-error">{{ errorMessage }}</p>
			<RMButton label="ホームに戻る" color="primary" @click="router.push('/')" />
		</div>

		<Card v-else-if="guildDetail" class="guild-detail-card">
			<template #content>
				<div class="guild-detail-card__content">
					<div class="guild-detail-card__header">
						<div>
							<div class="guild-detail-card__title">{{ guildDetail.guildName }}</div>
							<div class="guild-detail-card__id">ID: {{ guildDetail.id }}</div>
						</div>
						<ToggleButton
							v-model="isEditMode"
							onLabel="管理モード"
							offLabel="閲覧モード"
							onIcon="pi pi-pencil"
							offIcon="pi pi-eye"
							class="guild-detail-card__toggle"
							:disabled="!canManageGuildMembers"
						/>
					</div>

					<p v-if="!canManageGuildMembers" class="guild-detail-card__notice">
						この画面は閲覧専用です。メンバー承認・権限変更・ギルド編集は Guild
						Admin 以上が実行できます。
					</p>

					<p v-else class="guild-detail-card__notice guild-detail-card__notice--manager">
						{{ hasAdmin ? 'Admin はこのギルドのメンバー承認と権限変更を管理できます。' : 'Guild Admin は自ギルド内メンバーの承認と権限変更を管理できます。' }}
					</p>

					<Divider />

					<div class="guild-detail-grid">
						<div class="guild-detail-field">
							<div class="guild-detail-label">ギルド説明</div>
							<div>{{ guildDetail.guildMemo || '説明なし' }}</div>
						</div>
						<div class="guild-detail-field">
							<div class="guild-detail-label">状況</div>
							<div>{{ guildDetail.situation || '不明' }}</div>
						</div>
						<div class="guild-detail-field">
							<div class="guild-detail-label">創設日</div>
							<div>{{ formatGuildFoundingDate(guildDetail.guildFoundingDateAt) }}</div>
						</div>
						<div class="guild-detail-field">
							<div class="guild-detail-label">ゲーム内ギルドID</div>
							<div>{{ guildDetail.guildIdInGame || '未登録' }}</div>
						</div>
						<div class="guild-detail-field">
							<div class="guild-detail-label">公式メンバー数</div>
							<div>{{ guildDetail.officialMembers }}人</div>
						</div>
					</div>

					<Divider />

					<div>
						<div class="rm-section-title">承認済みメンバー</div>
						<div v-if="approvedMembers.length > 0" class="guild-member-list">
							<div
								v-for="member in approvedMembers"
								:key="member.uid"
								class="guild-member-item"
								:class="{ 'guild-member-item--editable': isEditMode }"
							>
								<button
									type="button"
									class="guild-member-item__profile"
									@click="goToPostSkill(member.uid)"
								>
									<div class="guild-member-item__icon">
										<RMIcon name="person" />
									</div>
									<div class="guild-member-item__body">
										<div class="guild-member-item__name">{{ member.displayName }}</div>
										<div class="guild-member-item__meta">
											<span class="guild-member-item__badge guild-member-item__badge--approved">
												承認済み
											</span>
											<span class="guild-member-item__badge">
												{{ roleLabels[member.role] }}
											</span>
											<span
												v-if="member.uid === globalLoginUserData.id"
												class="guild-member-item__badge guild-member-item__badge--self"
											>
												自分
											</span>
										</div>
									</div>
									<RMIcon
										v-if="isEditMode"
										name="arrow_forward_ios"
										class="guild-member-item__arrow"
									/>
								</button>

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
						<p v-else class="rm-muted">承認済みメンバーがいません。</p>
					</div>

					<Divider v-if="canManageGuildMembers" />

					<div v-if="canManageGuildMembers">
						<div class="rm-section-title">承認待ちメンバー</div>
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
								<div class="guild-member-item__profile guild-member-item__profile--static">
									<div class="guild-member-item__icon">
										<RMIcon name="pending" />
									</div>
									<div class="guild-member-item__body">
										<div class="guild-member-item__name">{{ member.displayName }}</div>
										<div class="guild-member-item__meta">
											<span class="guild-member-item__badge guild-member-item__badge--pending">
												承認待ち
											</span>
											<span class="guild-member-item__badge">
												{{ roleLabels[member.role] }}
											</span>
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
						<p v-else class="rm-muted">
							承認待ちメンバーはいません。`users.guildId` が一致していて
							`guildMember` に未登録のユーザーがここに表示されます。
						</p>
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
  width: min(100%, 860px);
  border-radius: 24px;
  overflow: hidden;
}

.guild-detail-card__content {
  padding: 28px;
}

.guild-detail-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.guild-detail-card__title {
  font-size: clamp(1.8rem, 4vw, 2.25rem);
  font-weight: 800;
  color: #1f2937;
}

.guild-detail-card__id {
  margin-top: 6px;
  color: #64748b;
}

.guild-detail-card__notice {
  margin-top: 16px;
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

.guild-detail-card__substate {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 16px 0;
}

.guild-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.guild-detail-field {
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.guild-detail-label {
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #475569;
}

.guild-member-list {
  display: grid;
  gap: 12px;
}

.guild-member-item {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.85);
  text-align: left;
}

.guild-member-item--pending {
  background: rgba(255, 251, 235, 0.88);
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

.guild-member-item__profile {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
}

.guild-member-item__profile--static {
  cursor: default;
}

.guild-member-item--editable .guild-member-item__profile {
  cursor: pointer;
}

.guild-member-item__icon,
.guild-member-item__arrow {
  color: #64748b;
}

.guild-member-item__body {
  flex: 1;
}

.guild-member-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.guild-member-item__badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
}

.guild-member-item__badge--approved {
  background: #dcfce7;
  color: #166534;
}

.guild-member-item__badge--pending {
  background: #fef3c7;
  color: #92400e;
}

.guild-member-item__badge--self {
  background: #dbeafe;
  color: #1d4ed8;
}

.guild-member-item__name {
  font-weight: 700;
  color: #1f2937;
}

.guild-member-item__management {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.guild-member-item__dropdown {
  width: min(240px, 100%);
}

.guild-detail-actions {
  margin-top: 24px;
}

@media (max-width: 767px) {
  .guild-detail-card__content {
    padding: 20px;
  }

  .guild-detail-card__toggle {
    width: 100%;
  }

  .guild-member-item__management {
    justify-content: stretch;
  }

  .guild-member-item__dropdown {
    width: 100%;
  }
}
</style>
