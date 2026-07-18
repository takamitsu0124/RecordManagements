<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'

const props = withDefaults(
  defineProps<{
    editing: boolean
    canEdit: boolean
    title?: string
    saveLabel?: string
    cancelLabel?: string
    saving?: boolean
    saveDisabled?: boolean
    size?: 'section' | 'row'
  }>(),
  {
    title: undefined,
    saveLabel: '保存',
    cancelLabel: 'キャンセル',
    saving: false,
    saveDisabled: false,
    size: 'section'
  }
)

const emit = defineEmits<{
  (e: 'update:editing', value: boolean): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

// 所持スキル・武器熟練度スキルのように縦に長いセクションでは、
// ヘッダーの保存/キャンセルまでスクロールし直す必要が出るため、
// size="section"での編集中はフッターに固定表示に切り替える。
const useStickyFooter = computed(
  () => props.size === 'section' && props.editing
)
const showHeaderActions = computed(() => props.canEdit && !useStickyFooter.value)
const showStickyFooter = computed(() => props.canEdit && useStickyFooter.value)

const startEdit = () => emit('update:editing', true)
const cancelEdit = () => emit('cancel')
const save = () => emit('save')

const focusFirstEditableField = async () => {
  await nextTick()
  bodyRef.value
    ?.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), button:not([disabled])'
    )
    ?.focus()
}

const focusEditTrigger = async () => {
  await nextTick()
  rootRef.value?.querySelector<HTMLElement>('.rm-section-edit__edit-trigger')?.focus()
}

watch(
  () => props.editing,
  (next) => {
    if (next) {
      void focusFirstEditableField()
    } else {
      void focusEditTrigger()
    }
  }
)
</script>

<template>
  <div ref="rootRef" class="rm-section-edit" :class="`rm-section-edit--${size}`">
    <div v-if="title || $slots.header || showHeaderActions" class="rm-section-edit__head">
      <div class="rm-section-edit__title">
        <slot name="header">
          <span v-if="title">{{ title }}</span>
        </slot>
      </div>

      <div v-if="showHeaderActions" class="rm-section-edit__actions">
        <slot name="actions" :save="save" :cancel="cancelEdit">
          <Button
            v-if="!editing"
            type="button"
            icon="pi pi-pencil"
            :label="size === 'section' ? '編集する' : undefined"
            :aria-label="size === 'row' ? '編集する' : undefined"
            text
            size="small"
            class="rm-section-edit__edit-trigger"
            @click="startEdit"
          />
          <template v-else>
            <Button
              type="button"
              :label="cancelLabel"
              severity="secondary"
              text
              size="small"
              :disabled="saving"
              @click="cancelEdit"
            />
            <Button
              type="button"
              :label="saveLabel"
              size="small"
              :loading="saving"
              :disabled="saveDisabled"
              @click="save"
            />
          </template>
        </slot>
      </div>
    </div>

    <Transition name="rm-section-edit-fade" mode="out-in">
      <div v-if="editing" key="edit" ref="bodyRef" class="rm-section-edit__body">
        <slot name="edit" />
      </div>
      <div v-else key="view" class="rm-section-edit__body">
        <slot name="view" />
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="rm-section-edit-footer">
        <div v-if="showStickyFooter" class="rm-section-edit__sticky-footer">
          <div class="rm-section-edit__sticky-footer-extra">
            <slot name="footer-extra" />
          </div>
          <div class="rm-section-edit__sticky-footer-actions">
            <Button
              type="button"
              :label="cancelLabel"
              severity="secondary"
              outlined
              :disabled="saving"
              @click="cancelEdit"
            />
            <Button
              type="button"
              :label="saveLabel"
              :loading="saving"
              :disabled="saveDisabled"
              @click="save"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.rm-section-edit {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rm-section-edit__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rm-section-edit__title {
  font-weight: 800;
  color: var(--rm-text);
}

.rm-section-edit__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.rm-section-edit--section .rm-section-edit__title {
  font-size: 1rem;
}

.rm-section-edit--row {
  gap: 4px;
}

.rm-section-edit--row .rm-section-edit__title {
  font-size: 0.9rem;
  font-weight: 700;
}

.rm-section-edit__sticky-footer {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 60;
  width: min(760px, calc(100vw - 24px));
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(14px);
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

.rm-section-edit__sticky-footer-extra {
  flex: 1;
  min-width: 0;
}

.rm-section-edit__sticky-footer-extra:empty {
  display: none;
}

.rm-section-edit__sticky-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.rm-section-edit-footer-enter-active,
.rm-section-edit-footer-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.rm-section-edit-footer-enter-from,
.rm-section-edit-footer-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.rm-section-edit-fade-enter-active,
.rm-section-edit-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.rm-section-edit-fade-enter-from {
  opacity: 0;
  transform: translateY(2px);
}

.rm-section-edit-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

@media (max-width: 767px) {
  .rm-section-edit__sticky-footer-actions {
    width: 100%;
    margin-left: 0;
  }

  .rm-section-edit__sticky-footer-actions :deep(.p-button) {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rm-section-edit-fade-enter-active,
  .rm-section-edit-fade-leave-active,
  .rm-section-edit-footer-enter-active,
  .rm-section-edit-footer-leave-active {
    transition: none;
  }
}
</style>
