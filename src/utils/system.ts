import Taro from '@tarojs/taro'

/** 窗口信息（windowWidth / windowHeight 等） */
export interface WindowInfoLike {
  windowWidth: number
  windowHeight: number
  [key: string]: any
}

/** App 基础信息（含系统主题 theme 等） */
export interface AppBaseInfoLike {
  theme?: 'light' | 'dark'
  [key: string]: any
}

/**
 * 获取窗口信息。
 *
 * 微信已弃用 `wx.getSystemInfoSync`（控制台会打印弃用警告），官方建议拆分为
 * getWindowInfo / getDeviceInfo / getAppBaseInfo 等。这里优先使用 `Taro.getWindowInfo`，
 * 仅在不支持（旧基础库、RN 等）时回退到 getSystemInfoSync。
 */
export function getWindowInfo(): WindowInfoLike {
  const taro = Taro as any
  if (typeof taro.getWindowInfo === 'function') {
    return taro.getWindowInfo()
  }
  return taro.getSystemInfoSync()
}

/**
 * 获取 App 基础信息（含系统主题 theme）。
 * 优先使用 `Taro.getAppBaseInfo`，避免 getSystemInfoSync 的弃用警告。
 */
export function getAppBaseInfo(): AppBaseInfoLike {
  const taro = Taro as any
  if (typeof taro.getAppBaseInfo === 'function') {
    return taro.getAppBaseInfo()
  }
  return taro.getSystemInfoSync()
}
