<script setup>
import { computed, defineExpose, toRef } from 'vue'
import { useTerminalSession } from '@/composables/useTerminalSession'

const props = defineProps({
  session: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['status-change', 'cwd-change'])
const sessionRef = toRef(props, 'session')
const activeRef = computed(() => props.active)

const { terminalRef, clearTerminal, copyTerminal } = useTerminalSession(
  sessionRef,
  activeRef,
  (sessionId, status, message) => emit('status-change', { sessionId, status, message }),
  (sessionId, cwd) => emit('cwd-change', { sessionId, cwd }),
)

defineExpose({
  clearTerminal,
  copyTerminal,
})
</script>

<template>
  <div class="terminal-pane" :class="{ 'is-hidden': !props.active }">
    <div class="terminal-pane__meta">
      <span class="terminal-pane__name">{{ props.session.displayName }}</span>
      <span class="terminal-pane__cwd">{{ props.session.cwd || '--' }}</span>
    </div>
    <div ref="terminalRef" class="terminal-pane__screen" />
  </div>
</template>

<style scoped>
.terminal-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.terminal-pane.is-hidden {
  display: none;
}

.terminal-pane__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(240, 237, 231, 0.74);
  font-size: 12px;
}

.terminal-pane__name {
  font-weight: 700;
  letter-spacing: 0.06em;
}

.terminal-pane__screen {
  flex: 1;
  min-height: 0;
  height: 100%;
  margin: 8px 10px 10px;
  overflow: hidden;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-screen),
:deep(.xterm-viewport) {
  height: 100% !important;
}
</style>
