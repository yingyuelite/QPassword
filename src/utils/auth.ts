import { btoa } from './base64'

/** 构造 Basic Auth 头 */
export function getAuthHeader(username: string, password: string): Record<string, string> {
  const credentials = `${username}:${password}`
  const base64 = btoa(credentials)
  return { Authorization: `Basic ${base64}` }
}
