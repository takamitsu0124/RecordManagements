<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined
    label?: string
    disabled?: boolean
    placeholder?: string
    minYear?: number
    maxYear?: number
  }>(),
  {
    label: '',
    disabled: false,
    placeholder: '日付を選択',
    minYear: undefined,
    maxYear: undefined,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const ITEM_HEIGHT = 44
type WheelColumn = 'year' | 'month' | 'day'

const now = new Date()
const resolvedMinYear = computed(() => props.minYear ?? now.getFullYear() - 100)
const resolvedMaxYear = computed(() => props.maxYear ?? now.getFullYear() + 5)

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

const daysInDraftMonth = computed(() =>
  daysInMonth(draftYear.value, draftMonth.value)
)

const yearColumnRef = ref<HTMLElement | null>(null)
const monthColumnRef = ref<HTMLElement | null>(null)
const dayColumnRef = ref<HTMLElement | null>(null)

const columnRef = (column: WheelColumn) => {
  if (column === 'year') return yearColumnRef.value
  if (column === 'month') return monthColumnRef.value
  return dayColumnRef.value
}

const parseValue = (value: string | null | undefined) => {
  if (!value) return null
  const normalized = value.replace(/-/g, '/')
  const [y, m, d] = normalized.split('/').map((part) => Number(part))
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

const formatValue = (year: number, month: number, day: number) =>
  `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`

const displayValue = computed(() => props.modelValue || '')

const scrollColumnTo = (column: WheelColumn, index: number, smooth = false) => {
  const el = columnRef(column)
  if (!el) return
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
}

const openPicker = () => {
  if (props.disabled) return

  const parsed = parseValue(props.modelValue) ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
  draftYear.value = parsed.year
  draftMonth.value = parsed.month
  draftDay.value = Math.min(parsed.day, daysInMonth(parsed.year, parsed.month))

  isOpen.value = true

  nextTick(() => {
    scrollColumnTo('year', Math.max(0, years.value.indexOf(draftYear.value)))
    scrollColumnTo('month', draftMonth.value - 1)
    scrollColumnTo('day', draftDay.value - 1)
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
    } else {
      const clamped = Math.min(Math.max(rawIndex, 0), daysInDraftMonth.value - 1)
      draftDay.value = clamped + 1
      scrollColumnTo('day', clamped, true)
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
    formatValue(draftYear.value, draftMonth.value, draftDay.value)
  )
  isOpen.value = false
}

const onClear = () => {
  emit('update:modelValue', null)
  isOpen.value = false
}
</script>

<template>
  <div class="rm-wheel-date">
    <div v-if="label" class="rm-wheel-date__label">{{ label }}</div>
    <button
      type="button"
      class="rm-wheel-date__trigger"
      :class="{ 'rm-wheel-date__trigger--disabled': disabled }"
      :disabled="disabled"
      @click="openPicker"
    >
      <span :class="{ 'rm-wheel-date__placeholder': !displayValue }">
        {{ displayValue || placeholder }}
      </span>
      <i class="pi pi-calendar rm-wheel-date__icon" aria-hidden="true" />
    </button>

    <Dialog
      v-model:visible="isOpen"
      modal
      dismissable-mask
      :draggable="false"
      header="日付を選択"
      :style="{ width: 'min(92vw, 22rem)' }"
      class="rm-wheel-date-dialog"
    >
      <div class="rm-wheel-columns">
        <div class="rm-wheel-highlight" aria-hidden="true" />

        <div class="rm-wheel-column-wrap">
          <div class="rm-wheel-column-label">年</div>
          <div
            ref="yearColumnRef"
            class="rm-wheel-column"
            tabindex="0"
            role="listbox"
            aria-label="年を選択"
            @scroll="onScroll('year')"
            @keydown="onKeydown($event, 'year')"
          >
            <div class="rm-wheel-column__pad" />
            <div
              v-for="year in years"
              :key="year"
              class="rm-wheel-item"
              role="option"
              :aria-selected="year === draftYear"
              :class="{ 'rm-wheel-item--active': year === draftYear }"
            >
              {{ year }}年
            </div>
            <div class="rm-wheel-column__pad" />
          </div>
        </div>

        <div class="rm-wheel-column-wrap">
          <div class="rm-wheel-column-label">月</div>
          <div
            ref="monthColumnRef"
            class="rm-wheel-column"
            tabindex="0"
            role="listbox"
            aria-label="月を選択"
            @scroll="onScroll('month')"
            @keydown="onKeydown($event, 'month')"
          >
            <div class="rm-wheel-column__pad" />
            <div
              v-for="month in 12"
              :key="month"
              class="rm-wheel-item"
              role="option"
              :aria-selected="month === draftMonth"
              :class="{ 'rm-wheel-item--active': month === draftMonth }"
            >
              {{ month }}月
            </div>
            <div class="rm-wheel-column__pad" />
          </div>
        </div>

        <div class="rm-wheel-column-wrap">
          <div class="rm-wheel-column-label">日</div>
          <div
            ref="dayColumnRef"
            class="rm-wheel-column"
            tabindex="0"
            role="listbox"
            aria-label="日を選択"
            @scroll="onScroll('day')"
            @keydown="onKeydown($event, 'day')"
          >
            <div class="rm-wheel-column__pad" />
            <div
              v-for="day in daysInDraftMonth"
              :key="day"
              class="rm-wheel-item"
              role="option"
              :aria-selected="day === draftDay"
              :class="{ 'rm-wheel-item--active': day === draftDay }"
            >
              {{ day }}日
            </div>
            <div class="rm-wheel-column__pad" />
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
.rm-wheel-date {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rm-wheel-date__label {
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.rm-wheel-date__trigger {
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

.rm-wheel-date__trigger:focus-visible {
  outline: none;
  border-color: #4b6982;
  box-shadow: 0 0 0 4px rgba(75, 105, 130, 0.14);
}

.rm-wheel-date__trigger--disabled {
  background: rgba(241, 245, 249, 0.88);
  color: #64748b;
  cursor: default;
}

.rm-wheel-date__placeholder {
  color: #94a3b8;
}

.rm-wheel-date__icon {
  font-size: 1.1rem;
  color: #64748b;
  flex-shrink: 0;
}

.rm-wheel-columns {
  position: relative;
  display: flex;
  gap: 8px;
}

.rm-wheel-column-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.rm-wheel-column-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
}

.rm-wheel-column {
  width: 100%;
  height: 220px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
}

.rm-wheel-column::-webkit-scrollbar {
  display: none;
}

.rm-wheel-column__pad {
  height: 88px;
}

.rm-wheel-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
  transition: color 0.15s ease, font-size 0.15s ease;
}

.rm-wheel-item--active {
  color: var(--rm-primary, #4b6982);
  font-size: 1.1rem;
  font-weight: 800;
}

.rm-wheel-highlight {
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

@media (prefers-reduced-motion: reduce) {
  .rm-wheel-item {
    transition: none;
  }
}
</style>
