/**
 * 格式化时间戳为日期时间字符串
 * @param timestamp 时间戳
 * @returns 格式化后的日期时间字符串，格式为 YYYY-MM-DD HH:mm:ss
 */
export function formatTime(timestamp: number) {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
