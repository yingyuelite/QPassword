/** 主题模式：随系统 / 浅色 / 深色 */
export type ThemeMode = 'system' | 'light' | 'dark'

/** 应用设置 */
export interface Settings {
  /** 主题模式 */
  themeMode: ThemeMode
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
}

/** 主题模式的可选列表（用于设置页展示） */
export const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

/** 归一化设置数据：兼容旧数据/异常数据，返回始终合法的 Settings */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const themeMode = raw?.themeMode
  const validMode: ThemeMode[] = ['system', 'light', 'dark']
  return {
    themeMode: themeMode && validMode.includes(themeMode) ? themeMode : DEFAULT_SETTINGS.themeMode,
  }
}