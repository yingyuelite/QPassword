import { Linking } from 'react-native'

/** 将路径编码到 URL（与 url.ts 保持一致，RN 端使用本文件实现） */
export function encodePath(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  const encodedPath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return cleanBase + encodedPath
}

/** 使用系统浏览器打开外部链接 */
export function openUrl(url: string): void {
  Linking.openURL(url).catch((err) => {
    console.error('[openUrl] openURL error:', err)
  })
}