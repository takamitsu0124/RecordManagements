<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RMUserWorkspace from 'src/components/RMUserWorkspace/RMUserWorkspace.vue'

const route = useRoute()
const router = useRouter()

const userId = computed(() =>
	typeof route.params.userId === 'string' ? route.params.userId : ''
)

const onBack = () => {
	router.back()
}
</script>

<template>
	<RMUserWorkspace
		:user-id="userId"
		page-title="マイページ"
		page-icon="pi pi-user"
		view-description="プロフィール、所持スキル、画像の登録内容を 1 画面で確認できます。変更が必要なときだけ編集モードに切り替えてください。"
		edit-description="プロフィール、所持スキル、画像順を 1 回の保存でまとめて更新できます。"
		back-label="戻る"
		@back="onBack"
	/>
</template>
