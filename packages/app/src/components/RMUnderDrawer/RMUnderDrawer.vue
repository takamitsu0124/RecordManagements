<script lang="ts" setup>
import { PropType, computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean },
  scroll: { type: Boolean, default: false },
  height: { type: Number, default: 500 },
  /**背景色の変更 */
  backgroundColor: { type: String, default: '#FFFFFF' },
  /**閉じるボタンの配置 */
  isClosebutton: { type: Boolean, default: true },
  /** 全画面かどうか */
  isFull: { type: Boolean, default: false },
  /** ２層目 */
  secondLayer: { type: Boolean, default: false },
  /** トップに戻るキー */
  toTopKey: { type: Number, default: 0 },
  /** ドロワー種類 */
  kind: {
    type: String as PropType<'full' | 'second' | 'third' | ''>,
    default: '',
  },
  isSelect: { type: Boolean, default: false },
  isMaxGroup: { type: Boolean, default: false },
  isdrawerArea: { type: Boolean, default: false },
  isdrawerGraphrea: { type: Boolean, default: false },
})

const isTransitionRef = ref(true)

const isLong = ref(false)
const area = ref()
const isScrollLocal = ref(props.scroll)

const emit = defineEmits<{
  (e: 'update:modelValue', payload: boolean): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

watch(
  () => props.toTopKey,
  () => {
    nextTick(() => {
      if (!area.value?.$el) return
      area.value.$el.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    })
  }
)

// 下から出てくるレイアウト用
watch(value, (now) => {
  isTransitionRef.value = false

  if (now) {
    document.body.style.position = 'fixed'
  }
  // ２層目が開いた状態の時は、fixedを残したままにする
  if (props.kind === 'second') return

  // ２層目を閉じ、１層目も閉じた時にfixedを解除する
  if (!now) {
    isLong.value = false
    document.body.style.position = ''
  }
})
const drawerColor = ref(props.backgroundColor)

const windowheight = ref(window.innerHeight)
onMounted(() => {
  window.addEventListener('resize', () => {
    windowheight.value = window.innerHeight
  })
})

watch(
  () => [windowheight.value, props.height],
  () => {
    if (props.height > windowheight.value) {
      isScrollLocal.value = true
    }
  },
  {
    immediate: true,
  }
)

const heightRef = computed(() => {
  if (props.height > windowheight.value) {
    return 'calc(20px + ' + windowheight.value + 'px)'
  }
  return 'calc(20px + ' + props.height + 'px)'
})

const drawerClose = () => {
  value.value = false
}

//シリンダーグループを選択していない時の判定。trueの時にエラーを表示させる
// const isSelect = computed(() => props.isSelect)
</script>

<template>
  <!--  default overray -->
  <div id="overray" class="_overray" v-if="value" />

  <!--  second layer overray -->
  <div id="overray" class="_second_overray" v-if="kind === 'second' && value" />

  <!-- third layer overray -->
  <div id="overray" class="_third_overray" v-if="kind === 'third' && value" />

  <!--  default underDrawer -->

  <div
    :class="[
      '_drawer',
      { _preload: isTransitionRef },
      `${value ? '_open' : '_close'}`,
    ]"
    v-if="kind === ''"
  >
    <div
      :style="`position: fixed;  ${isScrollLocal ? 'overflow: scroll' : ''}`"
    >
      <div
        :class="{
          _drawer_grapharea: isdrawerGraphrea,
          _drawer_area: isdrawerArea,
        }"
      >
        <div class="_icon_area">
          <q-icon
            v-show="isClosebutton"
            @click="drawerClose()"
            class="_close_icon"
            name="close"
          />
        </div>
        <div style="max-width: 850px; margin: 0 auto; overflow: scroll">
          <slot name="default" />
        </div>
      </div>
    </div>
  </div>

  <!--  full display underDrawer -->

  <div v-if="kind === 'full'">
    <q-dialog position="bottom" v-model="value" :maximized="kind === 'full'">
      <q-card style="background: #f0f0f0; max-width: 850px" ref="area">
        <div class="_drawer_header">
          <div style="width: 93px; height: 40px"></div>
          <div :class="{ _selected_message: isSelect }" v-if="props.isSelect">
            {{
              isMaxGroup && isSelect
                ? 'グループが最大数登録されています。'
                : 'グループを選択してください。'
            }}
          </div>

          <div
            v-else
            class="_empty_area"
            :class="{ _empty_isFull: kind === 'full' }"
          ></div>

          <div
            class="_icon_area"
            :class="{ _full_disp_icon_area: kind === 'full' }"
          >
            <q-icon
              v-show="isClosebutton"
              @click="drawerClose()"
              class="_close_icon"
              name="close"
            ></q-icon>
          </div>
        </div>

        <div style="max-width: 850px; margin: 0 auto">
          <slot name="default" />
        </div>
      </q-card>
    </q-dialog>
  </div>

  <!--  second Layer underDrawer -->

  <div v-if="kind === 'second'">
    <div
      :class="[
        '_second_drawer',
        { _preload: isTransitionRef },
        `${value ? '_open' : '_close'}`,
      ]"
    >
      <div :style="`position: fixed;  ${scroll ? 'overflow: scroll' : ''}`">
        <div class="_drawer_area">
          <div class="_icon_area">
            <q-icon
              v-show="isClosebutton"
              @click="drawerClose()"
              class="_close_icon"
              name="close"
            ></q-icon>
          </div>

          <slot name="default" />
        </div>
      </div>
    </div>
  </div>

  <!--  third Layer underDrawer -->
  <div v-if="kind === 'third'">
    <div
      :class="[
        '_third_drawer',
        { _preload: isTransitionRef },
        `${value ? '_open' : '_close'}`,
      ]"
    >
      <div :style="`position: fixed;  ${scroll ? 'overflow: scroll' : ''}`">
        <div class="_drawer_area">
          <div class="_icon_area">
            <q-icon
              v-show="isClosebutton"
              @click="drawerClose()"
              class="_close_icon"
              name="close"
            ></q-icon>
          </div>

          <slot name="default" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._preload
  animation-duration: 0s !important
._icon_area
  width: 100%
  margin: 0 auto
  display: flex
  justify-content: flex-end
._full_disp_icon_area
  padding: 0 35px 0 0
  width: fit-content


@media screen and (max-width: 700px)
  ._icon_area
    width: 100%
    max-width: 850px
    display: flex
    justify-content: flex-end
    padding: 0 20px
  ._full_disp_icon_area
    padding: 0 20px 0 0
    width: fit-content
._close_icon
  font-size: 40px
  color: #707070
._drawer
  z-index: 555
  position: fixed
  bottom: 0%
  left: -10px
  width: 100%
  height: 100%
  animation-duration: 0.5s
  animation-timing-function: ease-fade-out
  animation-fill-mode: forwards
  animation-direction: alternate
  border-left: 10px solid #3C4D58
  overflow: hidden
  overscroll-behavior: none
  > div
    width: inherit
._second_drawer
  z-index: 666
  position: fixed
  bottom: 0%
  left: -10px
  width: 100%
  height: 100%
  animation-duration: 0.5s
  animation-timing-function: ease-fade-out
  animation-fill-mode: forwards
  animation-direction: alternate
  border-left: 10px solid #3C4D58
  overflow: hidden
  overscroll-behavior: none
  > div
    width: inherit
._third_drawer
  z-index: 777
  position: fixed
  bottom: 0%
  left: -10px
  width: 100%
  height: 100%
  animation-duration: 0.5s
  animation-timing-function: ease-fade-out
  animation-fill-mode: forwards
  animation-direction: alternate
  border-left: 10px solid #3C4D58
  overflow: hidden
  overscroll-behavior: none
  > div
    width: inherit
// ドロワーの外枠スタイル
._drawer_area
  display: block
  position: relative
  width: 100%
  max-width: 850px
  margin: 0 auto
  height: v-bind(heightRef)
  background: v-bind(drawerColor)
  border-top-left-radius: 20px
  border-top-right-radius: 20px
  z-index: 200
  padding: 20px 20px 20px 20px
  text-align: left
  overflow: scroll
._drawer_grapharea
  display: block
  position: relative
  width: 100%
  max-width: 850px
  margin: 0 auto
  background: v-bind(drawerColor)
  border-top-left-radius: 20px
  border-top-right-radius: 20px
  z-index: 200
  padding: 20px
  text-align: left
  overflow: scroll
._drawer_area_isFull
  display: block
  position: relative
  width: 100%
  height: v-bind(heightRef)
  background: v-bind(drawerColor)
  border-top-left-radius: 20px
  border-top-right-radius: 20px
  z-index: 300
._drawer_area_second_layer
  display: block
  position: relative
  width: 100%
  height: v-bind(heightRef)
  background: v-bind(drawerColor)
  border-top-left-radius: 20px
  border-top-right-radius: 20px
  z-index: 400
  padding: 20px

._drawer_header
  display: flex
  align-items: flex-end
  justify-content: space-around
  padding: 0 0 0 35px
  margin-top: calc(env(titlebar-area-y) + 10px)
  margin-top: calc(env(safe-area-inset-top) + 120px)
@media screen and (max-width: 700px)
  ._drawer_header
    display: flex
    align-items: flex-end
    justify-content: space-around
    padding: 0 0 0 20px
    margin-top: calc(env(titlebar-area-y) + 10px)
    margin-top: calc(env(safe-area-inset-top) + 120px)


._selected_message
  width: 100%
  font-size: 16px
  text-align: center
  color: red
  max-width: 1752px
._empty_area
  width: 247px
  text-align: center
  font-size: 16px
  max-width: 1752px
._empty_isFull
  width: 725px
  text-align: center
  font-size: 16px
  max-width: 1752px


._second_layer_card
  height: 500px
  overflow: hidden
  border-top-left-radius: 20px
  border-top-right-radius: 20px


._overray
  position: fixed
  top: 0
  left: 0
  width: 100%
  height: 100%
  z-index: 200
  background: rgba(0,0,0,0.35)
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden
._second_overray
  position: fixed
  top: 0
  left: 0
  width: 100%
  height: 100%
  z-index: 600
  background: rgba(0,0,0,0.35)
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden
._third_overray
  position: fixed
  top: 0
  left: 0
  width: 100%
  height: 100%
  z-index: 700
  background: rgba(0,0,0,0.35)
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden


._overray::-webkit-scrollbar
  display: none

._open
  animation-name: fadeUpAnime

._close
  animation-name: fadeOutAnime

@keyframes fadeUpAnime
  from
    height: 0
  to
    height: v-bind(heightRef)
@keyframes fadeOutAnime
  from
    height: v-bind(heightRef)
  to
    height: 0
</style>

<style lang="sass">
._drawer_area_second_layer
  .q-card > div:first-child,.q-card > img:first-child
    border-top-right-radius: 20px
    border-top-left-radius: 20px
</style>
