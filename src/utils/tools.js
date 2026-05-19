/**
 * 时间戳工具函数
 */

/**
 * 获取当前时间戳
 * @returns {{ seconds: number, millis: number }}
 */
export function getCurrentTimestamp() {
  const now = Date.now()
  return {
    seconds: Math.floor(now / 1000),
    millis: now,
  }
}

/**
 * 时间戳转 Date 对象
 * @param {number|string} timestamp
 * @param {'s'|'ms'} unit
 * @returns {Date|null}
 */
export function timestampToDate(timestamp, unit = 's') {
  const num = Number(timestamp)
  if (Number.isNaN(num) || num <= 0) return null

  const millis = unit === 's' ? num * 1000 : num
  const date = new Date(millis)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Date 对象转时间戳
 * @param {Date} date
 * @returns {{ seconds: number, millis: number }|null}
 */
export function dateToTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const millis = date.getTime()
  return {
    seconds: Math.floor(millis / 1000),
    millis,
  }
}

/**
 * 格式化日期为 ISO 8601 字符串
 * @param {Date} date
 * @returns {string}
 */
export function toISOString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--'
  return date.toISOString()
}

/**
 * 格式化日期为本地化字符串
 * @param {Date} date
 * @returns {string}
 */
export function toLocalString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * 格式化日期为自定义格式
 * @param {Date} date
 * @param {string} format - 格式模板，如 'YYYY-MM-DD HH:mm:ss'
 * @returns {string}
 */
export function formatCustom(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--'

  const pad = (n) => String(n).padStart(2, '0')
  const replacements = {
    YYYY: date.getFullYear(),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  }

  let result = format
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(token, value)
  }
  return result
}

/**
 * 完整转换时间戳为多种格式
 * @param {number|string} timestamp
 * @param {'s'|'ms'} unit
 * @returns {object|null}
 */
export function convertTimestampAll(timestamp, unit = 's') {
  const date = timestampToDate(timestamp, unit)
  if (!date) return null

  const ts = dateToTimestamp(date)
  return {
    timestampSeconds: ts.seconds,
    timestampMillis: ts.millis,
    iso8601: toISOString(date),
    localDateTime: toLocalString(date),
    formatted: formatCustom(date),
  }
}

// ---- 量测ID工具 ----

/**
 * 将设备ID的32-47位替换为量测值，生成量测ID
 * @param {string|number} deviceId 设备ID
 * @param {string|number} measureValue 量测值
 * @returns {string|null} 量测ID
 */
export function buildMeasurementId(deviceId, measureValue) {
  try {
    const id = BigInt(deviceId)
    const mv = BigInt(measureValue)

    if (mv < 0n || mv > 0xFFFFn) return null

    // 清除32-47位，然后设置量测值
    const mask = 0xFFFF000FFFFFFFFFn
    const cleared = id & mask
    const shifted = mv << 32n
    return String(cleared | shifted)
  } catch {
    return null
  }
}

/**
 * 将量测ID与日期拼接为完整量测ID字符串
 * @param {string} measureId 量测ID
 * @param {Date|string} date 日期
 * @returns {string} 格式: measureId + YYYYMMDDHHmmss
 */
export function buildMeasureIdWithTime(measureId, date) {
  const d = date instanceof Date ? date : new Date(date)
  if (!measureId || Number.isNaN(d.getTime())) return ''
  return measureId + formatCustom(d, 'YYYYMMDDHHmmss')
}

/**
 * 格式化日期为 YYYYMMDDHHmmss 格式
 * @param {Date} date
 * @returns {string}
 */
export function formatDateCompact(date) {
  return formatCustom(date, 'YYYYMMDDHHmmss')
}
