<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildMeasurementId,
  buildMeasureIdWithTime,
} from '@/utils/tools'
import {
  fetchOtsTables,
  fetchOtsTableSchema,
  queryOtsRange,
} from '@/api/tools'

// ---- 量测ID拼接 ----

const measureOptions = [298, 300, 236, 66]

const midDeviceId = ref('')
const midMeasureValue = ref('')
const midStartTime = ref(null)
const midEndTime = ref(null)
const midResult = ref(null)

function handleMidBuild() {
  if (!midDeviceId.value.trim()) {
    ElMessage.warning('请输入设备ID')
    return
  }
  if (!midMeasureValue.value.trim()) {
    ElMessage.warning('请输入量测值')
    return
  }

  const measureId = buildMeasurementId(midDeviceId.value.trim(), midMeasureValue.value.trim())
  if (!measureId) {
    ElMessage.error('无效的设备ID或量测值')
    return
  }

  const result = { measureId }

  if (midStartTime.value) {
    result.startId = buildMeasureIdWithTime(measureId, midStartTime.value)
    result.startTime = midStartTime.value
  }
  if (midEndTime.value) {
    result.endId = buildMeasureIdWithTime(measureId, midEndTime.value)
    result.endTime = midEndTime.value
  }

  midResult.value = result
}

// ---- OTS 查询 ----

const otsTables = ref([])
const otsSelectedTable = ref('')
const otsSchema = ref(null)
const otsKeyName = ref('')
const otsStartKey = ref('')
const otsEndKey = ref('')
const otsLimit = ref(100)
const otsQueryResult = ref(null)
const otsLoading = ref(false)

async function loadOtsTables() {
  try {
    const data = await fetchOtsTables()
    otsTables.value = data || []
  } catch (e) {
    ElMessage.error('获取表列表失败: ' + (e.message || e))
  }
}

async function handleTableChange(tableName) {
  otsSchema.value = null
  otsKeyName.value = ''
  otsQueryResult.value = null

  if (!tableName) return

  try {
    const data = await fetchOtsTableSchema(tableName)
    otsSchema.value = data
    if (data?.primaryKeyColumns?.length > 0) {
      otsKeyName.value = data.primaryKeyColumns[0].name
    }
  } catch (e) {
    ElMessage.error('获取表结构失败: ' + (e.message || e))
  }
}

async function handleOtsQuery() {
  if (!otsSelectedTable.value) {
    ElMessage.warning('请选择表')
    return
  }
  if (!otsStartKey.value.trim() || !otsEndKey.value.trim()) {
    ElMessage.warning('请输入起止Key')
    return
  }

  otsLoading.value = true
  try {
    const data = await queryOtsRange({
      tableName: otsSelectedTable.value,
      keyName: otsKeyName.value,
      startKey: otsStartKey.value.trim(),
      endKey: otsEndKey.value.trim(),
      limit: otsLimit.value,
    })
    otsQueryResult.value = data
  } catch (e) {
    ElMessage.error('查询失败: ' + (e.message || e))
  } finally {
    otsLoading.value = false
  }
}

// 自动填充量测ID到OTS查询的Key范围
function fillKeyFromMeasureId() {
  if (midResult.value?.startId) {
    otsStartKey.value = midResult.value.startId
  }
  if (midResult.value?.endId) {
    otsEndKey.value = midResult.value.endId
  }
  if (midResult.value?.measureId && otsTables.value.length > 0) {
    // 选中第一个表（如果未选）
    if (!otsSelectedTable.value) {
      otsSelectedTable.value = otsTables.value[0]
      handleTableChange(otsSelectedTable.value)
    }
  }
}

// 初始化加载表列表
loadOtsTables()

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
      <h1 class="tool-title">量测ID拼接</h1>
      <p class="tool-desc">将设备ID的二进制32-47位替换为量测值，拼接时间范围生成完整量测ID</p>
    </header>

    <section class="tool-card">
      <div class="tool-card__header">
        <h2>输入参数</h2>
        <span class="tool-badge">二进制位操作</span>
      </div>
      <div class="mid-form">
        <div class="mid-row">
          <div class="mid-field">
            <label>设备ID</label>
            <el-input
              v-model="midDeviceId"
              placeholder="如 3096224743817217"
              clearable
            />
          </div>
          <div class="mid-field">
            <label>量测值</label>
            <el-select v-model="midMeasureValue" placeholder="选择或输入量测值" clearable filterable allow-create>
              <el-option
                v-for="item in measureOptions"
                :key="item"
                :label="item"
                :value="String(item)"
              />
            </el-select>
          </div>
        </div>
        <div class="mid-row">
          <div class="mid-field">
            <label>开始时间（可选）</label>
            <el-date-picker
              v-model="midStartTime"
              type="datetime"
              placeholder="选择开始时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </div>
          <div class="mid-field">
            <label>结束时间（可选）</label>
            <el-date-picker
              v-model="midEndTime"
              type="datetime"
              placeholder="选择结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </div>
        </div>
        <el-button type="primary" @click="handleMidBuild" class="mid-btn">生成量测ID</el-button>
      </div>
    </section>

    <section v-if="midResult" class="tool-card">
      <div class="tool-card__header">
        <h2>结果</h2>
        <el-button size="small" @click="fillKeyFromMeasureId">填入OTS查询</el-button>
      </div>
      <div class="result-grid">
        <div class="result-item result-item--highlight">
          <span class="result-label">量测ID</span>
          <span class="result-value" @click="copyText(midResult.measureId)">{{ midResult.measureId }}</span>
        </div>
        <div v-if="midResult.startId" class="result-item">
          <span class="result-label">开始量测ID</span>
          <span class="result-value" @click="copyText(midResult.startId)">{{ midResult.startId }}</span>
        </div>
        <div v-if="midResult.endId" class="result-item">
          <span class="result-label">结束量测ID</span>
          <span class="result-value" @click="copyText(midResult.endId)">{{ midResult.endId }}</span>
        </div>
      </div>
    </section>

    <!-- OTS 查询 -->
    <section class="tool-card">
      <div class="tool-card__header">
        <h2>OTS 查询</h2>
        <span class="tool-badge">Key范围查询</span>
      </div>
      <div class="ots-form">
        <div class="ots-row">
          <div class="ots-field">
            <label>选择表</label>
            <el-select
              v-model="otsSelectedTable"
              placeholder="选择表"
              @change="handleTableChange"
              style="width: 100%"
            >
              <el-option
                v-for="t in otsTables"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
          </div>
          <div class="ots-field">
            <label>主键列</label>
            <el-input v-model="otsKeyName" disabled />
          </div>
        </div>
        <div v-if="otsSchema" class="ots-schema-info">
          <span class="ots-schema-label">表结构：</span>
          <span v-for="(col, i) in otsSchema.primaryKeyColumns" :key="i" class="ots-schema-tag">
            {{ col.name }} ({{ col.type }})
          </span>
        </div>
        <div class="ots-row">
          <div class="ots-field">
            <label>起始Key</label>
            <el-input v-model="otsStartKey" placeholder="起始Key" clearable />
          </div>
          <div class="ots-field">
            <label>结束Key</label>
            <el-input v-model="otsEndKey" placeholder="结束Key" clearable />
          </div>
          <div class="ots-field ots-field--small">
            <label>限制条数</label>
            <el-input-number v-model="otsLimit" :min="1" :max="1000" />
          </div>
        </div>
        <el-button type="primary" :loading="otsLoading" @click="handleOtsQuery">查询</el-button>
      </div>
      <div v-if="otsQueryResult" class="ots-result">
        <div class="ots-result__header">
          <span>查询结果：{{ otsQueryResult.count }} 条</span>
        </div>
        <div class="ots-result__table-wrap">
          <table class="ots-table">
            <thead>
              <tr>
                <th>Key</th>
                <th v-for="col in Object.keys(otsQueryResult.rows?.[0] || {}).filter(k => k !== 'key')" :key="col">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in otsQueryResult.rows" :key="i">
                <td class="ots-td-key" @click="copyText(row.key)">{{ row.key }}</td>
                <td v-for="col in Object.keys(row).filter(k => k !== 'key')" :key="col">
                  {{ row[col] }}
                </td>
              </tr>
            </tbody>
          </table>
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
  background: var(--brand-soft, rgba(195, 95, 55, 0.12));
  color: var(--brand, #c35f37);
}

.mid-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mid-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.mid-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mid-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.mid-btn {
  align-self: flex-start;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
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
  background: var(--bg-hover, #f0ece6);
}

.result-item--highlight {
  grid-column: 1 / -1;
  background: var(--brand-soft, rgba(195, 95, 55, 0.08));
  border: 1px solid var(--brand, rgba(195, 95, 55, 0.2));
}

.result-item--highlight .result-value {
  font-size: 18px;
  font-weight: 700;
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

/* OTS 查询 */
.ots-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ots-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.ots-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ots-field--small {
  flex: 0 0 140px;
}

.ots-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.ots-schema-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}

.ots-schema-label {
  font-weight: 500;
}

.ots-schema-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-muted, #f8f6f3);
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
}

.ots-result {
  margin-top: 16px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
}

.ots-result__header {
  padding: 10px 14px;
  background: var(--bg-muted, #f8f6f3);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.ots-result__table-wrap {
  overflow-x: auto;
}

.ots-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ots-table th,
.ots-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.ots-table th {
  background: var(--bg-muted, #f8f6f3);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.ots-td-key {
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-weight: 500;
  cursor: pointer;
}

.ots-td-key:hover {
  color: var(--brand, #c35f37);
}

@media (max-width: 720px) {
  .tool-page {
    padding: 16px;
  }

  .mid-row,
  .ots-row {
    flex-direction: column;
  }

  .ots-field--small {
    flex: 1;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
