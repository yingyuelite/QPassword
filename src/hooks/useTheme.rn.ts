import { lightColors, type ThemeValue } from '@/utils/themeColors'
import { DEFAULT_SETTINGS } from '@/types/settings'

export type { ThemeValue, ThemeColors } from '@/utils/themeColors'
export { lightColors, darkColors } from '@/utils/themeColors'
export { EVENT_THEME_CHANGED, saveThemeMode } from '@/utils/themeMode'

/** RN 端：不跟随系统深浅色，始终使用浅色样式 */
export function getIsDark(): boolean {
  return false
}

/**
 * 跨端主题 Hooks（React Native）。
 * RN 端不适配暗色模式，固定返回浅色主题，保证界面始终为浅色样式。
 */
export function useTheme(): ThemeValue {
  return {
    isDark: false,
    colors: lightColors,
    themeMode: DEFAULT_SETTINGS.themeMode,
    themeClass: '',
  }
}
