<script lang="ts" setup>
defineProps({
  icon: { type: String, default: 'pi pi-inbox' },
  title: { type: String, required: true },
  message: { type: String, default: '' }
})
</script>

<template>
  <div class="rm-empty-state">
    <div class="rm-empty-state__icon_wrap">
      <i :class="icon" class="rm-empty-state__icon" />
    </div>
    <div class="rm-empty-state__title">{{ title }}</div>
    <p v-if="message" class="rm-empty-state__message">{{ message }}</p>
    <div v-if="$slots.actions" class="rm-empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.rm-empty-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 28px 20px;
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
}

.rm-empty-state__icon_wrap {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(161, 194, 225, 0.18),
    rgba(75, 105, 130, 0.1)
  );
}

.rm-empty-state__icon {
  font-size: 1.5rem;
  color: var(--rm-primary);
}

.rm-empty-state__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--rm-text);
}

.rm-empty-state__message {
  margin: 0;
  max-width: 560px;
  line-height: 1.7;
  color: var(--rm-text-soft);
}

.rm-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.rm-empty-state__actions > * {
  flex: 0 1 220px;
  max-width: 100%;
}

@media (max-width: 767px) {
  .rm-empty-state__actions {
    width: 100%;
  }

  .rm-empty-state__actions > * {
    flex: 1 1 100%;
  }
}
</style>
