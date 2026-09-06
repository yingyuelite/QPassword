import React from 'react'
import { View } from '@tarojs/components'
import { useTheme } from '@/hooks/useTheme'

interface ThemeRootProps {
  className?: string
  children?: React.ReactNode
}

/**
 * 页面主题根节点：把用户选择的主题类挂到页面根元素上，
 * 强制覆盖 app.scss 中"跟随系统"的 CSS 变量（.theme-light / .theme-dark）。
 * 微信小程序无法运行时修改 page 根元素的类，故由每个页面根节点挂上主题类，
 * 主题类声明的变量即为元素自身声明，可覆盖继承自 page/:root 的跟随系统变量。
 * RN 端不使用主题类，直接透传子节点，避免额外 View 影响 RN 布局。
 */
const ThemeRoot: React.FC<ThemeRootProps> = ({ className, children }) => {
  const { themeClass } = useTheme()
  if (process.env.TARO_ENV === 'rn') {
    return <>{children}</>
  }
  return (
    <View className={[themeClass, className].filter(Boolean).join(' ')}>{children}</View>
  )
}

export default ThemeRoot