import type { ThemeMode } from '@/types/settings'

/** 浅色主题颜色表（与 app.scss 中定义保持一致） */
export const lightColors = {
  primary: '#237166',
  danger: '#e64340',
  warning: '#e6a23c',
  bgPage: '#f5f5f5',
  bgCard: '#ffffff',
  bgSubtle: '#f9f9f9',
  bgHover: '#f5f5f5',
  bgDanger: '#fff0f0',
  bgError: '#fff2f0',
  bgWarning: '#fff7e6',
  bgAutocomplete: '#eef6f4',
  bgPattern: '#f4faf8',
  bgTag: '#e8f5e9',
  bgSelected: '#f0faf8',
  patternDot: '#d9e6e2',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textHint: '#999999',
  textPlaceholder: '#cccccc',
  textOnPrimary: '#ffffff',
  border: '#eeeeee',
  borderStrong: '#dddddd',
  borderDivider: '#f0f0f0',
  mask: 'rgba(0, 0, 0, 0.5)',
}

/** 深色主题颜色表 */
export const darkColors: typeof lightColors = {
  primary: '#2e8b7a',
  danger: '#ef5d5a',
  warning: '#eab43f',
  bgPage: '#1c1c1e',
  bgCard: '#2c2c2e',
  bgSubtle: '#3a3a3c',
  bgHover: '#3a3a3c',
  bgDanger: '#4a2a2a',
  bgError: '#4a2a2a',
  bgWarning: '#453a1f',
  bgAutocomplete: '#263131',
  bgPattern: '#263131',
  bgTag: '#24413a',
  bgSelected: '#24413a',
  patternDot: '#3a4341',
  textPrimary: '#e5e5e7',
  textSecondary: '#a1a1a6',
  textHint: '#8e8e93',
  textPlaceholder: '#5a5a5e',
  textOnPrimary: '#ffffff',
  border: '#3a3a3c',
  borderStrong: '#48484a',
  borderDivider: '#3a3a3c',
  mask: 'rgba(0, 0, 0, 0.6)',
}

export type ThemeColors = typeof lightColors

export interface ThemeValue {
  isDark: boolean
  colors: ThemeColors
  /** 当前主题模式设置（用户选择） */
  themeMode: ThemeMode
  /** 手动强制主题时使用的 CSS 类名；跟随系统时为 '' */
  themeClass: '' | 'theme-light' | 'theme-dark'
}
