<script setup>
const emit = defineEmits(['click'])

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    default: '--',
  },
  caption: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'brand',
  },
  interactive: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <article
    class="metric-card"
    :data-tone="props.tone"
    :data-interactive="props.interactive"
    :data-active="props.active"
    @click="emit('click')"
  >
    <div class="metric-head">
      <span class="metric-label">{{ props.label }}</span>
      <span class="metric-signal" />
    </div>
    <div class="metric-core">
      <strong class="metric-value">{{ props.value }}</strong>
    </div>
    <span v-if="props.caption" class="metric-caption">{{ props.caption }}</span>
  </article>
</template>

<style scoped>
.metric-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 162px;
  padding: 24px 24px 22px;
  border-radius: 22px;
  border: 1px solid rgba(30, 42, 51, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(250, 245, 237, 0.92));
  box-shadow: 0 16px 36px rgba(52, 47, 39, 0.14);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.metric-card::after {
  content: "";
  position: absolute;
  inset: auto auto 0 0;
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, var(--brand), rgba(195, 95, 55, 0.08));
}

.metric-card::before {
  content: "";
  position: absolute;
  top: 16px;
  right: 16px;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  transform: rotate(12deg);
  background: rgba(195, 95, 55, 0.08);
}

.metric-card[data-tone="success"]::after {
  background: linear-gradient(90deg, var(--success), rgba(47, 125, 99, 0.08));
}

.metric-card[data-tone="success"]::before {
  background: rgba(47, 125, 99, 0.1);
}

.metric-card[data-tone="warning"]::after {
  background: linear-gradient(90deg, var(--warning), rgba(185, 134, 44, 0.08));
}

.metric-card[data-tone="warning"]::before {
  background: rgba(185, 134, 44, 0.1);
}

.metric-card[data-tone="danger"]::after {
  background: linear-gradient(90deg, var(--danger), rgba(188, 75, 61, 0.08));
}

.metric-card[data-tone="danger"]::before {
  background: rgba(188, 75, 61, 0.1);
}

.metric-head,
.metric-core,
.metric-caption {
  position: relative;
  z-index: 1;
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.metric-signal {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 6px rgba(195, 95, 55, 0.12);
}

.metric-card[data-tone="success"] .metric-signal {
  background: var(--success);
  box-shadow: 0 0 0 6px rgba(47, 125, 99, 0.12);
}

.metric-card[data-tone="warning"] .metric-signal {
  background: var(--warning);
  box-shadow: 0 0 0 6px rgba(185, 134, 44, 0.12);
}

.metric-card[data-tone="danger"] .metric-signal {
  background: var(--danger);
  box-shadow: 0 0 0 6px rgba(188, 75, 61, 0.12);
}

.metric-label {
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.metric-value {
  font-size: 40px;
  line-height: 1;
  letter-spacing: 0.06em;
}

.metric-caption {
  color: var(--text-subtle);
  font-size: 12px;
  max-width: 18ch;
}

.metric-card[data-interactive="true"] {
  cursor: pointer;
}

.metric-card[data-interactive="true"]:hover {
  transform: translateY(-4px);
  border-color: rgba(195, 95, 55, 0.3);
  box-shadow: 0 20px 40px rgba(52, 47, 39, 0.18);
}

.metric-card[data-active="true"] {
  transform: translateY(-4px);
  border-color: rgba(195, 95, 55, 0.48);
  box-shadow:
    0 24px 46px rgba(52, 47, 39, 0.2),
    inset 0 0 0 1px rgba(195, 95, 55, 0.18);
}

.metric-card[data-active="true"]::before {
  background: rgba(30, 42, 51, 0.1);
}
</style>
