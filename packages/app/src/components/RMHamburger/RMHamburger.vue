<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { activeMenu } from './RMHamburger';

/** メニュー項目の型定義 */
type Menu = { name: string; url: string }[];
/** プロパティ定義 */
const props = defineProps({
  menu: { type: Object as PropType<Menu>, required: true },
});
/** ハンバーガーopen,closeのv-model（スマホ用の場合のみ必須） */
const isOpen = defineModel<boolean>('isOpen');
/** isOpen trueになった時に長さが揃うようにcomputed */
const bar = computed(() => (isOpen.value ? '75%' : '52%'));

/** ログアウトボタンの表示非表示 */
const showLogout = ref<boolean>(false);

const router = useRouter();
/** emits定義 */
const emits = defineEmits(['menuClick', 'logout']);

/**
 * ルートが変わったときに、現在のページと一致するメニューにアンダーラインを引く
 * @param {Function} newRouteName - 新しいルート名
 */
watch(
  () => router.currentRoute.value.meta.pageTitle,
  (newRouteName) => {
    if (props.menu !== undefined) {
      console.log('sdfsdfsdf', newRouteName);
      activeMenu.value = String(newRouteName);
    }
  },
  { immediate: true }
);
/**
 * スマートフォン用メニュークリック時の処理
 * @param {Object} menu - クリックされたメニュー
 * @param {string} menu.name - メニュー名
 * @param {string} menu.url - メニューURL
 */
const spHandleClick = (menu: { name: string; url: string }) => {
  activeMenu.value = menu.name;
  menu.name === 'ログアウト' ? emits('logout') : emits('menuClick', menu);
  isOpen.value = false;
};
/**
 * PC用メニュークリック時の処理
 * @param {Object} menu - クリックされたメニュー
 * @param {string} menu.name - メニュー名
 * @param {string} menu.url - メニューURL
 */
const pcHandleClick = (menu: { name: string; url: string }) => {
  menu.name === 'ログアウト' ? emits('logout') : emits('menuClick', menu);
};
</script>

<template>
  <!-- スマホ用ハンバーガーメニューのボタン -->
  <div
    :class="['_hamburger_menu_btn', { active: isOpen }]"
    @click="isOpen = !isOpen"
  >
    <span></span>
    <span></span>
    <div class="_open_text">{{ isOpen ? '' : 'MENU' }}</div>
  </div>

  <!-- スマートフォン用のメニュー -->
  <div :class="['_menu_open', { show: isOpen }]" v-if="isOpen">
    <div class="_menu">
      <div
        v-for="(menu, index) in menu"
        :key="menu.name"
        @click="spHandleClick(menu)"
        :class="['_menu_item', { active: activeMenu === menu.name }]"
      >
        <div
          :class="{
            _menu_item_margin_bottom: index === 4 && activeMenu !== menu.name,
            _menu_item_margin_bottom_active:
              index === 4 && activeMenu === menu.name,
            _menu_item_margin_top: index === 5,
          }"
        >
          {{ menu.name }}
        </div>
        <div v-if="index === 4" class="_border_line"></div>
      </div>
    </div>
  </div>

  <!-- PC用のメニュー -->
  <div class="_pc_menu">
    <div
      class="_pc_menu_container"
      v-for="menu in menu"
      :key="menu.name"
      @click="pcHandleClick(menu)"
      @mouseover="menu.name === 'アカウント設定' ? (showLogout = true) : null"
      @mouseleave="menu.name === 'アカウント設定' ? (showLogout = false) : null"
    >
      <div
        v-if="menu.name !== 'ログアウト'"
        :class="{ _menu_hover: menu.name === 'アカウント設定' }"
      >
        {{ menu.name }}
      </div>
      <div class="_logout_btn" v-if="menu.name === 'アカウント設定'">
        <div
          v-if="showLogout && menu.name === 'アカウント設定'"
          @click.stop="pcHandleClick({ name: 'ログアウト', url: '' })"
        >
          ログアウト
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="sass" scoped>
/*ボタン外側※レイアウトによってpositionや形状は適宜変更してください*/
._hamburger_menu_btn
  position: relative
  width: 40px
  height: 40px
  cursor: pointer
  z-index: 1000 /* z-indexを追加してメニューの後ろに隠れないようにする */
/*ボタン内側*/
._hamburger_menu_btn span
  display: inline-block
  transition: all .4s
  position: absolute
  right: 5px
  height: 2px
  background-color: $primary
._hamburger_menu_btn span:nth-of-type(1)
  top: 5px
  width: 75%
._hamburger_menu_btn span:nth-of-type(2)
  top: 15px
  width: v-bind(bar)
/*activeクラスが付与されると線が回転して×に*/
._hamburger_menu_btn.active span:nth-of-type(1)
  top: 13px
  left: 1px
  transform: translateY(6px) rotate(-45deg)
  width: 90%
  height: 3px
  background: #fff
._hamburger_menu_btn.active span:nth-of-type(2)
  top: 25px
  left: 1px
  transform: translateY(-6px) rotate(45deg)
  width: 90%
  height: 3px
  background: #fff
._open_text
  position: absolute
  bottom: -2px
  left: 8%
  font-size: 12px
  color: $primary
  text-align: center
/* メニューのスタイル */
._menu_open
  position: fixed
  top: 0
  left: 0
  width: 100%
  height: 100%
  background-color: #333333
  opacity: 0
  transition: opacity 0.4s
/* メニューが開かれたときのスタイル */
._menu_open.show
  opacity: 1
  z-index: 999
._menu
  width: 100%
  margin-top: 65px
  padding-left: 80px
  display: grid
  gap: 30px
._menu_item
  font-size: 20px
  font-weight: bold
  color: #fff
  transition: 0.4s
._menu_item_margin_bottom
  margin-bottom: 40px
._menu_item_margin_bottom_active
  margin-bottom: 40px
  border-bottom: 1px solid $primary
._menu_item_margin_top
  margin-top: 10px
._menu_item.active
  color: $primary
  border-bottom: 1px solid $primary
  width: fit-content
._border_line
  position: absolute
  left: 50%
  width: calc(100% - 80px)
  transform: translateX(-50%)
  border-bottom: 1px solid white
._pc_menu
  display: none
@media screen and (min-width: 1154px)
  ._hamburger_menu_btn
    display: none
  ._menu_open
    display: none
  ._pc_menu
    display: flex
    justify-content: center
    align-items: center
    width: 100%
    gap: 30px
  ._pc_menu_container
    font-size: 14px
    color: $primary
    cursor: pointer
  ._menu_hover:hover + ._logout_btn
    display: block
  ._logout_btn
    position: relative
  ._logout_btn div
    position: absolute
    top: 0
    left: -15%
    width: 165px
    height: 45px
    background: linear-gradient(to bottom, rgb(0, 159, 225), rgb(0, 76, 182))
    color: #fff
    border: 1px solid #ccc
    padding: 10px
    z-index: 100
    cursor: pointer
</style>
