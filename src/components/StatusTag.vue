<script setup>
import { computed } from 'vue'
import { getStatusMeta } from '@/utils/inspection'

const props = defineProps({
  status: {
    type: Number,
    default: 0,
  },
})

const statusMeta = computed(() => getStatusMeta(props.status))
</script>

<template>
  <span class="status-tag" :data-tone="statusMeta.tone">
    <span class="status-dot" />
    {{ statusMeta.label }}
  </span>
</template>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(30, 42, 51, 0.1);
  background: rgba(255, 252, 247, 0.9);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 4px rgba(195, 95, 55, 0.12);
}

.status-tag[data-tone="success"] {
  color: var(--success);
}

.status-tag[data-tone="success"] .status-dot {
  background: var(--success);
  box-shadow: 0 0 0 4px rgba(47, 125, 99, 0.14);
}

.status-tag[data-tone="warning"] {
  color: var(--warning);
}

.status-tag[data-tone="warning"] .status-dot {
  background: var(--warning);
  box-shadow: 0 0 0 4px rgba(185, 134, 44, 0.14);
}

.status-tag[data-tone="danger"] {
  color: var(--danger);
}

.status-tag[data-tone="danger"] .status-dot {
  background: var(--danger);
  box-shadow: 0 0 0 4px rgba(188, 75, 61, 0.14);
}
</style>
