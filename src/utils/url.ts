import Taro from '@tarojs/taro'

/** 将路径编码到 URL */
export function encodePath(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
  const encodedPath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return cleanBase + encodedPath
}

/**
 * 跨端打开外部链接（开发者信息中的开源地址等）。
 * - H5：新标签页打开
 * - 微信小程序：没有直接唤起外部浏览器的能力，改为复制链接（微信内置“内容已复制”提示）
 * - RN：见 url.rn.ts，使用系统浏览器打开
 */
export function openUrl(url: string): void {
  if (process.env.TARO_ENV === 'h5') {
    window.open(url, '_blank')
    return
  }
  if (process.env.TARO_ENV === 'weapp') {
    Taro.setClipboardData({ data: url })
  }
  // RN 端实现见 url.rn.ts
}
