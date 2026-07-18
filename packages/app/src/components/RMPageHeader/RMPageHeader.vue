<script lang="ts" setup>
import Toolbar from 'primevue/toolbar'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  centered: { type: Boolean, default: false }
})
</script>

<template>
  <Toolbar
    class="rm-page-header"
    :class="{ 'rm-page-header--centered': centered }"
  >
    <template #start>
      <div class="rm-page-header__body">
        <div class="rm-page-header__title_row">
          <i v-if="icon" :class="icon" class="rm-page-header__icon" />
          <h1 class="rm-page-header__title">{{ title }}</h1>
        </div>
        <p v-if="subtitle" class="rm-page-header__subtitle">{{ subtitle }}</p>
        <p v-if="description" class="rm-page-header__description">
          {{ description }}
        </p>
      </div>
    </template>
    <template #end>
      <div v-if="$slots.actions" class="rm-page-header__actions">
        <slot name="actions" />
      </div>
    </template>
  </Toolbar>
</template>

<style lang="scss" scoped>
.rm-page-header {
  width: 100%;
}

.rm-page-header :deep(.p-toolbar) {
  align-items: flex-start;
  gap: 14px;
  padding: clamp(16px, 2vw, 20px);
}

.rm-page-header :deep(.p-toolbar-start) {
  flex: 1 1 320px;
  min-width: 0;
}

.rm-page-header :deep(.p-toolbar-end) {
  flex: 0 0 auto;
}

.rm-page-header__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rm-page-header__title_row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rm-page-header__icon {
  font-size: 1.3rem;
  color: var(--rm-primary);
}

.rm-page-header__title {
  margin: 0;
  font-size: clamp(1.35rem, 3.4vw, 1.9rem);
  font-weight: 800;
  line-height: 1.2;
  color: var(--rm-text);
}

.rm-page-header__subtitle {
  margin: 0;
  display: inline-flex;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(161, 194, 225, 0.18);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--rm-primary);
}

.rm-page-header__description {
  margin: 0;
  max-width: 72ch;
  line-height: 1.6;
  color: var(--rm-text-soft);
}

.rm-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.rm-page-header__actions > * {
  flex: 0 1 auto;
  max-width: 100%;
}

.rm-page-header--centered :deep(.p-toolbar-start),
.rm-page-header--centered :deep(.p-toolbar-end) {
  width: 100%;
}

.rm-page-header--centered .rm-page-header__body,
.rm-page-header--centered .rm-page-header__actions {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.rm-page-header--centered .rm-page-header__subtitle {
  margin-inline: auto;
}

@media (max-width: 767px) {
  .rm-page-header :deep(.p-toolbar) {
    flex-direction: column;
  }

  .rm-page-header :deep(.p-toolbar-end) {
    width: 100%;
  }

  .rm-page-header__title_row {
    align-items: flex-start;
  }

  .rm-page-header__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .rm-page-header__actions > * {
    flex: 1 1 100%;
  }
}
</style>
