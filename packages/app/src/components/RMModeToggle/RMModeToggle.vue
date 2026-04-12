<script lang="ts" setup>
import { computed } from 'vue'
import ToggleButton from 'primevue/togglebutton'

const props = defineProps({
	modelValue: { type: Boolean, required: true },
	onLabel: { type: String, default: '編集モード' },
	offLabel: { type: String, default: '閲覧モード' },
	onIcon: { type: String, default: 'pi pi-pencil' },
	offIcon: { type: String, default: 'pi pi-eye' },
	disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void
}>()

const model = computed({
	get: () => props.modelValue,
	set: (value: boolean) => emit('update:modelValue', value),
})
</script>

<template>
	<ToggleButton
		v-model="model"
		:onLabel="onLabel"
		:offLabel="offLabel"
		:onIcon="onIcon"
		:offIcon="offIcon"
		:disabled="disabled"
		class="rm-mode-toggle"
	/>
</template>

<style lang="scss" scoped>
.rm-mode-toggle {
	min-width: 162px;
}
</style>
