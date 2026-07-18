<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import type { SizeTypes } from './size'
import type { IconTypes } from '../iconType'
import RMIcon from '../RMIcon/RMIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number, File], default: undefined },
  outline: { type: Boolean, default: false },
  shadow: { type: Boolean, default: false },
  square: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '' },
  labelSize: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  size: { type: String as PropType<SizeTypes>, default: 'S' },
  iconLeft: { type: String as PropType<IconTypes>, default: '' },
  iconRight: { type: String as PropType<IconTypes>, default: '' },
  requiredText: { type: String as PropType<'※' | '※必須'>, default: '' },
  requiredIcon: { type: Boolean, default: false },
  error1: { type: Boolean, default: false },
  error2: { type: Boolean, default: false },
  error3: { type: String, default: '' },
  error4: { type: String, default: '' },
  date: { type: Boolean, default: false },
  maxlength: { type: String, default: '999' },
  search: { type: Boolean, default: false },
  calendarPopupMode: { type: Boolean, default: false },
  accept: { type: String, default: '' },
  autocomplete: { type: String, default: '' },
  rules: {
    type: Array as PropType<Array<(value: string) => true | string>>,
    default: () => []
  },
  inputmode: {
    type: String as PropType<
      | 'text'
      | 'search'
      | 'none'
      | 'tel'
      | 'url'
      | 'email'
      | 'numeric'
      | 'decimal'
      | undefined
    >,
    default: 'text'
  },
  type: {
    type: String,
    default: 'text'
  }
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | number | File | undefined): void
  (e: 'update:calendarPopupMode', val: boolean): void
  (e: 'onBlur'): void
  (e: 'onFocus'): void
}>()

const hiddenFileInput = ref<HTMLInputElement | null>(null)
const passwordVisible = ref(false)
const validationMessage = ref('')

const isDateField = computed(() => props.date || props.type === 'date')
const isTextarea = computed(() => props.type === 'textarea')
const isFile = computed(() => props.type === 'file')

const currentType = computed(() => {
  if (props.type !== 'password') return props.type
  return passwordVisible.value ? 'text' : 'password'
})

const hasError = computed(
  () =>
    props.error1 ||
    props.error2 ||
    Boolean(props.error3) ||
    Boolean(props.error4) ||
    Boolean(validationMessage.value)
)

const errorMessage = computed(
  () => props.error4 || props.error3 || validationMessage.value
)

const displayValue = computed(() => {
  if (props.modelValue instanceof File) return props.modelValue.name
  if (props.modelValue === undefined || props.modelValue === null) return ''
  return String(props.modelValue)
})

const inputModel = computed({
  get: () => displayValue.value,
  set: (value: string) => {
    if (props.type === 'number' || props.inputmode === 'numeric') {
      emit('update:modelValue', value === '' ? undefined : Number(value))
      return
    }
    emit('update:modelValue', value)
  }
})

const parseDate = (value: string) => {
  if (!value) return null
  const normalized = value.replace(/-/g, '/')
  const [year, month, day] = normalized.split('/')
  if (!year || !month || !day) return null
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDate = (value: Date | null) => {
  if (!value) return ''
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}/${month}/${day}`
}

const dateModel = computed<Date | null>({
  get: () => parseDate(displayValue.value),
  set: (value) => {
    emit('update:modelValue', formatDate(value))
  }
})

const validate = () => {
  const value = displayValue.value
  validationMessage.value = ''
  for (const rule of props.rules) {
    const result = rule(value)
    if (result !== true) {
      validationMessage.value = String(result)
      break
    }
  }
  return validationMessage.value === ''
}

const handleBlur = () => {
  validate()
  emit('onBlur')
}

const handleFocus = () => {
  emit('onFocus')
}

const triggerFileInput = () => {
  hiddenFileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  emit('update:modelValue', file)
  if (target) target.value = ''
}

defineExpose({ validate })
</script>

<template>
  <div class="_cc_input" :class="{ _error: hasError }">
    <div v-if="label || requiredText || requiredIcon" class="_label_container">
      <div class="_label label_text_size">
        {{ label }}
      </div>
      <div
        v-if="requiredText"
        class="_required_text"
        :class="{ _required_position_right: label }"
      >
        {{ requiredText }}
      </div>
      <div
        v-if="requiredIcon"
        class="_required_icon_container"
        :class="{ _required_position_right: label }"
      >
        <div class="_required_icon">必須</div>
      </div>
    </div>

    <div
      class="_input_container"
      :class="{
        _with_left_icon: iconLeft || search,
        _with_right_icon: iconRight || isDateField || type === 'password',
      }"
    >
      <div v-if="iconLeft && !search" class="_icon_left_position">
        <RMIcon :name="iconLeft" class="_cc_mdicon" />
      </div>

      <div v-if="search && !iconLeft" class="_icon_left_position">
        <RMIcon name="search" class="_cc_search_icon" />
      </div>

      <div
        v-if="iconRight && !isDateField && type !== 'password'"
        class="_icon_right_position"
      >
        <RMIcon :name="iconRight" class="_cc_mdicon" />
      </div>

      <DatePicker
        v-if="isDateField"
        v-model="dateModel"
        showIcon
        iconDisplay="input"
        dateFormat="yy/mm/dd"
        :disabled="disabled"
        :manualInput="true"
        inputClass="rm-input-field"
        class="rm-input-control rm-input-datepicker"
        @blur="handleBlur"
        @focus="handleFocus"
      />

      <div v-else-if="isFile" class="rm-file-field">
        <InputText
          :modelValue="displayValue"
          :disabled="disabled"
          :autocomplete="autocomplete"
          readonly
          class="rm-input-control rm-input-field"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
        />
        <input
          ref="hiddenFileInput"
          type="file"
          class="rm-hidden-file"
          :accept="accept"
          @change="onFileChange"
        />
        <Button
          type="button"
          class="rm-file-trigger"
          label="選択"
          outlined
          @click="triggerFileInput"
        />
      </div>

      <Textarea
        v-else-if="isTextarea"
        v-model="inputModel"
        autoResize
        rows="4"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :maxlength="maxlength"
        class="rm-input-control rm-input-field rm-input-textarea"
        @blur="handleBlur"
        @focus="handleFocus"
      />

      <InputText
        v-else
        v-model="inputModel"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :placeholder="search ? 'キーワードで検索' : placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :type="currentType"
        class="rm-input-control rm-input-field"
        @blur="handleBlur"
        @focus="handleFocus"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="_icon_button"
        @click="passwordVisible = !passwordVisible"
      >
        <RMIcon
          :name="passwordVisible ? 'visibility' : 'visibility_off'"
          class="_cc_mdicon"
        />
      </button>
    </div>

    <div v-if="hint" class="_hint_message">
      {{ hint }}
    </div>

    <div v-show="errorMessage" class="_error_message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style lang="sass" scoped>
._cc_input
  font-family: 'Roboto', sans-serif
  position: relative
  box-sizing: border-box
  display: flex
  flex-direction: column
  gap: 6px

._label_container
  display: flex
  align-items: center
  padding: 0 5px
  line-height: 24px

._label
  font-size: 16px
  font-weight: 700
  color: #334155
  width: fit-content

._required_text
  font-size: 14px
  color: #D20000

._required_icon_container
  height: 24px
  display: flex
  align-items: center

._required_icon
  font-size: 14px
  background: #D20000
  color: #fff
  line-height: 22px
  padding: 0 5px
  border-radius: 5px

._required_position_right
  margin-left: auto

._input_container
  position: relative

._with_left_icon
  :deep(.p-inputtext), :deep(.p-textarea), :deep(.p-datepicker-input)
    padding-left: 44px

._with_right_icon
  :deep(.p-inputtext), :deep(.p-textarea), :deep(.p-datepicker-input)
    padding-right: 44px

.rm-input-control
  width: 100%

:deep(.p-inputtext), :deep(.p-textarea), :deep(.p-datepicker-input)
  width: 100%
  border-radius: 14px
  border: 1px solid rgba(148, 163, 184, 0.45)
  background: rgba(255,255,255,0.92)
  min-height: 50px
  padding: 12px 14px
  color: #1f2937
  transition: border-color .2s ease, box-shadow .2s ease, background .2s ease

:deep(.p-textarea)
  min-height: 120px

:deep(.p-inputtext::placeholder), :deep(.p-textarea::placeholder), :deep(.p-datepicker-input::placeholder)
  color: #94a3b8

:deep(.p-inputtext:enabled:focus), :deep(.p-textarea:enabled:focus), :deep(.p-datepicker-input:enabled:focus)
  border-color: #4B6982
  box-shadow: 0 0 0 4px rgba(75, 105, 130, 0.14)

:deep(.p-inputtext:disabled), :deep(.p-textarea:disabled), :deep(.p-datepicker-input:disabled)
  background: rgba(241, 245, 249, 0.88)
  color: #64748b

._cc_input._error
  :deep(.p-inputtext), :deep(.p-textarea), :deep(.p-datepicker-input)
    border-color: #D20000

._icon_left_position, ._icon_right_position
  width: 30px
  height: 30px
  display: flex
  justify-content: center
  align-items: center
  position: absolute
  top: 50%
  transform: translateY(-50%)
  z-index: 1

._icon_left_position
  left: 10px

._icon_right_position
  right: 10px

._icon_button
  border: none
  background: transparent
  padding: 0
  width: 30px
  height: 30px
  display: flex
  justify-content: center
  align-items: center
  position: absolute
  top: 50%
  right: 10px
  transform: translateY(-50%)
  cursor: pointer
  z-index: 1
  border-radius: 999px

._cc_mdicon
  font-size: 22px
  color: #64748b

._cc_search_icon
  font-size: 22px
  color: #94a3b8

._error_message
  color: #D20000
  font-size: 14px
  line-height: 1.5

._hint_message
  color: #64748b
  font-size: 13px
  line-height: 1.5

.label_text_size
  font-size: v-bind('labelSize === "" ? "16px" : labelSize')

.rm-hidden-file
  display: none

.rm-file-field
  display: flex
  gap: 10px
  align-items: center

.rm-file-trigger
  flex-shrink: 0

@media (max-width: 767px)
  .rm-file-field
    flex-direction: column
    align-items: stretch
  .rm-file-trigger
    width: 100%
</style>
