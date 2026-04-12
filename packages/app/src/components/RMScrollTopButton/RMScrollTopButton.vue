<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import { scrollToTop } from 'src/helpers/scroll'

const route = useRoute()
const isVisible = ref(false)

let pageResizeObserver: ResizeObserver | null = null

const updateVisibility = () => {
	const scrollRoot = document.documentElement
	const scrollableHeight = scrollRoot.scrollHeight - window.innerHeight
	isVisible.value = scrollableHeight > 24
}

const scheduleVisibilityUpdate = () => {
	requestAnimationFrame(() => {
		updateVisibility()
	})
}

const onClickScrollTop = () => {
	scrollToTop(280)
}

watch(
	() => route.fullPath,
	async () => {
		await nextTick()
		scheduleVisibilityUpdate()
	}
)

onMounted(() => {
	scheduleVisibilityUpdate()
	window.addEventListener('resize', updateVisibility)

	pageResizeObserver = new ResizeObserver(() => {
		updateVisibility()
	})
	pageResizeObserver.observe(document.body)
	pageResizeObserver.observe(document.documentElement)
})

onUnmounted(() => {
	window.removeEventListener('resize', updateVisibility)
	pageResizeObserver?.disconnect()
})
</script>

<template>
	<div v-if="isVisible" class="rm-scroll-top-button">
		<Button
			icon="pi pi-arrow-up"
			aria-label="ページトップへ戻る"
			rounded
			class="rm-scroll-top-button__button"
			@click="onClickScrollTop"
		/>
	</div>
</template>

<style scoped lang="scss">
.rm-scroll-top-button {
	position: fixed;
	left: max(12px, env(safe-area-inset-left));
	bottom: max(16px, env(safe-area-inset-bottom));
	z-index: 40;
}

.rm-scroll-top-button__button {
	width: 48px;
	height: 48px;
	box-shadow: 0 14px 28px rgba(15, 23, 42, 0.22);
}

@media (max-width: 767px) {
	.rm-scroll-top-button {
		left: max(10px, env(safe-area-inset-left));
		bottom: max(12px, env(safe-area-inset-bottom));
	}

	.rm-scroll-top-button__button {
		width: 44px;
		height: 44px;
	}
}
</style>
