import React from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/base/Icon'
import { DEFAULT_ICON } from '@/constants/passwordIcons'
import './Header.scss'

interface HeaderProps {
  title: string
  isTop: boolean
  createDate: number
  icon: string
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const year = 365 * day

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`

  const date = new Date(timestamp)
  const m = date.getMonth() + 1
  const d = date.getDate()

  if (diff < year) return `${m}月${d}日`
  return `${date.getFullYear()}年${m}月${d}日`
}

const PasswordItemHeader: React.FC<HeaderProps> = ({ title, isTop, createDate, icon }) => {
  return (
    <View className="item-header">
      <View className="item-header-left">
        {icon ? <Text className="item-icon">{icon}</Text> : <Text className="item-icon">{DEFAULT_ICON}</Text>}
        <Text className="item-title">{title}</Text>
      </View>
      <View className="item-header-right">
        {isTop ? <Icon name="pin" size={29} /> : null}
        <Text className="item-time">{formatTime(createDate)}</Text>
      </View>
    </View>
  )
}

export default PasswordItemHeader
