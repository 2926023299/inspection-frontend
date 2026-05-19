<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const tools = [
  {
    id: 'timestamp',
    title: '时间戳转换',
    desc: '时间戳与日期时间互相转换，支持秒/毫秒',
    icon: '&#9201;',
    route: '/tools/timestamp',
  },
  {
    id: 'measure-id',
    title: '量测ID拼接',
    desc: '设备ID二进制位替换量测值，拼接时间范围',
    icon: '&#9881;',
    route: '/tools/measure-id',
  },
]

function goTool(route) {
  router.push(route)
}
</script>

<template>
  <div class="tools-home">
    <header class="tools-header">
      <h1 class="tools-title">工具合集</h1>
      <p class="tools-subtitle">常用开发运维工具，持续扩展中</p>
    </header>
    <div class="tools-grid">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="tool-entry"
        @click="goTool(tool.route)"
      >
        <div class="tool-entry__icon" v-html="tool.icon" />
        <div class="tool-entry__info">
          <h3>{{ tool.title }}</h3>
          <p>{{ tool.desc }}</p>
        </div>
        <span class="tool-entry__arrow">&#8250;</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-home {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.tools-header {
  margin-bottom: 4px;
}

.tools-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.tools-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.tools-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-entry {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: var(--bg-card, #fff);
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.tool-entry:hover {
  border-color: var(--brand, #c35f37);
  box-shadow: 0 2px 12px rgba(195, 95, 55, 0.1);
  transform: translateY(-2px);
}

.tool-entry__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-soft, rgba(195, 95, 55, 0.1));
  font-size: 22px;
  flex-shrink: 0;
}

.tool-entry__info {
  flex: 1;
  min-width: 0;
}

.tool-entry__info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.tool-entry__info p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.tool-entry__arrow {
  font-size: 20px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .tools-home {
    padding: 16px;
  }
}
</style>
