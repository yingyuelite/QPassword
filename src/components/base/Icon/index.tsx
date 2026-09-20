import React from 'react'
import { Text } from '@tarojs/components'
import { useTheme } from '@/hooks/useTheme'
import { getWindowInfo } from '@/utils/system'

const ICONS: Record<string, string> = {
  add: '➕',
  edit: '📝',
  delete: '🗑️',
  copy: '📋',
  pin: '📌',
  key: '🔑',
  search: '🔍',
  lock: '🔒',
  unlock: '🔓',
  go: '→',
  export: '📤',
  import: '📥',
  menu: '⋯',
  backup: '☁️',
}

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

// 与项目其余组件保持一致：把 750 设计稿中的 px 按窗口宽度等比缩放。
// 样式表中的 px 会被 Taro 的 pxtransform 转成 rpx，随屏幕宽度等比例放大，
// 而 style={{ fontSize }} 这类内联样式不经过 pxtransform，固定为物理 px，
// 导致 Icon 在 iPad 等大屏设备上不会随输入框 / Modal / Text 一起放大，显得偏小。
// 因此这里显式换算：
// - 小程序 / H5：转为 rpx（750 设计稿下 1px = 1rpx），由平台按屏幕宽度缩放
// - RN：按 windowWidth / 750 换算为 dp，与 Modal 等 *.rn.tsx 中的 p() 一致
function scaleIconSize(size: number): number | string {
  if (process.env.TARO_ENV === 'rn') {
    const windowWidth = getWindowInfo().windowWidth || 750
    return Math.round((size * windowWidth) / 750)
  }
  return `${size}rpx`
}

const Icon: React.FC<IconProps> = ({ name, size = 40, className }) => {
  const icon = ICONS[name]
  const { colors } = useTheme()
  if (!icon) return null
  // RN端要求 fontSize 为 number 类型（scaleIconSize 已按端处理）
  return <Text className={className} style={{ fontSize: scaleIconSize(size), color: colors.textPrimary }}>{icon}</Text>
}

export default Icon
