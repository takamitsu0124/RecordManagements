<script lang="ts" setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { hasAdmin, hasGuildId, globalLoginUserData, lacksGuildId } from 'src/boot/main'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useRouter } from 'vue-router'
import { notifyError } from 'src/composables/useAppNotifications'

const router = useRouter()

const registerGuild = () => {
	router.push({ name: 'RMGuildRegister' })
}

const registerUser = () => {
	router.push({ name: 'RMUserRegister' })
}

const goToSkillMasterAdmin = () => {
	router.push({ name: 'RMSkillMasterAdmin' })
}

const selectGuild = () => {
	if (!globalLoginUserData.value.guildId) {
		notifyError('所属ギルド情報が見つかりません。')
		return
	}

	router.push({
		name: 'RMGuildDetail',
		params: { guildId: globalLoginUserData.value.guildId },
	})
}

const goToUserEdit = () => {
	if (!globalLoginUserData.value.id) {
		notifyError('ユーザー情報が見つかりません。')
		return
	}

	router.push({
		name: 'RMUserEdit',
		params: { userId: globalLoginUserData.value.id },
	})
}

const homeActions = computed(() => {
	const actions = [
		{
			key: 'mypage',
			title: 'マイページ',
			description: 'プロフィールの確認や、所持スキル・画像管理へ進みます。',
			icon: 'edit',
			label: '開く',
			onClick: goToUserEdit,
		},
	]

	if (hasAdmin.value) {
		actions.unshift(
			{
				key: 'user-register',
				title: 'ユーザー登録',
				description: 'Admin が招待・作成フローを進めるための入口です。',
				icon: 'person_add',
				label: '登録する',
				onClick: registerUser,
			},
			{
				key: 'skill-master-admin',
				title: 'スキルマスター管理',
				description: 'skill_master の登録・更新と検索条件の整備を行います。',
				icon: 'edit_note',
				label: '管理する',
				onClick: goToSkillMasterAdmin,
			}
		)
	}

	if (lacksGuildId.value) {
		actions.push({
			key: 'guild-register',
			title: 'ギルド登録',
			description: 'まだ所属ギルドがない場合に、ギルド情報を作成します。',
			icon: 'add_home',
			label: '作成する',
			onClick: registerGuild,
		})
	}

	if (hasGuildId.value) {
		actions.push({
			key: 'guild-select',
			title: 'ギルドダッシュボード',
			description: 'ギルド情報やメンバー管理、今後の検索導線に進みます。',
			icon: 'touch_app',
			label: '表示する',
			onClick: selectGuild,
		})
	}

	return actions
})
</script>

<template>
	<div class="rm-page rm-page--top">
		<div class="rm-page-stack">
			<RMPageHeader
				title="ホーム"
				subtitle="主要操作を迷わず始められるように整理しています。"
				description="普段使う操作はカードでまとめ、保存や編集に進む前に目的が分かる導線に揃えています。"
				icon="pi pi-home"
			/>

			<div class="home-action-grid">
				<Card v-for="action in homeActions" :key="action.key" class="home-action-card">
					<template #content>
						<div class="home-action-card__content">
							<div class="home-action-card__icon">
								<RMIcon :name="action.icon" />
							</div>
							<div class="home-action-card__title">{{ action.title }}</div>
							<p class="home-action-card__description">{{ action.description }}</p>
							<Button :label="action.label" class="home-action-card__button" @click="action.onClick" />
						</div>
					</template>
				</Card>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.home-action-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 14px;
}

.home-action-card {
	height: 100%;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.home-action-card:hover {
	transform: translateY(-1px);
}

.home-action-card__content {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: clamp(16px, 2vw, 20px);
	gap: 12px;
}

.home-action-card__icon {
	display: grid;
	place-items: center;
	width: 60px;
	height: 60px;
	border-radius: 18px;
	background: linear-gradient(180deg, rgba(161, 194, 225, 0.26), rgba(75, 105, 130, 0.16));
	color: var(--rm-primary);
	font-size: 1.9rem;
}

.home-action-card__title {
	font-size: 1.15rem;
	font-weight: 700;
	color: var(--rm-text);
}

.home-action-card__description {
	margin: 0;
	flex: 1;
	line-height: 1.7;
	color: var(--rm-text-soft);
}

.home-action-card__button {
	width: 100%;
}

@media (min-width: 900px) {
	.home-action-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (min-width: 1280px) {
	.home-action-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
</style>
