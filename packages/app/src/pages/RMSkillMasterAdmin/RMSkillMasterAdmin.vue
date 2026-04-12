<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { dbSkillMasterModule } from '@rm/db/src/fireStore/SkillMaster'
import { SkillMaster, defaultSkillMaster } from '@rm/types'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMEmptyState from 'src/components/RMEmptyState/RMEmptyState.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { notifyError, notifySuccess } from 'src/composables/useAppNotifications'

type SelectOption = {
	label: string
	value: string
}

const attrOptions: SelectOption[] = [
	{ label: '火', value: '火' },
	{ label: '水', value: '水' },
	{ label: '土', value: '土' },
	{ label: '聖', value: '聖' },
	{ label: '闇', value: '闇' },
	{ label: '風', value: '風' },
	{ label: '無', value: '無' },
]

const weaponBases = [
	'片手直剣',
	'細剣',
	'棍棒',
	'短剣',
	'斧',
	'槍',
	'弓',
	'盾',
]
const weaponVariants = ['覚醒', 'アクセル', 'MOD', 'コネクト', 'チェイン', 'リンク']
const abilityVariants = ['覚醒', 'アクセル', 'チェイン', 'リンク']

const typeOptions: SelectOption[] = [
	...weaponBases.flatMap((base) => [
		{ label: base, value: base },
		...weaponVariants.map((variant) => ({
			label: `${base} (${variant})`,
			value: `${base}(${variant})`,
		})),
	]),
	{ label: 'アビリティ', value: 'アビリティ' },
	...abilityVariants.map((variant) => ({
		label: `アビリティ (${variant})`,
		value: `アビリティ(${variant})`,
	})),
	{ label: 'バースト/フルバースト', value: 'バースト/フルバースト' },
	{ label: 'フリー', value: 'フリー' },
]

const skillMasterList = ref<SkillMaster[]>([])
const isLoading = ref(true)
const searchText = ref('')
const selectedAttr = ref('')
const selectedType = ref('')
const isEditMode = ref(false)
const form = ref<SkillMaster>(defaultSkillMaster())
const errorMessage = ref('')

const isEditingExisting = computed(() => isEditMode.value)
const skillCountLabel = computed(
	() => `${filteredSkillMasterList.value.length} / ${skillMasterList.value.length} 件`
)

const filteredSkillMasterList = computed(() => {
	const query = searchText.value.trim().toLowerCase()

	return skillMasterList.value.filter((skill) => {
		const matchesText =
			query === '' ||
			[skill.id, skill.name, skill.attr, skill.type].some((value) =>
				value.toLowerCase().includes(query)
			)

		const matchesAttr = selectedAttr.value === '' || skill.attr === selectedAttr.value
		const matchesType = selectedType.value === '' || skill.type === selectedType.value

		return matchesText && matchesAttr && matchesType
	})
})

const resetForm = () => {
	form.value = defaultSkillMaster()
	isEditMode.value = false
	errorMessage.value = ''
}

const loadSkillMaster = async () => {
	try {
		isLoading.value = true
		await dbSkillMasterModule.fetch()
		skillMasterList.value = Array.from(dbSkillMasterModule.data.values()).sort((a, b) =>
			a.name.localeCompare(b.name, 'ja')
		)
	} catch (error) {
		notifyError('スキルマスターの読み込みに失敗しました。')
		console.error('Failed to fetch skill master:', error)
	} finally {
		isLoading.value = false
	}
}

onMounted(async () => {
	await loadSkillMaster()
})

const startCreate = () => {
	resetForm()
}

const startEdit = (skill: SkillMaster) => {
	form.value = {
		...defaultSkillMaster(),
		...skill,
	}
	isEditMode.value = true
	errorMessage.value = ''
}

const validateForm = () => {
	const nextId = form.value.id.trim()
	const nextName = form.value.name.trim()

	if (!nextId || !nextName || !form.value.attr || !form.value.type) {
		return 'ID、名称、属性、種別は必須です。'
	}

	if (
		!isEditingExisting.value &&
		skillMasterList.value.some((skill) => skill.id === nextId)
	) {
		return '同じIDのスキルが既に存在します。'
	}

	return ''
}

const saveSkillMaster = async () => {
	errorMessage.value = validateForm()
	if (errorMessage.value) {
		notifyError(errorMessage.value)
		return
	}

	const payload: SkillMaster = {
		...defaultSkillMaster(),
		...form.value,
		id: form.value.id.trim(),
		name: form.value.name.trim(),
		attr: form.value.attr.trim(),
		type: form.value.type.trim(),
		cool: form.value.cool.trim(),
		swGauge: form.value.swGauge.trim(),
		brGauge: form.value.brGauge.trim(),
		image: form.value.image.trim(),
	}

	await useSpinner(async () => {
		try {
			if (isEditingExisting.value) {
				await dbSkillMasterModule.doc(payload.id).merge(payload)
				notifySuccess('スキルマスターを更新しました。')
			} else {
				await dbSkillMasterModule.doc(payload.id).insert(payload)
				notifySuccess('スキルマスターを登録しました。')
			}

			await loadSkillMaster()
			resetForm()
		} catch (error) {
			notifyError('スキルマスターの保存に失敗しました。')
			console.error('Failed to save skill master:', error)
		}
	})
}
</script>

<template>
	<div class="rm-page rm-page--top">
		<div class="skill-master-admin-layout">
			<Card class="skill-master-admin-card skill-master-admin-card--form">
				<template #content>
					<div class="skill-master-admin-card__content">
						<RMPageHeader
							title="スキルマスター管理"
							subtitle="Admin が skill_master を単体登録・更新するページです。"
							description="検索・登録・更新の導線を分け、DataTable 側と入力フォーム側で視線が迷わないようにしています。"
							icon="pi pi-database"
						>
							<template #actions>
								<Button
									label="新規入力"
									severity="secondary"
									outlined
									@click="startCreate"
								/>
							</template>
						</RMPageHeader>

						<Divider />

						<div class="skill-master-admin-form">
							<div class="skill-master-admin-field">
								<label class="skill-master-admin-label">ID *</label>
								<InputText
									v-model="form.id"
									:disabled="isEditingExisting"
									placeholder="skill-fire-sword-link-001"
								/>
							</div>

							<div class="skill-master-admin-field">
								<label class="skill-master-admin-label">名称 *</label>
								<InputText v-model="form.name" placeholder="スキル名" />
							</div>

							<div class="skill-master-admin-grid">
								<div class="skill-master-admin-field">
									<label class="skill-master-admin-label">属性 *</label>
									<Dropdown
										v-model="form.attr"
										:options="attrOptions"
										optionLabel="label"
										optionValue="value"
										placeholder="属性を選択"
									/>
								</div>

								<div class="skill-master-admin-field">
									<label class="skill-master-admin-label">種別 *</label>
									<Dropdown
										v-model="form.type"
										:options="typeOptions"
										optionLabel="label"
										optionValue="value"
										filter
										placeholder="種別を選択"
									/>
								</div>
							</div>

							<div class="skill-master-admin-grid skill-master-admin-grid--gauge">
								<div class="skill-master-admin-field">
									<label class="skill-master-admin-label">cool</label>
									<InputText v-model="form.cool" placeholder="15" />
								</div>
								<div class="skill-master-admin-field">
									<label class="skill-master-admin-label">swGauge</label>
									<InputText v-model="form.swGauge" placeholder="12" />
								</div>
								<div class="skill-master-admin-field">
									<label class="skill-master-admin-label">brGauge</label>
									<InputText v-model="form.brGauge" placeholder="24" />
								</div>
							</div>

							<div class="skill-master-admin-field">
								<label class="skill-master-admin-label">image</label>
								<InputText
									v-model="form.image"
									placeholder="https://example.com/skill.png"
								/>
								<img
									v-if="form.image"
									:src="form.image"
									alt="skill preview"
									class="skill-master-admin-image"
								/>
							</div>
						</div>

						<p v-if="errorMessage" class="skill-master-admin-error">
							{{ errorMessage }}
						</p>

						<div class="rm-actions">
							<RMButton label="入力をクリア" flat color="grey" @click="resetForm" />
							<RMButton
								:label="isEditingExisting ? '更新する' : '登録する'"
								color="primary"
								@click="saveSkillMaster"
							/>
						</div>
					</div>
				</template>
			</Card>

			<Card class="skill-master-admin-card skill-master-admin-card--table">
				<template #content>
					<div class="skill-master-admin-card__content">
						<RMPageHeader
							title="登録済みスキル"
							:subtitle="skillCountLabel"
							description="検索文字、属性、種別の 3 つで絞り込み、結果が 0 件でも状態が分かるようにしています。"
							icon="pi pi-search"
						/>

						<div class="skill-master-admin-filter-row rm-filter-toolbar">
							<InputText v-model="searchText" placeholder="ID・名称・属性・種別で検索" />
							<Dropdown
								v-model="selectedAttr"
								:options="attrOptions"
								optionLabel="label"
								optionValue="value"
								showClear
								placeholder="属性"
							/>
							<Dropdown
								v-model="selectedType"
								:options="typeOptions"
								optionLabel="label"
								optionValue="value"
								filter
								showClear
								placeholder="種別"
							/>
						</div>

						<div v-if="isLoading" class="skill-master-admin-loading">
							<ProgressSpinner strokeWidth="5" />
							<p class="rm-muted">スキルマスターを読み込み中...</p>
						</div>

						<DataTable
							v-else
							:value="filteredSkillMasterList"
							paginator
							:rows="15"
							responsiveLayout="scroll"
							class="skill-master-admin-table"
						>
							<template #empty>
								<RMEmptyState
									icon="pi pi-search"
									title="条件に一致するスキルがありません"
									message="検索文字や属性・種別を見直すと、結果がすぐに再表示されます。"
								/>
							</template>
							<Column field="id" header="ID" />
							<Column field="name" header="名称" />
							<Column field="attr" header="属性" />
							<Column field="type" header="種別" />
							<Column field="cool" header="cool" />
							<Column field="swGauge" header="swGauge" />
							<Column field="brGauge" header="brGauge" />
							<Column header="操作" style="width: 110px">
								<template #body="{ data }">
									<Button
										label="編集"
										severity="contrast"
										text
										@click="startEdit(data)"
									/>
								</template>
							</Column>
						</DataTable>
					</div>
				</template>
			</Card>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.skill-master-admin-layout {
	width: min(100%, 1320px);
	display: grid;
	grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
	gap: 16px;
	align-items: start;
}

.skill-master-admin-card {
	border-radius: 24px;
	overflow: hidden;
}

.skill-master-admin-card__content {
	padding: clamp(16px, 2vw, 20px);
}

.skill-master-admin-card__hero {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
}

.skill-master-admin-form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.skill-master-admin-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.skill-master-admin-grid--gauge {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.skill-master-admin-field {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.skill-master-admin-label {
	font-size: 0.92rem;
	font-weight: 700;
	color: #475569;
}

.skill-master-admin-image {
	margin-top: 8px;
	width: 100%;
	max-width: 200px;
	border-radius: 16px;
	border: 1px solid #dbe4f0;
	background: #f8fafc;
	object-fit: contain;
}

.skill-master-admin-error {
	margin-top: 14px;
	color: #dc2626;
	font-weight: 700;
}

.skill-master-admin-filter-row {
	display: grid;
	grid-template-columns: minmax(0, 1.6fr) minmax(120px, 180px) minmax(180px, 280px);
	gap: 12px;
	margin-bottom: 16px;
}

.skill-master-admin-loading {
	display: grid;
	justify-items: center;
	gap: 10px;
	padding: 18px 0;
}

@media (max-width: 1200px) {
	.skill-master-admin-layout {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 900px) {
	.skill-master-admin-filter-row {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 767px) {
	.skill-master-admin-card__hero {
		flex-direction: column;
	}

	.skill-master-admin-grid,
	.skill-master-admin-grid--gauge {
		grid-template-columns: 1fr;
	}
}
</style>
