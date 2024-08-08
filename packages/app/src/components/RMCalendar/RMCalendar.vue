<script setup lang="ts">
import { ref, computed, watch, PropType } from 'vue'
import RMCard from '../RMCard/RMCard.vue'
import EMIcon from '../RMIcon/RMIcon.vue'
import { DateType } from './calendarDateType'
import { createCalendar } from './createCalendar'
import { createPagenaviMonthYear } from './createPagenaviMonthYear'
import { createDayOfTheWeek } from './createDayOfTheWeek'

const props = defineProps({
  /**
   * 選択された日付
   * @example '2023/01/01'
   */
  modelValue: { type: String, required: true },
  /**
   * カレンダーの言語設定
   * @default 'ja'
   * @example '5月1日（水）'
   * @type { 'en' | 'ja' }
   */
  lang: { type: String as PropType<'ja' | 'en'>, default: 'ja' },
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})

// 現在の日時
const isNewDate = computed(() =>
  model.value ? new Date(model.value) : new Date()
)

// 本日の日を定義する
// const isDate = ref<number>(isNewDate.value.getDate())

// 年を定義する
const isYear = ref<number>(isNewDate.value.getFullYear())

// 月を定義する
const isMonth = ref<number>(isNewDate.value.getMonth())

// この月のカレンダー配列
const thisMonthCalenderDays = ref<DateType[]>([])
// ヘッダーの日付を定義する
const headerYear = computed(
  () => model.value?.toString().split('/').at(0) ?? ''
)

// ヘッダーの日付を定義する
const headerDate = computed(() => {
  if (props.lang === 'ja') {
    return model.value
      ? isNewDate.value.getMonth() +
          1 +
          '月' +
          isNewDate.value.getDate() +
          '日' +
          '（' +
          byLangDayOfTheWeek.value +
          '）'
      : ''
  } else if (props.lang === 'en') {
    return (
      isNewDate.value.getMonth() +
      1 +
      ',' +
      ' ' +
      isNewDate.value.getDate() +
      ' ' +
      byLangDayOfTheWeek.value
    )
  }
  return ''
})

// ページナビの月年を定義する
const isPagenaviMonthYear = ref<string>('')

// 略語の曜日
const byLangDayOfTheWeek = ref<string>('')

// 今月のカレンダー情報を設定する
thisMonthCalenderDays.value = createCalendar(isYear.value, isMonth.value)

// ページナビの日付を代入する
isPagenaviMonthYear.value =
  createPagenaviMonthYear.createPagenaviMonthYearChoose(
    props.lang,
    isYear.value,
    isMonth.value
  )

// 英語の曜日を代入する
byLangDayOfTheWeek.value = createDayOfTheWeek.createDayOfTheWeekChoose(
  props.lang,
  isNewDate.value.getDay()
)

watch(
  () => model.value,
  () => {
    if (!model.value) {
      byLangDayOfTheWeek.value = createDayOfTheWeek.createDayOfTheWeekChoose(
        props.lang,
        isNewDate.value.getDay()
      )
    }
  }
)

// 年月を選択する左側ボタンのref
const selectionButtonLeft = ref<HTMLElement>()

// 年月を選択する右側ボタンのref
const selectionButtonRight = ref<HTMLElement>()

// カレンダーのref
const refThisMonthCalenderDays = ref<HTMLElement>()

// ページナビの現在地
const pageNaviCurrent = ref<number>(isMonth.value)

// カレンダー日付区分のref
const refCalendarDateSection = ref<HTMLElement>()

const backCalendar = () => {
  const elementCalendarDateSection = refCalendarDateSection.value!
  elementCalendarDateSection.style.marginLeft = '5px'
  elementCalendarDateSection.style.opacity = '0'

  setTimeout(() => {
    elementCalendarDateSection.style.marginLeft = '0px'
    elementCalendarDateSection.style.marginRight = '5px'
  }, 150)

  setTimeout(() => {
    pageNaviCurrent.value--
    isMonth.value = pageNaviCurrent.value
    if (pageNaviCurrent.value < 0) {
      isYear.value--
      pageNaviCurrent.value = 11
      isMonth.value = pageNaviCurrent.value
    }

    // 前月のカレンダー情報を設定する
    thisMonthCalenderDays.value = createCalendar(isYear.value, isMonth.value)

    // ページナビの日付を代入する
    isPagenaviMonthYear.value =
      createPagenaviMonthYear.createPagenaviMonthYearChoose(
        props.lang,
        isYear.value,
        isMonth.value
      )

    elementCalendarDateSection.style.marginRight = '0px'
    elementCalendarDateSection.style.opacity = '1'
  }, 300)
}

const nextCalendar = () => {
  const elementCalendarDateSection = refCalendarDateSection.value!
  elementCalendarDateSection.style.marginRight = '5px'
  elementCalendarDateSection.style.opacity = '0'

  setTimeout(() => {
    elementCalendarDateSection.style.marginRight = '0px'
    elementCalendarDateSection.style.marginLeft = '5px'
  }, 150)

  setTimeout(() => {
    pageNaviCurrent.value++
    isMonth.value = pageNaviCurrent.value
    if (pageNaviCurrent.value > 11) {
      isYear.value++
      pageNaviCurrent.value = 0
      isMonth.value = pageNaviCurrent.value
    }

    // 翌月のカレンダー情報を設定する
    thisMonthCalenderDays.value = createCalendar(isYear.value, isMonth.value)

    // ページナビの日付を代入する
    isPagenaviMonthYear.value =
      createPagenaviMonthYear.createPagenaviMonthYearChoose(
        props.lang,
        isYear.value,
        isMonth.value
      )

    elementCalendarDateSection.style.marginLeft = '0px'
    elementCalendarDateSection.style.opacity = '1'
  }, 300)
}

// ヘッダーの日付コンテナref
const refHeaderDateContainer = ref<HTMLElement>()

const selectDay = (dayObject: DateType) => {
  if (
    dayObject.year === ' ' &&
    dayObject.month === ' ' &&
    dayObject.day === ' '
  )
    return

  // const elementHeaderDateContainer = refHeaderDateContainer.value!
  // elementHeaderDateContainer.style.opacity = '0'

  setTimeout(() => {
    const selectDayOfTheWeek = new Date(
      Number(dayObject.year),
      Number(dayObject.month),
      Number(dayObject.day)
    ).getDay()

    byLangDayOfTheWeek.value = createDayOfTheWeek.createDayOfTheWeekChoose(
      props.lang,
      selectDayOfTheWeek
    )

    model.value =
      dayObject.year + '/' + (Number(dayObject.month) + 1) + '/' + dayObject.day

    // elementHeaderDateContainer.style.opacity = '1'
  }, 300)
}
</script>

<template>
  <div class="_cc_calendar">
    <RMCard class="_calendar_card">
      <div class="_calendar_header">
        <div ref="refHeaderDateContainer" class="_header_date_container">
          <div
            v-if="!(headerYear && headerDate)"
            class="_header_selection_not_selected"
          >
            日付が未設定です
          </div>
          <div v-else>
            <div class="_header_selection_year">{{ headerYear }}</div>
            <div class="_header_selection_date">{{ headerDate }}</div>
          </div>
        </div>
      </div>

      <div class="_selection_date_container">
        <div class="_pagenavi_container">
          <div
            ref="selectionButtonLeft"
            class="_selection_button _selection_button_left"
            @click="backCalendar"
          >
            <EMIcon name="chevron_left" />
          </div>
          <div class="_selection_month_year">{{ isPagenaviMonthYear }}</div>
          <div
            ref="selectionButtonRight"
            class="_selection_button _selection_button_right"
            @click="nextCalendar"
          >
            <EMIcon name="chevron_right" />
          </div>
        </div>

        <div class="_week_items_container">
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 0, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 1, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 2, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 3, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 4, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 5, true)
            }}
          </div>
          <div class="_day_of_the_week_items">
            {{
              createDayOfTheWeek.createDayOfTheWeekChoose(props.lang, 6, true)
            }}
          </div>
        </div>

        <div ref="refCalendarDateSection" class="_week_items_container">
          <div
            ref="refThisMonthCalenderDays"
            v-for="(dayObject, index) in thisMonthCalenderDays"
            :key="index"
            :class="{
              _this_month_day:
                dayObject.year !== ' ' &&
                dayObject.month !== ' ' &&
                dayObject.day !== ' ',
              _day_space:
                dayObject.year === ' ' &&
                dayObject.month === ' ' &&
                dayObject.day === ' ',
              _today:
                dayObject.year === String(isNewDate.getFullYear()) &&
                dayObject.month === String(isNewDate.getMonth()) &&
                dayObject.day === String(isNewDate.getDate()),
              _select_day:
                dayObject.year +
                  '/' +
                  (Number(dayObject.month) + 1) +
                  '/' +
                  dayObject.day ===
                model,
            }"
            @click="selectDay(dayObject)"
          >
            {{ dayObject.day }}
          </div>
        </div>
      </div>
    </RMCard>
  </div>
</template>

<style lang="sass" scoped>
._cc_calendar
  font-family: 'Roboto', sans-serif
  width: 265px
  ._calendar_card
    height: 375px
    ._calendar_header
      background: var(--c-primary)
      height: 90px
      padding: 15px 20px 0px
      color: #fff
      ._header_date_container
        transition: 0.3s
        ._header_selection_year
          font-size: 16px
          margin-bottom: 8px
        ._header_selection_date
          font-size: 24px
        ._header_selection_not_selected
          margin-top: 15px
          font-size: 20px
    ._selection_date_container
      padding: 15px 5px
      padding-bottom: 0
      color: #707070
      ._pagenavi_container
        display: flex
        justify-content: center
        align-items: center
        margin-bottom: 15px
        padding: 0 7px
      ._selection_button
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0)
        width: 24px
        height: 24px
        border-radius: 50%
        cursor: pointer
        transition: 0.3s
      ._selection_button_left:hover
        background: #707070
        color: #fff
      ._selection_button_right:hover
        background: #707070
        color: #fff
      ._selection_month_year
        text-align: center
        width: 150px
        font-size: 12px
        line-height: 1rem
        margin: 0 auto
      ._week_items_container
        display: flex
        flex-wrap: wrap
        justify-content: center
        gap: 2px 4px
        transition: 0.3s
        ._day_of_the_week_items
          width: 32px
          height: 32px
          display: grid
          place-items: center
        ._this_month_day
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0)
          display: grid
          place-items: center
          border-radius: 50%
          transition: 0.3s
          height: 30px
          width: 30px
          border: solid 1px #fff
          cursor: pointer
        ._this_month_day:hover
          background: rgb(var(--c-primary-rgb), 0.3)
          color: #fff
        ._day_space
          height: 30px
          width: 30px
          border: solid 1px #fff
        ._today
          border: solid 1px var(--c-primary)
        ._select_day
          background: var(--c-primary)
          color: #fff
</style>
