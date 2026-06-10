<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listServerBookmarks,
  saveServerBookmark as apiSaveServerBookmark,
  deleteServerBookmark as apiDeleteServerBookmark,
} from '@/api/serverConnections'

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

const charsetMap = reactive({})
const charsetOptions = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'GBK', value: 'GBK' },
]

function getCharset(serverKey) {
  return charsetMap[serverKey] || 'UTF-8'
}

function setCharset(serverKey, value) {
  charsetMap[serverKey] = value
}

/* ---- 服务器收藏 ---- */
const serverBookmarks = ref([])
const bookmarkMap = computed(() => {
  const map = {}
  serverBookmarks.value.forEach((b) => { map[b.serverKey] = b })
  return map
})

// 排序后的服务器列表：收藏的排在前面
const sortedServers = computed(() => {
  const keyword = (props.modelValue || '').toLowerCase()
  const filtered = keyword
    ? props.servers.filter((s) =>
      s.ip?.toLowerCase().includes(keyword) ||
      s.username?.toLowerCase().includes(keyword) ||
      s.displayName?.toLowerCase().includes(keyword),
    )
    : props.servers

  const bookmarked = []
  const normal = []
  for (const server of filtered) {
    if (bookmarkMap.value[server.serverKey]) {
      bookmarked.push(server)
    } else {
      normal.push(server)
    }
  }
  return [...bookmarked, ...normal]
})

async function loadServerBookmarks() {
  try {
    const res = await listServerBookmarks()
    serverBookmarks.value = Array.isArray(res) ? res : []
  } catch {
    serverBookmarks.value = []
  }
}

onMounted(loadServerBookmarks)

function isBookmarked(serverKey) {
  return Boolean(bookmarkMap.value[serverKey])
}

function getBookmarkAlias(serverKey) {
  return bookmarkMap.value[serverKey]?.alias || ''
}

async function toggleBookmark(server) {
  const existing = bookmarkMap.value[server.serverKey]
  if (existing) {
    try {
      await apiDeleteServerBookmark(existing.id)
      await loadServerBookmarks()
    } catch (err) {
      ElMessage.error(err.message || '取消收藏失败')
    }
  } else {
    try {
      await apiSaveServerBookmark({
        serverKey: server.serverKey,
        alias: '',
      })
      ElMessage.success('已收藏')
      await loadServerBookmarks()
    } catch (err) {
      ElMessage.error(err.message || '收藏失败')
    }
  }
}

/* ---- 别名编辑 ---- */
const aliasDialogVisible = ref(false)
const aliasForm = ref({ serverKey: '', alias: '' })
const aliasBookmarkId = ref(null)

function openAliasDialog(server) {
  const bm = bookmarkMap.value[server.serverKey]
  aliasBookmarkId.value = bm?.id || null
  aliasForm.value = {
    serverKey: server.serverKey,
    alias: bm?.alias || server.displayName || '',
  }
  aliasDialogVisible.value = true
}

async function handleAliasConfirm() {
  try {
    await apiSaveServerBookmark({
      id: aliasBookmarkId.value,
      serverKey: aliasForm.value.serverKey,
      alias: aliasForm.value.alias.trim(),
    })
    await loadServerBookmarks()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
  aliasDialogVisible.value = false
}
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
      <article
        v-for="server in sortedServers"
        :key="server.serverKey"
        class="catalog-card"
        :class="{ 'is-bookmarked': isBookmarked(server.serverKey) }"
      >
        <div class="catalog-card__head">
          <div class="catalog-card__info">
            <div class="catalog-card__title-row">
              <button
                type="button"
                class="bookmark-star"
                :class="{ 'is-active': isBookmarked(server.serverKey) }"
                title="收藏"
                @click.stop="toggleBookmark(server)"
              >
                {{ isBookmarked(server.serverKey) ? '★' : '☆' }}
              </button>
              <strong>{{ server.ip }}</strong>
            </div>
            <span v-if="!props.collapsed" class="catalog-card__meta">
              {{ server.username }} · {{ server.port }}
            </span>
            <span v-if="getBookmarkAlias(server.serverKey)" class="catalog-card__alias">
              {{ getBookmarkAlias(server.serverKey) }}
            </span>
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

        <div class="catalog-actions">
          <el-select
            v-if="!props.collapsed"
            :model-value="getCharset(server.serverKey)"
            size="small"
            style="width: 90px"
            @update:model-value="setCharset(server.serverKey, $event)"
          >
            <el-option
              v-for="option in charsetOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-button
            v-if="!props.collapsed && isBookmarked(server.serverKey)"
            size="small"
            text
            @click.stop="openAliasDialog(server)"
          >
            备注
          </el-button>
          <el-button type="primary" :loading="props.connecting" @click="emit('connect', server.serverKey, getCharset(server.serverKey))">
            {{ props.collapsed ? '连' : '连接' }}
          </el-button>
        </div>
      </article>
    </div>

    <el-dialog
      v-model="aliasDialogVisible"
      title="设置备注名称"
      width="360px"
      :append-to-body="true"
      destroy-on-close
    >
      <el-form label-width="60px">
        <el-form-item label="备注">
          <el-input v-model="aliasForm.alias" placeholder="例如：生产服务器" maxlength="30" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="aliasDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAliasConfirm">确定</el-button>
      </template>
    </el-dialog>
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
  transition: border-color 0.2s;
}

.catalog-card.is-bookmarked {
  border-color: rgba(230, 162, 60, 0.35);
  background: rgba(255, 248, 230, 0.9);
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

.catalog-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.catalog-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.catalog-card__title-row strong {
  font-size: 18px;
}

.bookmark-star {
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  color: #c0c4cc;
  padding: 0;
  line-height: 1;
  transition: color 0.2s, transform 0.15s;
}

.bookmark-star:hover {
  transform: scale(1.2);
}

.bookmark-star.is-active {
  color: #e6a23c;
}

.catalog-card__meta {
  color: var(--text-subtle);
  font-size: 12px;
}

.catalog-card__alias {
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 600;
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

.catalog-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
</style>
