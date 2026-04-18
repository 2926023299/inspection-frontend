export const statusOptions = [
  { label: '全部', value: null },
  { label: '正常', value: 0 },
  { label: '警告', value: 1 },
  { label: '异常', value: 2 },
]

const statusMap = {
  0: { label: '正常', tone: 'success', tagType: 'success' },
  1: { label: '警告', tone: 'warning', tagType: 'warning' },
  2: { label: '异常', tone: 'danger', tagType: 'danger' },
}

export function getStatusMeta(status) {
  return statusMap[status] || { label: '未知', tone: 'warning', tagType: 'info' }
}

export function formatDateTime(value) {
  if (!value) return '--'

  const parsed = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '--'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return value
  return `${numeric.toFixed(numeric % 1 === 0 ? 0 : 1)}%`
}

export function formatCount(value) {
  if (value === null || value === undefined || value === '') return '0'
  return String(value)
}

export function buildUsageText(used, total) {
  if (!used && !total) return '--'
  if (!total) return used || '--'
  return `${used || '--'} / ${total}`
}

export function getMaxUsage(record) {
  const values = [record.diskUsageRate, record.secondDiskUsageRate, record.thirdDiskUsageRate]
    .map((item) => Number(item || 0))
    .filter((item) => !Number.isNaN(item))

  return values.length ? Math.max(...values) : 0
}

export function summarizeServerList(records) {
  const summary = {
    total: records.length,
    normal: 0,
    warning: 0,
    error: 0,
    maxCpu: 0,
    maxMemory: 0,
    maxDisk: 0,
  }

  records.forEach((record) => {
    if (record.status === 2) summary.error += 1
    else if (record.status === 1) summary.warning += 1
    else summary.normal += 1

    summary.maxCpu = Math.max(summary.maxCpu, Number(record.cpuUsage || 0))
    summary.maxMemory = Math.max(summary.maxMemory, Number(record.memoryUsageRate || 0))
    summary.maxDisk = Math.max(summary.maxDisk, getMaxUsage(record))
  })

  return summary
}

export function summarizeJavaList(records) {
  return records.reduce(
    (summary, record) => {
      summary.serverCount += 1
      summary.processCount += record.javaProcessCount || 0
      if (record.hasDiff) summary.changedCount += 1
      return summary
    },
    { serverCount: 0, processCount: 0, changedCount: 0 },
  )
}
