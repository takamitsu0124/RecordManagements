<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { User, defaultUser } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMModeToggle from 'src/components/RMModeToggle/RMModeToggle.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'

const route = useRoute()
const router = useRouter()

const userId = ref<string | null>(null)
const user = ref<User>(defaultUser())
const originalUser = ref<User>(defaultUser())
const isLoading = ref(true)
const isEditMode = ref(false)
const errorMessage = ref<string | null>(null)

const situationOptions = ['現役', '隠居', '引退', '']

const affiliationDateStr = ref<string | null>(null)
const gameStartDateAtStr = ref<string | null>(null)
const birthDateAtStr = ref<string | null>(null)

const originalAffiliationDateStr = ref<string | null>(null)
const originalGameStartDateAtStr = ref<string | null>(null)
const originalBirthDateAtStr = ref<string | null>(null)

const cloneUser = (payload: User): User => ({
	...payload,
	contact: { ...payload.contact },
	skillRecord: JSON.parse(JSON.stringify(payload.skillRecord)),
	proficiencyLevel: JSON.parse(JSON.stringify(payload.proficiencyLevel)),
})

const dateToModel = (d: Date | null): string | null => {
	if (!d) return null
	const date = new Date(d)
	const year = date.getFullYear()
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const day = date.getDate().toString().padStart(2, '0')
	return `${year}/${month}/${day}`
}

const applyLoadedUser = (payload: User) => {
	const nextUser = cloneUser(payload)
	user.value = nextUser
	originalUser.value = cloneUser(payload)

	affiliationDateStr.value = dateToModel(nextUser.affiliationDate)
	gameStartDateAtStr.value = dateToModel(nextUser.gameStartDateAt)
	birthDateAtStr.value = dateToModel(nextUser.birthDateAt)

	originalAffiliationDateStr.value = affiliationDateStr.value
	originalGameStartDateAtStr.value = gameStartDateAtStr.value
	originalBirthDateAtStr.value = birthDateAtStr.value
}

const resetDraft = () => {
	user.value = cloneUser(originalUser.value)
	affiliationDateStr.value = originalAffiliationDateStr.value
	gameStartDateAtStr.value = originalGameStartDateAtStr.value
	birthDateAtStr.value = originalBirthDateAtStr.value
}

onMounted(async () => {
	userId.value = route.params.userId as string
	if (!userId.value) {
		errorMessage.value = 'ユーザーIDが指定されていません。'
		isLoading.value = false
		return
	}

	try {
		isLoading.value = true
		await dbUserModule.doc(userId.value).fetch()
		const fetchedUser = dbUserModule.doc(userId.value).data
		if (fetchedUser) {
			applyLoadedUser(fetchedUser)
		} else {
			errorMessage.value = '指定されたユーザーが見つかりませんでした。'
		}
	} catch (error) {
		errorMessage.value = 'ユーザー情報の取得中にエラーが発生しました。'
		console.error('Error fetching user detail:', error)
	} finally {
		isLoading.value = false
	}
})

const onSubmit = async () => {
	if (!userId.value) return

	await useSpinner(async () => {
		try {
			const updatedData: Partial<User> = {
				charaName: user.value.charaName,
				charaNameKana: user.value.charaNameKana,
				guildId: user.value.guildId,
				affiliationDate: affiliationDateStr.value ? new Date(affiliationDateStr.value) : null,
				affiliationNum: Number(user.value.affiliationNum),
				situation: user.value.situation,
				gameStartDateAt: gameStartDateAtStr.value ? new Date(gameStartDateAtStr.value) : null,
				contact: {
					email: user.value.contact.email,
					phone: user.value.contact.phone,
				},
				birthDateAt: birthDateAtStr.value ? new Date(birthDateAtStr.value) : null,
			}

			await dbUserModule.doc(userId.value).merge(updatedData)
			applyLoadedUser({
				...user.value,
				...updatedData,
				contact: updatedData.contact || user.value.contact,
			} as User)
			isEditMode.value = false
			notifySuccess('更新が完了しました。')
		} catch (error) {
			notifyError('更新に失敗しました。')
			console.error('Update failed:', error)
		}
	})
}

const onCancelEdit = () => {
	resetDraft()
	isEditMode.value = false
}

const onBack = () => {
	router.back()
}
</script>

<template>
	<div class="rm-page rm-page--top">
		<div v-if="isLoading" class="rm-state-card">
			<ProgressSpinner strokeWidth="5" />
			<p class="rm-muted">ユーザー情報を読み込み中...</p>
		</div>

		<div v-else-if="errorMessage" class="rm-state-card">
			<RMEmptyState
				icon="pi pi-exclamation-circle"
				title="ユーザー情報を表示できません"
				:message="errorMessage"
			>
				<template #actions>
					<RMButton label="戻る" color="primary" @click="onBack" />
				</template>
			</RMEmptyState>
		</div>

		<form v-else class="user-edit-form" @submit.prevent="onSubmit">
			<Card class="user-edit-card">
				<template #content>
					<div class="user-edit-card__content">
						<RMPageHeader
							title="マイプロフィール"
							:subtitle="user.charaName || 'プロフィール未設定'"
							:description="isEditMode ? '編集モードでは保存前に内容を確認し、そのまま同じ画面で反映できます。' : '通常は閲覧モードです。編集が必要なときだけ切り替えて入力欄を活性化します。'"
							icon="pi pi-user"
						>
							<template #actions>
								<RMModeToggle v-model="isEditMode" />
							</template>
						</RMPageHeader>

						<div v-if="!isEditMode" class="rm-inline-note">
							閲覧モードでは内容確認のみできます。変更したい場合は右上のトグルで編集モードに切り替えてください。
						</div>

						<Divider />

						<section>
							<div class="rm-section-title">基本情報</div>
							<div class="rm-form-grid rm-form-grid--two">
								<RMInput
									v-model="user.charaName"
									label="キャラクターネーム"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.charaNameKana"
									label="キャラクターネーム(カナ)"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.guildId"
									label="所属ギルドID"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.affiliationNum"
									label="所属No"
									type="number"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
							<div class="user-edit-form__field">
								<div class="user-edit-form__label">プレイヤー状況</div>
								<Dropdown
									v-model="user.situation"
									:options="situationOptions"
									placeholder="状況を選択"
									class="user-edit-form__dropdown"
									:disabled="!isEditMode"
								/>
							</div>
						</section>

						<Divider />

						<section>
							<div class="rm-section-title">日付情報</div>
							<div class="rm-form-grid rm-form-grid--three">
								<RMInput
									v-model="affiliationDateStr"
									label="ギルド所属日"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="gameStartDateAtStr"
									label="ゲーム開始日時"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="birthDateAtStr"
									label="誕生日"
									type="date"
									:date="true"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
						</section>

						<Divider />

						<section>
							<div class="rm-section-title">連絡先</div>
							<div class="rm-form-grid rm-form-grid--two">
								<RMInput
									v-model="user.contact.email"
									label="登録メールアドレス"
									type="email"
									shadow
									:disabled="!isEditMode"
								/>
								<RMInput
									v-model="user.contact.phone"
									label="登録電話番号"
									type="tel"
									shadow
									:disabled="!isEditMode"
								/>
							</div>
						</section>

						<div class="rm-actions user-edit-card__actions">
							<RMButton
								v-if="isEditMode"
								label="編集をやめる"
								color="grey-7"
								outline
								@click="onCancelEdit"
								width="160px"
							/>
							<RMButton v-else label="戻る" color="grey-7" outline @click="onBack" width="160px" />
							<RMButton
								v-if="isEditMode"
								label="保存"
								type="submit"
								color="primary"
								width="160px"
							/>
						</div>
					</div>
				</template>
			</Card>
		</form>
	</div>
</template>

<style lang="scss" scoped>
.user-edit-form {
	width: min(100%, 940px);
}

.user-edit-card__content {
	padding: clamp(16px, 2.2vw, 22px);
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.user-edit-card__content section {
	padding: 14px;
	border-radius: 18px;
	border: 1px solid #e2e8f0;
	background: rgba(248, 250, 252, 0.88);
}

.user-edit-form__field {
	margin-top: 14px;
}

.user-edit-form__label {
	margin-bottom: 8px;
	font-size: 0.95rem;
	font-weight: 700;
	color: #475569;
}

.user-edit-form__dropdown {
	width: 100%;
}

.user-edit-card__actions {
	margin-top: 4px;
}

@media (max-width: 767px) {
	.user-edit-card__content {
		padding: 16px;
	}

	.user-edit-card__content section {
		padding: 12px;
	}
}
</style>
