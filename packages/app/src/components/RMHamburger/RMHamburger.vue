<script lang="ts" setup>
import { computed, PropType, useAttrs, watch } from 'vue'
import { useRoute } from 'vue-router'
import { activeMenu } from './RMHamburger'

defineOptions({
	inheritAttrs: false,
})

type Menu = { name: string; url: string; isShow: boolean }[]

const props = defineProps({
	menu: { type: Object as PropType<Menu>, required: true },
})

const route = useRoute()
const attrs = useAttrs()
const isOpen = defineModel<boolean>('isOpen')
const bar = computed(() => (isOpen.value ? '72%' : '54%'))
const emits = defineEmits(['menuClick', 'logout'])

const visibleMenus = computed(() => props.menu.filter((menu) => menu.isShow))

const syncActiveMenu = () => {
	const matchedMenu = visibleMenus.value.find(
		(menu) => menu.url && route.path.startsWith(menu.url)
	)
	const metaTitle = route.meta.pageTitle
	activeMenu.value =
		matchedMenu?.name || (typeof metaTitle === 'string' ? metaTitle : null)
}

watch(
	() => route.path,
	() => {
		syncActiveMenu()
	},
	{ immediate: true }
)

const spHandleClick = (menu: { name: string; url: string }) => {
	activeMenu.value = menu.name
	menu.name === 'ログアウト' ? emits('logout') : emits('menuClick', menu)
	isOpen.value = false
}

const pcHandleClick = (menu: { name: string; url: string; isShow: boolean }) => {
	menu.name === 'ログアウト' ? emits('logout') : emits('menuClick', menu)
}

const closeMenu = () => {
	isOpen.value = false
}
</script>

<template>
	<div
		:class="['_hamburger_menu_btn', attrs.class, { active: isOpen }]"
		@click="isOpen = !isOpen"
	>
		<span></span>
		<span></span>
		<div class="_open_text">{{ isOpen ? '' : 'MENU' }}</div>
	</div>

	<div v-if="isOpen" class="_menu_open" @click="closeMenu">
		<div class="_menu_panel" @click.stop>
			<div class="_menu_panel_title">メニュー</div>
			<div class="_menu">
				<button
					v-for="menu in visibleMenus"
					:key="menu.name"
					type="button"
					@click="spHandleClick(menu)"
					:class="[
						'_menu_item',
						{ active: activeMenu === menu.name, logout: menu.name === 'ログアウト' },
					]"
				>
					<span>{{ menu.name }}</span>
					<i v-if="menu.name !== 'ログアウト'" class="pi pi-chevron-right"></i>
				</button>
			</div>
		</div>
	</div>

	<div :class="['_pc_menu', attrs.class]">
		<button
			v-for="menu in visibleMenus"
			:key="menu.name"
			type="button"
			class="_pc_menu_container"
			:class="{ active: activeMenu === menu.name, logout: menu.name === 'ログアウト' }"
			@click="pcHandleClick(menu)"
		>
			{{ menu.name }}
		</button>
	</div>
</template>

<style lang="sass" scoped>
._hamburger_menu_btn
	position: relative
	width: 44px
	height: 44px
	cursor: pointer
	z-index: 1001
	border-radius: 14px
	border: 1px solid rgba(255, 255, 255, 0.2)
	background: rgba(255, 255, 255, 0.08)
	backdrop-filter: blur(12px)

._hamburger_menu_btn span
	display: inline-block
	transition: all .4s
	position: absolute
	right: 8px
	height: 2px
	background-color: white

._hamburger_menu_btn span:nth-of-type(1)
	top: 12px
	width: 64%

._hamburger_menu_btn span:nth-of-type(2)
	top: 21px
	width: v-bind(bar)

._hamburger_menu_btn.active span:nth-of-type(1)
	top: 16px
	left: 6px
	transform: translateY(6px) rotate(-45deg)
	width: 70%
	height: 3px
	background: #fff

._hamburger_menu_btn.active span:nth-of-type(2)
	top: 28px
	left: 6px
	transform: translateY(-6px) rotate(45deg)
	width: 70%
	height: 3px
	background: #fff

._open_text
	position: absolute
	bottom: 4px
	left: 50%
	transform: translateX(-50%)
	font-size: 9px
	color: rgba(255, 255, 255, 0.86)
	letter-spacing: 0.08em
	text-align: center

._menu_open
	position: fixed
	top: 0
	left: 0
	width: 100%
	height: 100%
	padding: calc(var(--rm-header-height) + 10px) 12px 16px
	display: flex
	justify-content: flex-end
	background: rgba(15, 23, 42, 0.24)
	backdrop-filter: blur(10px)
	z-index: 999

._menu_panel
	width: min(88vw, 340px)
	height: fit-content
	padding: 14px
	border-radius: 22px
	background: rgba(255, 255, 255, 0.96)
	border: 1px solid rgba(203, 213, 225, 0.9)
	box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16)

._menu_panel_title
	margin-bottom: 10px
	padding: 2px 4px 10px
	font-size: 13px
	font-weight: 800
	color: #475569

._menu
	display: grid
	gap: 8px

._menu_item
	display: flex
	align-items: center
	justify-content: space-between
	width: 100%
	padding: 14px 16px
	border: 1px solid transparent
	border-radius: 16px
	background: #f8fafc
	font-size: 15px
	font-weight: 700
	color: #1f2937
	transition: 0.2s ease
	cursor: pointer

._menu_item.active
	color: $primary
	background: rgba(191, 219, 254, 0.45)
	border-color: rgba(125, 165, 203, 0.6)

._menu_item.logout
	margin-top: 2px
	color: #b91c1c
	background: rgba(254, 242, 242, 0.9)

._pc_menu
	display: none

@media screen and (min-width: 1024px)
	._hamburger_menu_btn
		display: none
	._menu_open
		display: none
	._pc_menu
		display: flex
		justify-content: flex-end
		align-items: center
		flex-wrap: wrap
		gap: 8px
	._pc_menu_container
		padding: 9px 14px
		border-radius: 999px
		border: 1px solid rgba(255, 255, 255, 0.14)
		background: rgba(255, 255, 255, 0.06)
		font-size: 13px
		font-weight: 700
		color: white
		cursor: pointer
		transition: 0.2s ease
	._pc_menu_container.active
		background: rgba(255, 255, 255, 0.18)
		border-color: rgba(255, 255, 255, 0.28)
	._pc_menu_container.logout
		background: rgba(239, 68, 68, 0.16)
		border-color: rgba(239, 68, 68, 0.24)
	._pc_menu_container:hover
		transform: translateY(-1px)
		background: rgba(255, 255, 255, 0.14)

@media (max-width: 767px)
	._menu_open
		padding-right: 10px
		padding-left: 10px
	._menu_panel
		width: min(100%, 340px)
</style>
