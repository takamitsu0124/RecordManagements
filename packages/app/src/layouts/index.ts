import { computed } from 'vue'
import { globalLoginUserData, hasAdmin, hasGuildId, lacksGuildId } from 'src/boot/main'
import { googleCalendarPublicConfig } from 'src/config/googleCalendar'

const canOpenCalendar = computed(() => {
	return (
		(googleCalendarPublicConfig.enableGuildCalendar && hasGuildId.value) ||
		googleCalendarPublicConfig.enablePersonalCalendar
	)
})

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
		{
			name: 'ギルド日程調整',
			url: globalLoginUserData.value.guildId
				? `/guild/${globalLoginUserData.value.guildId}/schedule`
				: '',
			isShow: hasGuildId.value,
		},
		{ name: 'イベントカレンダー', url: '/RMCalendar', isShow: canOpenCalendar.value },
		{ name: 'ユーザー登録', url: '/RMUserRegister', isShow: hasAdmin.value },
		{ name: 'スキルマスター管理', url: '/RMSkillMasterAdmin', isShow: hasAdmin.value },
		{ name: 'ギルド登録', url: '/RMGuildRegister', isShow: lacksGuildId.value },
		{ name: 'ログアウト', url: '', isShow: true },
	]
)
