<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = withDefaults(
  defineProps<{
    modelValue: Date | null
    label?: string
    disabled?: boolean
    placeholder?: string
    minYear?: number
    maxYear?: number
  }>(),
  {
    label: '',
    disabled: false,
    placeholder: '日時を選択',
    minYear: undefined,
    maxYear: undefined
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void
}>()

const ITEM_HEIGHT = 44
type WheelColumn = 'year' | 'month' | 'day' | 'hour' | 'minute'

const now = new Date()
const resolvedMinYear = computed(() => props.minYear ?? now.getFullYear() - 1)
const resolvedMaxYear = computed(() => props.maxYear ?? now.getFullYear() + 3)

const years = computed(() => {
  const list: number[] = []
  for (let year = resolvedMinYear.value; year <= resolvedMaxYear.value; year++) {
    list.push(year)
  }
  return list
})

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

const isOpen = ref(false)
const draftYear = ref(now.getFullYear())
const draftMonth = ref(now.getMonth() + 1)
const draftDay = ref(now.getDate())
const draftHour = ref(now.getHours())
const draftMinute = ref(now.getMinutes())

const daysInDraftMonth = computed(() =>
  daysInMonth(draftYear.value, draftMonth.value)
)

const yearColumnRef = ref<HTMLElement | null>(null)
const monthColumnRef = ref<HTMLElement | null>(null)
const dayColumnRef = ref<HTMLElement | null>(null)
const hourColumnRef = ref<HTMLElement | null>(null)
const minuteColumnRef = ref<HTMLElement | null>(null)

const columnRef = (column: WheelColumn) => {
  if (column === 'year') return yearColumnRef.value
  if (column === 'month') return monthColumnRef.value
  if (column === 'day') return dayColumnRef.value
  if (column === 'hour') return hourColumnRef.value
  return minuteColumnRef.value
}

const formatDisplay = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

const displayValue = computed(() =>
  props.modelValue ? formatDisplay(props.modelValue) : ''
)

const scrollColumnTo = (column: WheelColumn, index: number, smooth = false) => {
  const el = columnRef(column)
  if (!el) return
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
}

const openPicker = () => {
  if (props.disabled) return

  const base = props.modelValue ?? now
  draftYear.value = base.getFullYear()
  draftMonth.value = base.getMonth() + 1
  draftDay.value = Math.min(base.getDate(), daysInMonth(draftYear.value, draftMonth.value))
  draftHour.value = base.getHours()
  draftMinute.value = base.getMinutes()

  isOpen.value = true

  nextTick(() => {
    scrollColumnTo('year', Math.max(0, years.value.indexOf(draftYear.value)))
    scrollColumnTo('month', draftMonth.value - 1)
    scrollColumnTo('day', draftDay.value - 1)
    scrollColumnTo('hour', draftHour.value)
    scrollColumnTo('minute', draftMinute.value)
  })
}

const scrollTimers: Partial<Record<WheelColumn, ReturnType<typeof setTimeout>>> = {}

const onScroll = (column: WheelColumn) => {
  if (scrollTimers[column]) clearTimeout(scrollTimers[column])

  scrollTimers[column] = setTimeout(() => {
    const el = columnRef(column)
    if (!el) return

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT)

    if (column === 'year') {
      const clamped = Math.min(Math.max(rawIndex, 0), years.value.length - 1)
      draftYear.value = years.value[clamped]
      scrollColumnTo('year', clamped, true)
    } else if (column === 'month') {
      const clamped = Math.min(Math.max(rawIndex, 0), 11)
      draftMonth.value = clamped + 1
      scrollColumnTo('month', clamped, true)
    } else if (column === 'day') {
      const clamped = Math.min(Math.max(rawIndex, 0), daysInDraftMonth.value - 1)
      draftDay.value = clamped + 1
      scrollColumnTo('day', clamped, true)
    } else if (column === 'hour') {
      const clamped = Math.min(Math.max(rawIndex, 0), 23)
      draftHour.value = clamped
      scrollColumnTo('hour', clamped, true)
    } else {
      const clamped = Math.min(Math.max(rawIndex, 0), 59)
      draftMinute.value = clamped
      scrollColumnTo('minute', clamped, true)
    }
  }, 120)
}

const onKeydown = (event: KeyboardEvent, column: WheelColumn) => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()

  const el = columnRef(column)
  if (!el) return

  const delta = event.key === 'ArrowDown' ? ITEM_HEIGHT : -ITEM_HEIGHT
  el.scrollBy({ top: delta, behavior: 'smooth' })
}

watch([draftMonth, draftYear], () => {
  if (draftDay.value > daysInDraftMonth.value) {
    draftDay.value = daysInDraftMonth.value
  }
})

watch(draftDay, (next) => {
  nextTick(() => scrollColumnTo('day', next - 1, true))
})

const onConfirm = () => {
  emit(
    'update:modelValue',
    new Date(
      draftYear.value,
      draftMonth.value - 1,
      draftDay.value,
      draftHour.value,
      draftMinute.value,
      0,
      0
    )
  )
  isOpen.value = false
}

const onClear = () => {
  emit('update:modelValue', null)
  isOpen.value = false
}
</script>

<template>
  <div class="rm-wheel-datetime">
    <div v-if="label" class="rm-wheel-datetime__label">{{ label }}</div>
    <button
      type="button"
      class="rm-wheel-datetime__trigger"
      :class="{ 'rm-wheel-datetime__trigger--disabled': disabled }"
      :disabled="disabled"
      @click="openPicker"
    >
      <span :class="{ 'rm-wheel-datetime__placeholder': !displayValue }">
        {{ displayValue || placeholder }}
      </span>
      <i class="pi pi-calendar rm-wheel-datetime__icon" aria-hidden="true" />
    </button>

    <Dialog
      v-model:visible="isOpen"
      modal
      dismissableMask
      :draggable="false"
      header="日時を選択"
      :style="{ width: 'min(96vw, 34rem)' }"
      class="rm-wheel-datetime-dialog"
    >
      <div class="rm-wheel-datetime-columns">
        <div class="rm-wheel-datetime-column-labels">
          <div class="rm-wheel-datetime-column-label">年</div>
          <div class="rm-wheel-datetime-column-label">月</div>
          <div class="rm-wheel-datetime-column-label">日</div>
          <div class="rm-wheel-datetime-column-label">時</div>
          <div class="rm-wheel-datetime-column-label">分</div>
        </div>

        <div class="rm-wheel-datetime-scroll-row">
          <div class="rm-wheel-datetime-highlight" aria-hidden="true" />

          <div
            ref="yearColumnRef"
            class="rm-wheel-datetime-column"
            tabindex="0"
            role="listbox"
            aria-label="年を選択"
            @scroll="onScroll('year')"
            @keydown="onKeydown($event, 'year')"
          >
            <div class="rm-wheel-datetime-column__pad" />
            <div
              v-for="year in years"
              :key="year"
              class="rm-wheel-datetime-item"
              role="option"
              :aria-selected="year === draftYear"
              :class="{ 'rm-wheel-datetime-item--active': year === draftYear }"
            >
              {{ year }}
            </div>
            <div class="rm-wheel-datetime-column__pad" />
          </div>

          <div
            ref="monthColumnRef"
            class="rm-wheel-datetime-column"
            tabindex="0"
            role="listbox"
            aria-label="月を選択"
            @scroll="onScroll('month')"
            @keydown="onKeydown($event, 'month')"
          >
            <div class="rm-wheel-datetime-column__pad" />
            <div
              v-for="month in 12"
              :key="month"
              class="rm-wheel-datetime-item"
              role="option"
              :aria-selected="month === draftMonth"
              :class="{ 'rm-wheel-datetime-item--active': month === draftMonth }"
            >
              {{ String(month).padStart(2, '0') }}
            </div>
            <div class="rm-wheel-datetime-column__pad" />
          </div>

          <div
            ref="dayColumnRef"
            class="rm-wheel-datetime-column"
            tabindex="0"
            role="listbox"
            aria-label="日を選択"
            @scroll="onScroll('day')"
            @keydown="onKeydown($event, 'day')"
          >
            <div class="rm-wheel-datetime-column__pad" />
            <div
              v-for="day in daysInDraftMonth"
              :key="day"
              class="rm-wheel-datetime-item"
              role="option"
              :aria-selected="day === draftDay"
              :class="{ 'rm-wheel-datetime-item--active': day === draftDay }"
            >
              {{ String(day).padStart(2, '0') }}
            </div>
            <div class="rm-wheel-datetime-column__pad" />
          </div>

          <div
            ref="hourColumnRef"
            class="rm-wheel-datetime-column"
            tabindex="0"
            role="listbox"
            aria-label="時を選択"
            @scroll="onScroll('hour')"
            @keydown="onKeydown($event, 'hour')"
          >
            <div class="rm-wheel-datetime-column__pad" />
            <div
              v-for="hourOption in 24"
              :key="hourOption - 1"
              class="rm-wheel-datetime-item"
              role="option"
              :aria-selected="hourOption - 1 === draftHour"
              :class="{ 'rm-wheel-datetime-item--active': hourOption - 1 === draftHour }"
            >
              {{ String(hourOption - 1).padStart(2, '0') }}
            </div>
            <div class="rm-wheel-datetime-column__pad" />
          </div>

          <div
            ref="minuteColumnRef"
            class="rm-wheel-datetime-column"
            tabindex="0"
            role="listbox"
            aria-label="分を選択"
            @scroll="onScroll('minute')"
            @keydown="onKeydown($event, 'minute')"
          >
            <div class="rm-wheel-datetime-column__pad" />
            <div
              v-for="minuteOption in 60"
              :key="minuteOption - 1"
              class="rm-wheel-datetime-item"
              role="option"
              :aria-selected="minuteOption - 1 === draftMinute"
              :class="{ 'rm-wheel-datetime-item--active': minuteOption - 1 === draftMinute }"
            >
              {{ String(minuteOption - 1).padStart(2, '0') }}
            </div>
            <div class="rm-wheel-datetime-column__pad" />
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          type="button"
          label="未設定にする"
          text
          severity="secondary"
          @click="onClear"
        />
        <Button
          type="button"
          label="キャンセル"
          severity="secondary"
          outlined
          @click="isOpen = false"
        />
        <Button type="button" label="決定" @click="onConfirm" />
      </template>
    </Dialog>
  </div>
</template>

<style lang="scss" scoped>
.rm-wheel-datetime {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rm-wheel-datetime__label {
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.rm-wheel-datetime__trigger {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.92);
  color: #1f2937;
  font-family: inherit;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rm-wheel-datetime__trigger:focus-visible {
  outline: none;
  border-color: #4b6982;
  box-shadow: 0 0 0 4px rgba(75, 105, 130, 0.14);
}

.rm-wheel-datetime__trigger--disabled {
  background: rgba(241, 245, 249, 0.88);
  color: #64748b;
  cursor: default;
}

.rm-wheel-datetime__placeholder {
  color: #94a3b8;
}

.rm-wheel-datetime__icon {
  font-size: 1.1rem;
  color: #64748b;
  flex-shrink: 0;
}

.rm-wheel-datetime-columns {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rm-wheel-datetime-column-labels {
  display: flex;
  gap: 6px;
}

.rm-wheel-datetime-column-label {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}

.rm-wheel-datetime-scroll-row {
  position: relative;
  display: flex;
  gap: 6px;
}

.rm-wheel-datetime-column {
  flex: 1;
  min-width: 0;
  height: 220px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
}

.rm-wheel-datetime-column::-webkit-scrollbar {
  display: none;
}

.rm-wheel-datetime-column__pad {
  height: 88px;
}

.rm-wheel-datetime-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition: color 0.15s ease, font-size 0.15s ease;
}

.rm-wheel-datetime-item--active {
  color: var(--rm-primary, #4b6982);
  font-size: 1.05rem;
  font-weight: 800;
}

.rm-wheel-datetime-highlight {
  position: absolute;
  left: 0;
  right: 0;
  top: 88px;
  height: 44px;
  border-radius: 12px;
  background: rgba(75, 105, 130, 0.08);
  border-top: 1.5px solid rgba(75, 105, 130, 0.35);
  border-bottom: 1.5px solid rgba(75, 105, 130, 0.35);
  pointer-events: none;
}

@media (max-width: 480px) {
  .rm-wheel-datetime-column-labels,
  .rm-wheel-datetime-scroll-row {
    gap: 4px;
  }

  .rm-wheel-datetime-item {
    font-size: 0.82rem;
  }

  .rm-wheel-datetime-item--active {
    font-size: 0.95rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rm-wheel-datetime-item {
    transition: none;
  }
}
</style>
