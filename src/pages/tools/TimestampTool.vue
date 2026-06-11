<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getCurrentTimestamp,
  convertTimestampAll,
  dateToTimestamp,
  formatCustom,
} from '@/utils/tools'

// ---- 当前时间实时显示 ----
const nowTs = ref(getCurrentTimestamp())
let timer = null

const nowLocal = computed(() => {
  const date = new Date(nowTs.value.millis)
  return formatCustom(date, 'YYYY-MM-DD HH:mm:ss')
})

onMounted(() => {
  timer = setInterval(() => {
    nowTs.value = getCurrentTimestamp()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ---- 时间戳 → 日期 ----
const tsInput = ref('')
const tsUnit = ref('s')
const tsResult = ref(null)

function handleTsConvert() {
  if (!tsInput.value.trim()) {
    ElMessage.warning('请输入时间戳')
    return
  }
  const result = convertTimestampAll(tsInput.value.trim(), tsUnit.value)
  if (!result) {
    ElMessage.error('无效的时间戳')
    return
  }
  tsResult.value = result
}

function fillCurrentTs(unit) {
  tsInput.value = unit === 's' ? String(nowTs.value.seconds) : String(nowTs.value.millis)
  tsUnit.value = unit
  handleTsConvert()
}

// ---- 日期 → 时间戳 ----
const dtInput = ref(null)
const dtResult = ref(null)

function handleDtConvert() {
  if (!dtInput.value) {
    ElMessage.warning('请选择日期时间')
    return
  }
  const result = dateToTimestamp(new Date(dtInput.value))
  if (!result) {
    ElMessage.error('无效的日期时间')
    return
  }
  dtResult.value = result
}

function fillNow() {
  dtInput.value = new Date()
  handleDtConvert()
}

// ---- 复制功能 ----
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 降级方案：使用 execCommand
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <div class="tool-page">
    <header class="tool-header">
      <h1 class="tool-title">时间戳转换</h1>
      <p class="tool-desc">时间戳与日期时间互相转换，支持秒/毫秒单位</p>
    </header>

    <!-- 当前时间 -->
    <section class="tool-card">
      <div class="tool-card__header">
        <h2>当前时间</h2>
        <span class="tool-badge">实时</span>
      </div>
      <div class="current-time-grid">
        <div class="time-cell">
          <span class="time-label">秒级时间戳</span>
          <span class="time-value" @click="copyText(String(nowTs.seconds))">{{ nowTs.seconds }}</span>
        </div>
        <div class="time-cell">
          <span class="time-label">毫秒时间戳</span>
          <span class="time-value" @click="copyText(String(nowTs.millis))">{{ nowTs.millis }}</span>
        </div>
        <div class="time-cell time-cell--wide">
          <span class="time-label">本地时间</span>
          <span class="time-value" @click="copyText(nowLocal)">{{ nowLocal }}</span>
        </div>
      </div>
    </section>

    <!-- 时间戳 → 日期 -->
    <section class="tool-card">
      <div class="tool-card__header">
        <h2>时间戳 → 日期时间</h2>
        <div class="tool-card__actions">
          <el-button size="small" @click="fillCurrentTs('s')">填入当前(秒)</el-button>
          <el-button size="small" @click="fillCurrentTs('ms')">填入当前(毫秒)</el-button>
        </div>
      </div>
      <div class="convert-row">
        <el-input
          v-model="tsInput"
          placeholder="输入时间戳，如 1700000000"
          clearable
          class="convert-input"
          @keyup.enter="handleTsConvert"
        />
        <el-select v-model="tsUnit" class="convert-select">
          <el-option label="秒 (s)" value="s" />
          <el-option label="毫秒 (ms)" value="ms" />
        </el-select>
        <el-button type="primary" @click="handleTsConvert">转换</el-button>
      </div>
      <div v-if="tsResult" class="result-grid">
        <div class="result-item">
          <span class="result-label">秒级时间戳</span>
          <span class="result-value" @click="copyText(String(tsResult.timestampSeconds))">{{ tsResult.timestampSeconds }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">毫秒时间戳</span>
          <span class="result-value" @click="copyText(String(tsResult.timestampMillis))">{{ tsResult.timestampMillis }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">ISO 8601</span>
          <span class="result-value" @click="copyText(tsResult.iso8601)">{{ tsResult.iso8601 }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">本地时间</span>
          <span class="result-value" @click="copyText(tsResult.localDateTime)">{{ tsResult.localDateTime }}</span>
        </div>
      </div>
    </section>

    <!-- 日期 → 时间戳 -->
    <section class="tool-card">
      <div class="tool-card__header">
        <h2>日期时间 → 时间戳</h2>
        <el-button size="small" @click="fillNow">填入当前时间</el-button>
      </div>
      <div class="convert-row">
        <el-date-picker
          v-model="dtInput"
          type="datetime"
          placeholder="选择日期时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DDTHH:mm:ss"
          class="convert-input"
        />
        <el-button type="primary" @click="handleDtConvert">转换</el-button>
      </div>
      <div v-if="dtResult" class="result-grid">
        <div class="result-item">
          <span class="result-label">秒级时间戳</span>
          <span class="result-value" @click="copyText(String(dtResult.seconds))">{{ dtResult.seconds }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">毫秒时间戳</span>
          <span class="result-value" @click="copyText(String(dtResult.millis))">{{ dtResult.millis }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tool-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.tool-header {
  margin-bottom: 4px;
}

.tool-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}

.tool-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.tool-card {
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 20px 24px;
  background: var(--bg-card, #fff);
}

.tool-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tool-card__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.tool-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: var(--brand-soft, rgba(59, 130, 246, 0.1));
  color: var(--brand, #3b82f6);
}

.tool-card__actions {
  display: flex;
  gap: 8px;
}

.current-time-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-muted, #f8f6f3);
  cursor: pointer;
  transition: background 0.15s;
}

.time-cell:hover {
  background: var(--bg-hover, #f1f5f9);
}

.time-cell--wide {
  grid-column: 1 / -1;
}

.time-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.time-value {
  font-size: 18px;
  font-weight: 600;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  color: var(--text-primary);
  word-break: break-all;
}

.convert-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.convert-input {
  flex: 1;
  min-width: 0;
}

.convert-select {
  width: 120px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-muted, #f8f6f3);
  cursor: pointer;
  transition: background 0.15s;
}

.result-item:hover {
  background: var(--bg-hover, #f1f5f9);
}

.result-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.result-value {
  font-size: 14px;
  font-weight: 500;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  color: var(--text-primary);
  word-break: break-all;
}

@media (max-width: 720px) {
  .tool-page {
    padding: 16px;
  }

  .current-time-grid {
    grid-template-columns: 1fr;
  }

  .convert-row {
    flex-wrap: wrap;
  }

  .convert-input {
    flex-basis: 100%;
  }

  .convert-select {
    flex: 1;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
