import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { useTheme } from '@/hooks/useTheme'

/**
 * 根据当前主题设置微信小程序导航栏颜色。
 * 微信 setNavigationBarColor 的 frontColor 仅支持 #ffffff / #000000。
 */
export function applyNavigationBarTheme(isDark: boolean) {
  if (process.env.TARO_ENV === 'rn') return
  Taro.setNavigationBarColor({
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    frontColor: isDark ? '#ffffff' : '#000000',
  }).catch?.(() => {})
}

/** 页面中使用：监听主题变化并同步导航栏颜色 */
export function useNavigationBarTheme() {
  const { isDark } = useTheme()
  useEffect(() => {
    applyNavigationBarTheme(isDark)
  }, [isDark])
}
