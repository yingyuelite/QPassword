import React, { useState, useCallback, useMemo, memo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Password } from '@/types/password'
import Icon from '@/components/base/Icon'
import Button from '@/components/base/Button'
import PasswordItemHeader from './Header'
import './index.scss'

const isRN = process.env.TARO_ENV === 'rn'

const RN_SHADOW: any = isRN
  ? (require('react-native') as any).Platform.OS === 'android'
    ? { elevation: 2 }
    : {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowColor: '#000',
      }
  : undefined

interface PasswordItemProps {
  password: Password
  onEdit: (pwd: Password) => void
  onDelete: (pwd: Password) => void
}

interface FieldRow {
  label: string
  value: string
}

const PasswordItem: React.FC<PasswordItemProps> = memo(function PasswordItem({
  password: pwd,
  onEdit,
  onDelete,
}: PasswordItemProps) {
  const [showPassword, setShowPassword] = useState(false)

  const handleCopy = useCallback((text: string) => {
    Taro.setClipboardData({ data: text })
  }, [])

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const fields = useMemo<FieldRow[]>(() => [
    { label: '用户名', value: pwd.username },
    { label: '密码', value: pwd.password },
    { label: '登录方式', value: pwd.loginMethod },
    { label: '网址', value: pwd.website },
    { label: '关联邮箱', value: pwd.email },
    { label: '关联手机', value: pwd.phone },
    { label: '关联微信', value: pwd.weixin },
  ], [pwd.username, pwd.password, pwd.loginMethod, pwd.website, pwd.email, pwd.phone, pwd.weixin])

  const copyText = useMemo(() => {
    const rows: string[] = []
    if (pwd.title) rows.push(`「${pwd.title}」`)
    fields.forEach(({ label, value }) => {
      if (value) rows.push(`${label}：${value}`)
    })
    if (pwd.note) rows.push(`备注：${pwd.note}`)
    if (pwd.tags.length > 0) rows.push(`标签：${pwd.tags.join('、')}`)
    return rows.join('\n')
  }, [pwd, fields])

  const handleCopyAll = useCallback(() => {
    Taro.setClipboardData({ data: copyText })
  }, [copyText])

  return (
    <View className="password-item" style={RN_SHADOW}>
      <PasswordItemHeader title={pwd.title} isTop={pwd.isTop} createDate={pwd.createDate} icon={pwd.icon} />

      <View className="item-fields">
        {fields.map(({ label, value }) => {
          if (!value) return null
          const isPassword = label === '密码'
          const display = isPassword
            ? (showPassword ? value : '•'.repeat(Math.min(value.length, 12) || 4))
            : value
          return (
            <View className="field-row" key={label}>
              <Text className="field-label">{label}</Text>
              <Text
                className="field-value"
                onClick={isPassword ? togglePassword : undefined}
              >
                {display}
              </Text>
              <Text className="field-copy" onClick={() => handleCopy(value)}>复制</Text>
            </View>
          )
        })}
      </View>

      {pwd.note ? (
        <View className="item-note">
          <Text className="note-text">{pwd.note}</Text>
        </View>
      ) : null}

      {pwd.tags.length > 0 ? (
        <View className="item-tags">
          <View className="tags-list">
            {pwd.tags.map((tag) => (
              <Text className="item-tag" key={tag}>{tag}</Text>
            ))}
          </View>
        </View>
      ) : null}

      <View className="item-actions">
        <Button type="text" size="custom" onClick={() => onEdit(pwd)}>
          <Icon name="edit" size={18} />
        </Button>
        <Button type="text" size="custom" onClick={() => onDelete(pwd)}>
          <Icon name="delete" size={18} />
        </Button>
        <Button type="text" size="custom" className="action-copy" onClick={handleCopyAll}>
          <Icon name="copy" size={18} />
        </Button>
      </View>
    </View>
  )
})

export default PasswordItem
