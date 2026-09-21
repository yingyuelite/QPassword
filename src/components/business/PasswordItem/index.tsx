import React, { useState, useCallback, useMemo, memo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Password } from '@/types/password'
import Icon from '@/components/base/Icon'
import Button from '@/components/base/Button'
import { openUrl } from '@/utils/url'
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
  /** 字段标识，用于区分不同类型（如密码、网址）的展示 / 交互 */
  key: string
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

  // 点击网址：跳转浏览器打开（跨端实现见 utils/url）。未带协议时补全 https:// 以保证可打开
  const handleOpenWebsite = useCallback((url: string) => {
    const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`
    openUrl(normalized)
  }, [])

  const fields = useMemo<FieldRow[]>(() => [
    { key: 'username', label: '用户名', value: pwd.username },
    { key: 'password', label: '密码', value: pwd.password },
    { key: 'loginMethod', label: '登录方式', value: pwd.loginMethod },
    { key: 'website', label: '网址', value: pwd.website },
    { key: 'email', label: '关联邮箱', value: pwd.email },
    { key: 'phone', label: '关联手机', value: pwd.phone },
    { key: 'weixin', label: '关联微信', value: pwd.weixin },
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
        {fields.map(({ key, label, value }) => {
          if (!value) return null
          const isPassword = key === 'password'
          const isWebsite = key === 'website'
          const display = isPassword
            ? (showPassword ? value : '•'.repeat(Math.min(value.length, 12) || 4))
            : value
          return (
            <View className="field-row" key={key}>
              <Text className="field-label">{label}</Text>
              <Text
                className={`field-value${isWebsite ? ' field-value-link' : ''}`}
                onClick={isWebsite
                  ? () => handleOpenWebsite(value)
                  : (isPassword ? togglePassword : undefined)}
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
          <Icon name="edit" size={38} />
        </Button>
        <Button type="text" size="custom" onClick={() => onDelete(pwd)}>
          <Icon name="delete" size={38} />
        </Button>
        <Button type="text" size="custom" className="action-copy" onClick={handleCopyAll}>
          <Icon name="copy" size={38} />
        </Button>
      </View>
    </View>
  )
})

export default PasswordItem
