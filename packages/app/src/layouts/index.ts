import { computed } from 'vue'
import { globalLoginUserData, hasAdmin, hasGuildId, lacksGuildId } from 'src/boot/main'

export const menu = computed<{ name: string; url: string; isShow?: boolean }[]>(
	() => [
		{ name: 'ホーム', url: '/RMHome', isShow: true },
		{
			name: 'マイページ',
			url: globalLoginUserData.value.id
				? `/user/${globalLoginUserData.value.id}/edit`
				: '',
			isShow: globalLoginUserData.value.id !== '',
		},
		{
			name: 'ギルドダッシュボード',
			url: globalLoginUserData.value.guildId
				? `/RMGuildDetail/${globalLoginUserData.value.guildId}`
				: '',
			isShow: hasGuildId.value,
		},
		{ name: 'ユーザー登録', url: '/RMUserRegister', isShow: hasAdmin.value },
		{ name: 'スキルマスター管理', url: '/RMSkillMasterAdmin', isShow: hasAdmin.value },
		{ name: 'ギルド登録', url: '/RMGuildRegister', isShow: lacksGuildId.value },
		{ name: 'ログアウト', url: '', isShow: true },
	]
)
