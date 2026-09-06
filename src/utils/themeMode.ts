import Taro from '@tarojs/taro'
import { saveSettings } from '@/utils/storage'
import type { ThemeMode } from '@/types/settings'

/** 主题切换事件：切换后广播，通知所有已挂载的 useTheme 钩子刷新主题设置 */
export const EVENT_THEME_CHANGED = 'theme_changed'

/** 根据主题设置 + 系统主题，计算最终是否应用暗色 */
export function resolveIsDark(themeMode: ThemeMode, isSystemDark: boolean): boolean {
  if (themeMode === 'dark') return true
  if (themeMode === 'light') return false
  return isSystemDark
}

/** 主题设置对应的强制主题类名；跟随系统时返回空串（由 media query 接管） */
export function getThemeClass(themeMode: ThemeMode): '' | 'theme-light' | 'theme-dark' {
  if (themeMode === 'dark') return 'theme-dark'
  if (themeMode === 'light') return 'theme-light'
  return ''
}

/**
 * 保存并应用主题设置：
 * - 持久化到本地存储
 * - h5 端直接作用于 document 根节点（立即生效，不等 React 重渲染）
 * - weapp 端由各页面根节点上的主题类驱动
 * - 广播事件，通知已挂载的 useTheme 钩子刷新状态
 */
export async function saveThemeMode(themeMode: ThemeMode): Promise<boolean> {
  const ok = await saveSettings({ themeMode })
  if (!ok) return false
  // h5 端直接改 :root 的类，确保切换立即生效；weapp 端无法运行时常量改 page 根类，
  // 依赖 ThemeRoot 挂到页面根节点上的主题类（通过 EVENT_THEME_CHANGED 刷新后生效）
  if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    const cls = getThemeClass(themeMode)
    if (cls) root.classList.add(cls)
  }
  Taro.eventCenter.trigger(EVENT_THEME_CHANGED)
  return ok
}