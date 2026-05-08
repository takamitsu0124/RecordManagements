<script setup lang="ts">
type FlowGuideItem = {
  title: string
  description: string
  targetId: string
}

const emit = defineEmits<{
  (e: 'select', item: FlowGuideItem): void
}>()

const props = defineProps<{
  title: string
  description: string
  items: FlowGuideItem[]
}>()

const scrollToSection = (targetId: string) => {
  const element = document.getElementById(targetId)
  if (!element) return

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const onSelectItem = (item: FlowGuideItem) => {
  scrollToSection(item.targetId)
  emit('select', item)
}
</script>

<template>
  <section class="rm-flow-guide" aria-label="画面ガイド">
    <div class="rm-flow-guide__intro">
      <div class="rm-flow-guide__eyebrow">この画面でやること</div>
      <div class="rm-flow-guide__title">{{ title }}</div>
      <p class="rm-flow-guide__description">{{ description }}</p>
    </div>

    <div class="rm-flow-guide__grid">
      <button
        v-for="(item, index) in props.items"
        :key="`${item.targetId}-${index}`"
        type="button"
        class="rm-flow-guide__item"
        @click="onSelectItem(item)"
      >
        <span class="rm-flow-guide__index">{{ index + 1 }}</span>
        <div class="rm-flow-guide__body">
          <div class="rm-flow-guide__item-title">{{ item.title }}</div>
          <p class="rm-flow-guide__item-description">
            {{ item.description }}
          </p>
        </div>
        <i class="pi pi-arrow-right rm-flow-guide__arrow" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.rm-flow-guide {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  background: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0.92),
    rgba(255, 255, 255, 0.9)
  );
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.rm-flow-guide__intro {
  display: grid;
  gap: 6px;
}

.rm-flow-guide__eyebrow {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rm-primary);
}

.rm-flow-guide__title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--rm-text);
}

.rm-flow-guide__description {
  margin: 0;
  line-height: 1.7;
  color: var(--rm-text-soft);
}

.rm-flow-guide__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.rm-flow-guide__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border-radius: 18px;
  border: 1px solid rgba(191, 219, 254, 0.85);
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.rm-flow-guide__item:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.92);
  box-shadow: 0 12px 22px rgba(59, 130, 246, 0.12);
}

.rm-flow-guide__index {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--rm-primary);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
}

.rm-flow-guide__body {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.rm-flow-guide__item-title {
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--rm-text);
}

.rm-flow-guide__item-description {
  margin: 0;
  line-height: 1.65;
  color: var(--rm-text-soft);
}

.rm-flow-guide__arrow {
  margin-top: 2px;
  color: var(--rm-primary);
}

@media (max-width: 767px) {
  .rm-flow-guide {
    padding: 14px;
  }

  .rm-flow-guide__grid {
    grid-template-columns: 1fr;
  }
}
</style>
