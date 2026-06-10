<script setup>
import { computed } from 'vue'
import TerminalPane from '@/components/server-connect/TerminalPane.vue'

const props = defineProps({
  sessions: {
    type: Array,
    default: () => [],
  },
  activeSessionId: {
    type: String,
    default: '',
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'close', 'status-change', 'cwd-change', 'reconnect', 'toggle-collapse'])

const activeSession = computed(() => props.sessions.find((session) => session.sessionId === props.activeSessionId) || null)
</script>

<template>
  <section class="terminal-tabs glass-panel" :class="{ 'is-collapsed': props.collapsed }">
    <div class="terminal-tabs__head" role="button" tabindex="0" @click="emit('toggle-collapse')">
      <span v-if="props.collapsed" class="terminal-tabs__arrow">{{ props.collapsed ? '▸' : '▾' }}</span>
    </div>

    <div v-if="!props.collapsed" class="terminal-tabs__tablist">
      <button
        v-for="session in props.sessions"
        :key="session.sessionId"
        class="terminal-tab"
        :class="{ 'is-active': props.activeSessionId === session.sessionId }"
        type="button"
        @click="emit('select', session.sessionId)"
      >
        <span class="terminal-tab__status" :data-status="session.status" />
        <span class="terminal-tab__title">{{ session.displayName }}</span>
        <span class="terminal-tab__close" @click.stop="emit('close', session.sessionId)">×</span>
      </button>
    </div>

    <div v-if="props.collapsed" class="terminal-tabs__collapsed-summary">
      <span>终端</span>
      <strong>{{ props.sessions.length }}</strong>
    </div>

    <div v-else-if="!props.sessions.length" class="terminal-tabs__empty">
      <el-empty description="选择左侧服务器开始建立终端会话" :image-size="90" />
    </div>

    <div v-else class="terminal-tabs__body">
      <TerminalPane
        v-for="session in props.sessions"
        :key="session.sessionId"
        :session="session"
        :active="props.activeSessionId === session.sessionId"
        @status-change="emit('status-change', $event)"
        @cwd-change="emit('cwd-change', $event)"
        @reconnect="emit('reconnect', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.terminal-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #121b2a 0%, #0c1320 100%);
  color: #f0ede7;
}

.terminal-tabs::before {
  background: linear-gradient(90deg, var(--brand), rgba(255, 255, 255, 0.12));
}

.terminal-tabs__head {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px 6px;
  cursor: pointer;
}

.terminal-tabs__arrow {
  color: rgba(240, 237, 231, 0.68);
  font-size: 14px;
  line-height: 1;
}

.terminal-tabs__tablist {
  display: flex;
  gap: 10px;
  padding: 12px 18px 10px;
  overflow: auto;
}

.terminal-tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  min-width: 0;
}

.terminal-tab.is-active {
  border-color: rgba(195, 95, 55, 0.42);
  background: rgba(195, 95, 55, 0.14);
}

.terminal-tab__status {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.terminal-tab__status[data-status="connected"] {
  background: var(--success);
}

.terminal-tab__status[data-status="error"] {
  background: var(--danger);
}

.terminal-tab__status[data-status="closed"] {
  background: var(--warning);
}

.terminal-tab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-tab__close {
  font-size: 18px;
  line-height: 1;
  opacity: 0.7;
}

.terminal-tabs__empty,
.terminal-tabs__body {
  flex: 1;
  min-height: 0;
}

.terminal-tabs__collapsed-summary {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(240, 237, 231, 0.6);
}

.terminal-tabs__collapsed-summary strong {
  font-size: 26px;
  color: #f0ede7;
}

.terminal-tabs__body {
  height: 100%;
  padding: 0 14px 14px;
  overflow: hidden;
}

.terminal-tabs.is-collapsed {
  padding: 0;
}

.terminal-tabs.is-collapsed .terminal-tabs__head {
  justify-content: center;
  padding: 14px 8px 6px;
}
</style>
