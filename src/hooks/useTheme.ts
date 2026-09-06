import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { darkColors, lightColors, type ThemeValue } from '@/utils/themeColors'
import { getCachedSettings, loadSettings } from '@/utils/storage'
import {
  EVENT_THEME_CHANGED,
  getThemeClass,
  resolveIsDark,
} from '@/utils/themeMode'

export type { ThemeValue, ThemeColors } from '@/utils/themeColors'
export { lightColors, darkColors } from '@/utils/themeColors'
export { EVENT_THEME_CHANGED, saveThemeMode } from '@/utils/themeMode'
export type { ThemeMode } from '@/types/settings'

/**
 * 微信小程序 / H5 端：系统当前是否为暗色模式。
 * 通过系统信息中的 theme 字段判断。
 */
export function getIsDark(): boolean {
  try {
    // 仅 weapp / h5 端支持 theme 字段
    const info = (Taro as any).getSystemInfoSync?.()
    return info?.theme === 'dark'
  } catch (e) {
    return false
  }
}

/**
 * 跨端主题 Hooks（小程序 / H5）。
 * - 结合用户主题设置（跟随系统/浅色/深色）与系统 theme 计算最终主题
 * - 监听 Taro.onThemeChange 实现运行时跟随系统切换（跟随系统模式）
 * - 监听 EVENT_THEME_CHANGED，主题设置切换后同步刷新
 */
export function useTheme(): ThemeValue {
  const [isSystemDark, setIsSystemDark] = useState<boolean>(getIsDark)
  // 初始值优先取缓存（app 启动时已预热），避免首帧主题闪烁
  const [themeMode, setThemeMode] = useState(getCachedSettings().themeMode)

  useEffect(() => {
    let cancel = false
    // 模块缓存可能未预热（如热更新/直接进入子页面），兜底加载一次
    loadSettings().then((settings) => {
      if (!cancel) setThemeMode(settings.themeMode)
    })
    // 主题设置切换后，刷新本地状态
    const onThemeChanged = () => {
      loadSettings().then((settings) => {
        if (!cancel) setThemeMode(settings.themeMode)
      })
    }
    Taro.eventCenter.on(EVENT_THEME_CHANGED, onThemeChanged)
    return () => {
      cancel = true
      Taro.eventCenter.off(EVENT_THEME_CHANGED, onThemeChanged)
    }
  }, [])

  useEffect(() => {
    if (process.env.TARO_ENV === 'rn') return
    let cancel = false
    const update = (res?: any) => {
      if (cancel) return
      const theme = res?.theme
      if (theme === 'dark' || theme === 'light') {
        setIsSystemDark(theme === 'dark')
      } else {
        setIsSystemDark(getIsDark())
      }
    }
    if (Taro.onThemeChange) {
      Taro.onThemeChange(update as any)
    }
    return () => {
      cancel = true
      if (Taro.offThemeChange) {
        Taro.offThemeChange(update as any)
      }
    }
  }, [])

  const isDark = resolveIsDark(themeMode, isSystemDark)
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    themeMode,
    themeClass: getThemeClass(themeMode),
  }
}
