<script setup>
const props = defineProps({
  servers: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  connecting: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: String,
    default: '',
  },
  connectedServerKeys: {
    type: Array,
    default: () => [],
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'connect', 'toggle-collapse'])
</script>

<template>
  <section class="connect-catalog glass-panel" :class="{ 'is-collapsed': props.collapsed }">
    <div class="catalog-head" role="button" tabindex="0" @click="emit('toggle-collapse')">
      <div class="catalog-head__title">
        <span class="catalog-head__arrow">{{ props.collapsed ? '▸' : '▾' }}</span>
        <div>
          <p class="catalog-kicker">SERVER CATALOG</p>
          <h2>服务器列表</h2>
        </div>
      </div>
      <el-button v-if="!props.collapsed" text @click.stop="$emit('connect', null)">刷新</el-button>
    </div>

    <el-input
      v-if="!props.collapsed"
      :model-value="props.modelValue"
      placeholder="按 IP 或用户名筛选"
      clearable
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div v-if="!props.collapsed" v-loading="props.loading" class="catalog-list">
      <article v-for="server in props.servers" :key="server.serverKey" class="catalog-card">
        <div class="catalog-card__head">
          <div>
            <strong>{{ server.ip }}</strong>
            <span v-if="!props.collapsed">{{ server.username }} · {{ server.port }}</span>
          </div>
          <span
            v-if="!props.collapsed"
            class="catalog-status"
            :class="{ 'is-online': props.connectedServerKeys.includes(server.serverKey) }"
          >
            {{ props.connectedServerKeys.includes(server.serverKey) ? '已连接' : '未连接' }}
          </span>
        </div>

        <p v-if="!props.collapsed" class="catalog-name">{{ server.displayName }}</p>

        <div v-if="!props.collapsed" class="catalog-tags">
          <el-tag v-for="jar in server.jars.slice(0, 3)" :key="jar" round effect="plain">{{ jar }}</el-tag>
          <span v-if="server.jars.length > 3" class="catalog-more">+{{ server.jars.length - 3 }}</span>
        </div>

        <el-button type="primary" :loading="props.connecting" @click="emit('connect', server.serverKey)">
          {{ props.collapsed ? '连' : '连接' }}
        </el-button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.connect-catalog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  transition: padding 0.2s ease;
}

.connect-catalog.is-collapsed {
  padding: 18px 12px;
  align-items: center;
}

.catalog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.catalog-head__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.catalog-head__arrow {
  color: var(--text-subtle);
  font-size: 14px;
  line-height: 1;
}

.catalog-head h2 {
  margin: 8px 0 0;
  font-size: 24px;
}

.catalog-kicker {
  margin: 0;
  color: var(--text-subtle);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.connect-catalog.is-collapsed .catalog-head {
  width: 100%;
  min-height: 100%;
  justify-content: center;
}

.connect-catalog.is-collapsed .catalog-head__title {
  flex-direction: column;
}

.connect-catalog.is-collapsed .catalog-kicker,
.connect-catalog.is-collapsed .catalog-head h2 {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
}

.connect-catalog.is-collapsed .catalog-head h2 {
  font-size: 18px;
  letter-spacing: 0.16em;
}

.catalog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 300px;
  max-height: calc(100vh - 320px);
  overflow: auto;
}

.catalog-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(30, 42, 51, 0.08);
  background: rgba(255, 252, 247, 0.82);
}

.connect-catalog.is-collapsed .catalog-card {
  padding: 14px 10px;
  gap: 10px;
}

.catalog-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.catalog-card__head strong {
  display: block;
  font-size: 18px;
}

.catalog-card__head span,
.catalog-name {
  color: var(--text-subtle);
}

.catalog-status {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.08);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.catalog-status.is-online {
  background: rgba(47, 125, 99, 0.14);
  color: var(--success);
}

.catalog-name {
  margin: 0;
  font-size: 13px;
}

.catalog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog-more {
  color: var(--text-subtle);
  font-size: 12px;
}
</style>
