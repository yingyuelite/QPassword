import React from 'react'
import { Text } from '@tarojs/components'
import { useTheme } from '@/hooks/useTheme'

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

const Icon: React.FC<IconProps> = ({ name, size = 40, className }) => {
  const icon = ICONS[name]
  const { colors } = useTheme()
  if (!icon) return null
  // RN端要求 fontSize 为 number 类型
  return <Text className={className} style={{ fontSize: size, color: colors.textPrimary }}>{icon}</Text>
}

export default Icon
