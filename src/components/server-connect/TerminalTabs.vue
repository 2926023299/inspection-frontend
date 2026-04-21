<script setup>
import { computed, ref } from 'vue'
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
const terminalPaneRefs = ref({})

const activeSession = computed(() => props.sessions.find((session) => session.sessionId === props.activeSessionId) || null)

function setTerminalPaneRef(sessionId, instance) {
  if (!instance) {
    delete terminalPaneRefs.value[sessionId]
    return
  }
  terminalPaneRefs.value[sessionId] = instance
}

async function copyActiveTerminal() {
  const pane = terminalPaneRefs.value[props.activeSessionId]
  await pane?.copyTerminal?.()
}

function clearActiveTerminal() {
  const pane = terminalPaneRefs.value[props.activeSessionId]
  pane?.clearTerminal?.()
}
</script>

<template>
  <section class="terminal-tabs glass-panel" :class="{ 'is-collapsed': props.collapsed }">
    <div class="terminal-tabs__head" role="button" tabindex="0" @click="emit('toggle-collapse')">
      <div class="terminal-tabs__label">
        <span class="terminal-tabs__arrow">{{ props.collapsed ? '▸' : '▾' }}</span>
        <div>
          <p>INTERACTIVE TERMINALS</p>
          <h2>终端会话</h2>
        </div>
      </div>
      <div v-if="!props.collapsed" class="terminal-tabs__actions">
        <el-button text :disabled="!activeSession" @click.stop="clearActiveTerminal">清屏</el-button>
        <el-button text :disabled="!activeSession" @click.stop="copyActiveTerminal">复制</el-button>
        <el-button text :disabled="!activeSession" @click.stop="emit('reconnect', activeSession?.sessionId)">重连</el-button>
      </div>
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
        :ref="(instance) => setTerminalPaneRef(session.sessionId, instance)"
        :session="session"
        :active="props.activeSessionId === session.sessionId"
        @status-change="emit('status-change', $event)"
        @cwd-change="emit('cwd-change', $event)"
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px 8px;
  cursor: pointer;
}

.terminal-tabs__label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.terminal-tabs__arrow {
  color: rgba(240, 237, 231, 0.68);
  font-size: 14px;
  line-height: 1;
}

.terminal-tabs__label p {
  margin: 0;
  color: rgba(240, 237, 231, 0.54);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.terminal-tabs__label h2 {
  margin: 10px 0 0;
  font-size: 24px;
}

.terminal-tabs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
  padding: 20px 8px 10px;
}

.terminal-tabs.is-collapsed .terminal-tabs__label {
  flex-direction: column;
}

.terminal-tabs.is-collapsed .terminal-tabs__label p,
.terminal-tabs.is-collapsed .terminal-tabs__label h2 {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
}

.terminal-tabs.is-collapsed .terminal-tabs__label h2 {
  font-size: 18px;
  letter-spacing: 0.14em;
}
</style>
