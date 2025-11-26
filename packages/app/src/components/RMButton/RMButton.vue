<script lang="ts" setup>
import { PropType, computed } from 'vue'
/** props定義 */
const props = defineProps({
  /**
   *@param standard 文字のみ
   *@param justIcon アイコンのみ（いるか？）
   *@param withIcon アイコンと文字
   *@param withImg 画像中央、下に文字
   *@param delete 削除ボタン
   *@param medal メダルボタン
   */
  buttonType: {
    type: String as PropType<
      'standard' | 'justIcon' | 'withIcon' | 'withImg' | 'delete' | 'medal'
    >,
    default: 'standard',
  },
  /** ボタンの高さ */
  buttonHeight: { type: String, default: '50px' },
  /** ボタン文字*/
  label: { type: String, default: 'ページ遷移します' },
  /** 形
   * @true 丸みをつける
   */
  buttonShape: { type: String as PropType<'round' | 'square' | 'ellipse'> },
  /**背景カラー*/
  bgColor: { type: String, default: '#707070' },
  /**ボタン文字カラー*/
  letterColor: { type: String, default: 'white' },
  /** 文字サイズ */
  letterSize: {
    type: String,
    default: '18px',
  },
  /**
   * @buttonTypeがjustIcon googleアイコンの名前を入力
   * @buttonTypeがjustImg imgのurl,パス
   * */
  imageUrlOrIconName: { type: String },
  /**アイコンカラー */
  iconColor: { type: String, default: 'white' },
  /** アイコンサイズ */
  iconSize: { type: String, default: '20px' },
  /**メダル、ゴミ箱サイズ */
  medalGarbageSize: { type: String, default: '30px' },
  /**文字　アイコンの位置 */
  contentPosition: { type: String as PropType<'center' | 'between'> },
  /**シャドウ */
  isShadow: { type: Boolean, default: false },
  /**メダルとゴミ箱の色を変更*/
  isMedalAndGarbageColor: {
    type: String as PropType<'grey' | 'blue' | 'white'>,
  },
  /**ボーダー */
  isBorder: { type: Boolean, default: false },
  /** disable */
  isDisable: { type: Boolean, default: false },
  /**google iconの素の書き方でしか実装できないケースに対応 */
  specialIcon: { type: Boolean, default: false },
  /** ボタンのタイプ (button, submit, reset) */
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button',
  },
})

const letterSize = computed(() => `${props.letterSize}`)
const smallLetterSize = computed(() => `${parseInt(letterSize.value) - 2}px`)
const microLetterSize = computed(() => `${parseInt(letterSize.value) - 4}px`)
const iconSize = computed(() => `${props.iconSize}`)
const svgSize = computed(() => `${props.medalGarbageSize}`)
const buttonHeight = computed(() => `${props.buttonHeight}`)

/**ボタンの形、アイコンのみの表示、シャドウの有無を調節 */
const changeButtonShape = () => {
  const array = []
  if (props.buttonShape === 'round') array.push('_button_shape_round')
  else if (props.buttonShape === 'ellipse') array.push('_button_shape_ellipse')
  else if (props.buttonShape === 'square') ''
  if (
    props.buttonType === 'justIcon' ||
    props.buttonType === 'delete' ||
    props.buttonType === 'medal'
  )
    array.push('_just_icon')
  if (props.isShadow) array.push('_button_shadow')
  if (props.isBorder) array.push('_button_border')
  return array
}

/**文字とアイコンの位置を調節 */
const textAndIconPosition = () => {
  const array = []
  if (props.buttonType === 'withImg') array.push('_withImg')
  if (props.contentPosition === 'center') array.push('_button_content_position')
  return array
}

/**ゴミ箱とメダルはsvgファイルであるため青にするにはfilterをかける */
const medalGarbageColor = () => {
  if (props.isMedalAndGarbageColor === 'blue') return '_medal_garbage_blue'
  if (props.isMedalAndGarbageColor === 'white') return '_medal_garbage_white'
  return ''
}
</script>

<template>
  <button
    :type="type"
    :class="[
      '_AFC_buttons',
      changeButtonShape(),
      `text-${letterColor}`,
      { disable: props.isDisable },
    ]"
    :style="{ background: `${bgColor}` }"
  >
    <!-- ボタンタイプ削除 -->
    <img
      src="~/assets/garbage.svg"
      :class="['_garbage_and_medal_icon', medalGarbageColor()]"
      v-if="buttonType === 'delete'"
    />
    <!-- ボタンタイプメダル -->
    <img
      src="~/assets/medal.svg"
      :class="[
        '_garbage_and_medal_icon',
        '_medal_icon_size',

        medalGarbageColor(),
      ]"
      v-else-if="buttonType === 'medal'"
    />
    <!-- ボタンタイプ追加青もしくは追加灰 -->
    <q-icon
      :name="imageUrlOrIconName"
      size="lg"
      :color="iconColor"
      v-else-if="buttonType === 'justIcon' && specialIcon === false"
      class="_just_icon"
    />
    <!-- google fontsの素の書き方でしか対応できないものに対応 -->
    <div
      v-else-if="specialIcon === true && buttonType === 'justIcon'"
      class="_just_icon _btn_icon"
    >
      <span class="material-symbols-outlined">{{ imageUrlOrIconName }}</span>
    </div>

    <!-- ボタンタイプ、文字のみ、アイコンのみ、アイコンプラス文字、画像プラス文字 -->
    <div v-else :class="['_icon_and_text_container', textAndIconPosition()]">
      <!-- 文字プラスアイコン用 -->
      <div class="_icon_status" v-if="buttonType === 'withIcon'">
        <img
          src="~/assets/medal.svg"
          v-if="imageUrlOrIconName === 'medal'"
          :class="[`'text-${letterColor}'`, '_modal_icon']"
        />
        <div
          v-else-if="specialIcon === true"
          class="_btn_icon _special_icon"
          :color="iconColor"
        >
          <span class="material-symbols-outlined">
            {{ imageUrlOrIconName }}
          </span>
        </div>
        <q-icon
          class="_btn_icon"
          :color="iconColor"
          :name="imageUrlOrIconName"
          v-else
        />
      </div>
      <!-- 文字プラスイメージ画像 -->
      <div class="_icon_status" v-else-if="buttonType === 'withImg'">
        <div class="_img_box">
          <img :src="imageUrlOrIconName" class="_icon_size _img_size" />
        </div>
      </div>
      <!-- テキスト用 -->
      <div
        :class="['_just_letter', `text-${letterColor}`]"
        v-if="
          buttonType === 'withImg' ||
          buttonType === 'standard' ||
          buttonType === 'withIcon'
        "
        v-html="label"
      ></div>
    </div>
  </button>
</template>

<style lang="sass" scoped>
._AFC_buttons
  font-size: 18px
  width: 100%
  height: v-bind(buttonHeight)
//TODO iPad対応する場合はメディアクエリで対応
  max-width: 700px
  transition: 0.5s
  opacity: 1
  user-select: none
._AFC_buttons:hover
  transition: 0.5s
  opacity: 0.8
// buttonType:roundで追加
._button_shape_round
  border-radius: 30px
//buttonType:ellipseで追加
._button_shape_ellipse
  border-radius: 14px
._button_border
  border: 1px solid $primary
//isShadowで追加
._button_shadow
  box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.15)
  //アイコンのみ表示の時使用
._just_icon
  width: 49px
  height: 49px
  display: grid
  place-items: center
.disable
  pointer-events: none
  opacity: 0.5
._icon_and_text_container
  display: flex
  padding: 5px 25px
  height: 100%
._icon_size
  flex:2
  width: 90px
  height: auto
._img_size
  height: 100%
  width: auto
._just_letter
  flex:3
  display: grid
  place-items: center
  font-size: v-bind(letterSize)
@media (max-width: 374px)
    ._just_letter
      font-size: v-bind(smallLetterSize)
@media (max-width: 340px)
    ._just_letter
      font-size: v-bind(microLetterSize)

._icon_status
  align-items: center
  display: flex

._img_box
  display: grid
  place-items: center


._btn_icon
  font-size: v-bind(iconSize)
  .q-icon,._medal_icon
    padding-right: 20px


// ボタン内文字アイコンポジション可変用
._button_content_position
  justify-content: center
  ._icon_size
    flex: initial
  ._just_letter
    flex: initial
//ボタンタイプwithImg用
._withImg
  flex-direction: column
  color: yellow
  min-height: 101px
  min-width: 101px
  align-items: center
  padding: 5px
  border-radius: 14px
  row-gap: 9.5px
  ._icon_status
    flex: 5
    display: grid
    place-items: center
  ._just_letter
    flex: 1
    line-height: 80%
._medal_garbage_blue
  filter: invert(76%) sepia(59%) saturate(1421%) hue-rotate(153deg) brightness(98%) contrast(93%)
._medal_garbage_white
  filter: brightness(0) invert(1)
._garbage_and_medal_icon
  height: v-bind(svgSize)
  width: auto
  display: grid
  place-items: center
._medal_icon_size
  height: 42px
  width: auto
._special_icon
  display: flex
  align-items: center
  justify-content: center
</style>
