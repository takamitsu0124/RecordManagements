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
		:userId="userId"
		pageTitle="マイページ"
		pageIcon="pi pi-user"
		backLabel="戻る"
		@back="onBack"
	/>
</template>
