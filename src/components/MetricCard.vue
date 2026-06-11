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
  gap: 10px;
  min-height: 112px;
  padding: 16px 16px 14px;
  border-radius: 12px;
  border: 1px solid rgba(30, 41, 59, 0.06);
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(30, 41, 59, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.metric-card::after {
  content: "";
  position: absolute;
  inset: auto auto 0 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--brand), rgba(59, 130, 246, 0.1));
}

.metric-card::before {
  content: "";
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  transform: rotate(12deg);
  background: rgba(59, 130, 246, 0.06);
}

.metric-card[data-tone="success"]::after {
  background: linear-gradient(90deg, var(--success), rgba(34, 197, 94, 0.1));
}

.metric-card[data-tone="success"]::before {
  background: rgba(34, 197, 94, 0.08);
}

.metric-card[data-tone="warning"]::after {
  background: linear-gradient(90deg, var(--warning), rgba(245, 158, 11, 0.1));
}

.metric-card[data-tone="warning"]::before {
  background: rgba(245, 158, 11, 0.08);
}

.metric-card[data-tone="danger"]::after {
  background: linear-gradient(90deg, var(--danger), rgba(239, 68, 68, 0.1));
}

.metric-card[data-tone="danger"]::before {
  background: rgba(239, 68, 68, 0.08);
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
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.metric-card[data-tone="success"] .metric-signal {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.metric-card[data-tone="warning"] .metric-signal {
  background: var(--warning);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.metric-card[data-tone="danger"] .metric-signal {
  background: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.metric-label {
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metric-value {
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.02em;
}

.metric-caption {
  color: var(--text-subtle);
  font-size: 11px;
  max-width: 22ch;
}

.metric-card[data-interactive="true"] {
  cursor: pointer;
}

.metric-card[data-interactive="true"]:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.2);
  box-shadow: 0 4px 20px rgba(30, 41, 59, 0.1);
}

.metric-card[data-active="true"] {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow:
    0 4px 20px rgba(30, 41, 59, 0.1),
    inset 0 0 0 1px rgba(59, 130, 246, 0.12);
}

.metric-card[data-active="true"]::before {
  background: rgba(59, 130, 246, 0.1);
}
</style>
