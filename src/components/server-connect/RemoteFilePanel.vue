<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { listBookmarks, saveBookmark as apiSaveBookmark, deleteBookmark as apiDeleteBookmark } from '@/api/serverConnections'

const props = defineProps({
  session: {
    type: Object,
    default: null,
  },
  state: {
    type: Object,
    default: () => ({
      cwd: '',
      parentPath: '',
      breadcrumbs: [],
      entries: [],
    }),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  uploading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'toggle-collapse',
  'refresh',
  'go-parent',
  'open-path',
  'download',
  'request-upload',
  'create-directory',
  'rename',
  'delete',
])

const pathInput = ref('')
const uploadInputRef = ref(null)
const dragActive = ref(false)

watch(
  () => props.state.cwd,
  (cwd) => {
    pathInput.value = cwd || ''
  },
  { immediate: true },
)

const hasSession = computed(() => Boolean(props.session?.sessionId))

function submitPath() {
  if (!pathInput.value) return
  emit('open-path', pathInput.value)
}

function triggerUpload() {
  uploadInputRef.value?.click()
}

function handleUploadChange(event) {
  const files = Array.from(event.target.files || [])
  if (files.length) {
    emit('request-upload', files)
  }
  event.target.value = ''
}

function handleDragOver(event) {
  if (!hasSession.value) return
  event.preventDefault()
  dragActive.value = true
}

function handleDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragActive.value = false
  }
}

function handleDrop(event) {
  if (!hasSession.value) return
  event.preventDefault()
  dragActive.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length) {
    emit('request-upload', files)
  }
}

function handleFileCommand(command, row) {
  if (command === 'download') {
    emit('download', { path: row.path, directory: false })
    return
  }

  if (command === 'download-dir') {
    emit('download', { path: row.path, directory: true })
    return
  }

  if (command === 'rename') {
    emit('rename', row)
    return
  }

  if (command === 'delete') {
    emit('delete', row)
  }
}

/* ---- 路径快捷方式（书签） ---- */
const bookmarks = ref([])
const bookmarkDialogVisible = ref(false)
const editingBookmark = ref(null)
const bookmarkForm = ref({ label: '', path: '', scope: 'server' })

function currentServerKey() {
  return props.session?.serverKey || null
}

async function loadBookmarks() {
  try {
    const res = await listBookmarks(currentServerKey())
    bookmarks.value = Array.isArray(res) ? res : []
  } catch {
    bookmarks.value = []
  }
}

onMounted(loadBookmarks)

// 切换服务器时重新加载书签
watch(() => props.session?.serverKey, () => {
  loadBookmarks()
})

function openAddBookmark() {
  editingBookmark.value = null
  bookmarkForm.value = {
    label: '',
    path: props.state.cwd || props.session?.cwd || '/',
    scope: 'server',
  }
  bookmarkDialogVisible.value = true
}

function openEditBookmark(bookmark) {
  editingBookmark.value = bookmark
  bookmarkForm.value = {
    label: bookmark.label,
    path: bookmark.path,
    scope: bookmark.serverKey ? 'server' : 'global',
  }
  bookmarkDialogVisible.value = true
}

async function handleBookmarkConfirm() {
  const label = bookmarkForm.value.label.trim()
  const path = bookmarkForm.value.path.trim()
  if (!label || !path) {
    ElMessage.warning('名称和路径不能为空')
    return
  }

  try {
    const serverKey = bookmarkForm.value.scope === 'global' ? null : currentServerKey()
    await apiSaveBookmark({
      id: editingBookmark.value?.id || null,
      label,
      path,
      serverKey,
    })
    ElMessage.success(editingBookmark.value ? '快捷路径已更新' : '快捷路径已添加')
    await loadBookmarks()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }

  bookmarkDialogVisible.value = false
}

async function removeBookmark(bookmark) {
  try {
    await apiDeleteBookmark(bookmark.id)
    await loadBookmarks()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  }
}

function navigateBookmark(bookmark) {
  if (!hasSession.value) return
  emit('open-path', bookmark.path)
}
</script>

<template>
  <section class="remote-files glass-panel" :class="{ 'is-collapsed': props.collapsed }">
    <div class="remote-files__head" role="button" tabindex="0" @click="emit('toggle-collapse')">
      <div class="remote-files__title">
        <span class="remote-files__arrow">{{ props.collapsed ? '▸' : '▾' }}</span>
        <div>
          <p>REMOTE FILE PANEL</p>
          <h2>远程文件</h2>
        </div>
      </div>
      <el-button v-if="!props.collapsed" text :disabled="!hasSession" @click.stop="emit('refresh')">刷新</el-button>
    </div>

    <div v-if="!props.collapsed" class="remote-files__toolbar">
      <el-input
        v-model="pathInput"
        :disabled="!hasSession"
        placeholder="输入远程路径并回车跳转"
        @keyup.enter="submitPath"
      />
      <el-button :disabled="!props.state.parentPath || !hasSession" @click="emit('go-parent')">上级</el-button>
      <el-button type="primary" :disabled="!hasSession" @click="triggerUpload">上传</el-button>
      <el-button :disabled="!hasSession" @click="emit('create-directory')">新建目录</el-button>
      <input ref="uploadInputRef" type="file" multiple class="remote-files__input" @change="handleUploadChange" />
    </div>

    <div v-if="!props.collapsed" class="remote-files__bookmarks">
      <el-tag
        v-for="bm in bookmarks"
        :key="bm.id"
        :effect="bm.path === props.state.cwd ? 'dark' : 'plain'"
        :type="bm.path === props.state.cwd ? 'warning' : (bm.serverKey ? '' : 'info')"
        class="bookmarks__tag"
        closable
        @click="navigateBookmark(bm)"
        @close.stop="removeBookmark(bm)"
      >
        {{ bm.serverKey ? '' : '🌐 ' }}{{ bm.label }}
      </el-tag>
      <el-button
        v-if="hasSession"
        size="small"
        text
        type="primary"
        @click="openAddBookmark"
      >
        + 添加
      </el-button>
      <span v-if="!bookmarks.length && !hasSession" class="bookmarks__empty">连接服务器后可管理快捷路径</span>
    </div>

    <div v-if="!props.collapsed" class="remote-files__breadcrumbs">
      <button
        v-for="item in props.state.breadcrumbs"
        :key="item.path"
        type="button"
        class="breadcrumb-button"
        @click="emit('open-path', item.path)"
      >
        {{ item.label }}
      </button>
    </div>

    <el-alert v-if="!props.collapsed && props.error" type="error" :title="props.error" :closable="false" show-icon />

    <div
      v-loading="props.loading || props.uploading"
      class="remote-files__table"
      :class="{ 'is-drag-active': dragActive }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div v-if="dragActive" class="remote-files__drop-mask">
        <strong>释放文件即可上传到当前目录</strong>
        <span>{{ props.state.cwd || props.session?.cwd || '/' }}</span>
      </div>
      <div v-if="props.collapsed" class="remote-files__collapsed-summary">
        <span>{{ hasSession ? '文件' : '未连接' }}</span>
        <strong>{{ props.state.entries?.length || 0 }}</strong>
      </div>
      <el-empty v-else-if="!hasSession" description="先连接一台服务器，再查看远程文件" :image-size="90" />
      <el-table v-else height="100%" :data="props.state.entries" stripe class="remote-files__inner-table">
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <button
              type="button"
              class="entry-link"
              :class="{ 'is-directory': row.directory }"
              @click="row.directory ? emit('open-path', row.path) : null"
            >
              {{ row.name }}
            </button>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ row.directory ? '目录' : '文件' }}</template>
        </el-table-column>
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{ row.directory ? '--' : row.size }}</template>
        </el-table-column>
        <el-table-column label="修改时间" min-width="170">
          <template #default="{ row }">{{ row.lastModified ? new Date(row.lastModified).toLocaleString('zh-CN') : '--' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="168" fixed="right">
          <template #default="{ row }">
            <div class="file-actions">
              <el-button
                size="small"
                text
                type="primary"
                @click="row.directory ? emit('open-path', row.path) : emit('download', { path: row.path, directory: false })"
              >
                {{ row.directory ? '打开' : '下载' }}
              </el-button>

              <el-dropdown trigger="click" @command="(command) => handleFileCommand(command, row)">
                <el-button size="small" text>
                  更多
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.directory" command="download-dir">压缩下载</el-dropdown-item>
                    <el-dropdown-item v-if="!row.directory" command="download">重新下载</el-dropdown-item>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </section>

  <el-dialog
    v-model="bookmarkDialogVisible"
    :title="editingBookmark ? '编辑快捷路径' : '添加快捷路径'"
    width="420px"
    :append-to-body="true"
    destroy-on-close
  >
    <el-form label-width="60px">
      <el-form-item v-if="currentServerKey()" label="范围">
        <el-radio-group v-model="bookmarkForm.scope">
          <el-radio value="server">当前服务器</el-radio>
          <el-radio value="global">全局共享</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="bookmarkForm.label" placeholder="例如：日志目录" maxlength="30" />
      </el-form-item>
      <el-form-item label="路径">
        <el-input v-model="bookmarkForm.path" placeholder="例如：/var/log" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="bookmarkDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleBookmarkConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.remote-files {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  min-height: 0;
  overflow: hidden;
}

.remote-files.is-collapsed {
  padding: 18px 12px;
}

.remote-files__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.remote-files__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.remote-files__arrow {
  color: var(--text-subtle);
  font-size: 14px;
  line-height: 1;
}

.remote-files__head p {
  margin: 0;
  color: var(--text-subtle);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.remote-files__head h2 {
  margin: 8px 0 0;
  font-size: 24px;
}

.remote-files.is-collapsed .remote-files__head {
  min-height: 100%;
  align-items: center;
  justify-content: center;
}

.remote-files.is-collapsed .remote-files__title {
  flex-direction: column;
}

.remote-files.is-collapsed .remote-files__head p,
.remote-files.is-collapsed .remote-files__head h2 {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
}

.remote-files.is-collapsed .remote-files__head h2 {
  letter-spacing: 0.16em;
  font-size: 18px;
}

.remote-files__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
}

.remote-files__input {
  display: none;
}

/* ---- 书签（快捷路径） ---- */
.remote-files__bookmarks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.bookmarks__tag {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.bookmarks__tag:hover {
  transform: translateY(-1px);
}

.bookmarks__empty {
  font-size: 12px;
  color: var(--text-subtle);
  opacity: 0.7;
}

.remote-files__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.breadcrumb-button,
.entry-link {
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
}

.breadcrumb-button {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(30, 42, 51, 0.06);
  color: var(--text-subtle);
}

.entry-link.is-directory {
  color: var(--brand-strong);
  font-weight: 700;
}

.file-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}

.remote-files__table {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.remote-files__inner-table) {
  height: 100%;
}

.remote-files__table.is-drag-active {
  outline: 2px dashed rgba(195, 95, 55, 0.4);
  outline-offset: -8px;
}

.remote-files__drop-mask {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 18px;
  background: rgba(16, 24, 38, 0.78);
  color: #f7f1e8;
  text-align: center;
}

.remote-files__drop-mask span {
  color: rgba(247, 241, 232, 0.72);
  font-size: 12px;
}

.remote-files__collapsed-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: var(--text-subtle);
}

.remote-files__collapsed-summary strong {
  font-size: 28px;
  color: var(--text-main);
}

:deep(.file-actions .el-button) {
  min-height: 28px;
  padding-inline: 6px;
  font-size: 12px;
}

@media (max-width: 900px) {
  .remote-files__toolbar {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
