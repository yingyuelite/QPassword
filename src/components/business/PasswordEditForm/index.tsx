import React, { useMemo, useState, useRef, useCallback } from 'react'
import { View, Text, Textarea, ScrollView, CustomWrapper } from '@tarojs/components'
import { Password } from '@/types/password'
import Button from '@/components/base/Button'
import SafeInput from '@/components/base/SafeInput'
import AutocompleteInput from '@/components/base/AutocompleteInput'
import TagAutocompleteInput from '@/components/base/TagAutocompleteInput'
import Checkbox from '@/components/base/Checkbox'
import { PASSWORD_ICONS } from '@/constants/passwordIcons'
import { closeAllDropdowns } from '@/utils/dropdownBus'
import './index.scss'

const isRN = process.env.TARO_ENV === 'rn'
// RN 端：页面滚动容器开启嵌套滚动，避免下拉选项内部滑动时整页被滚动；
// keyboardShouldPersistTaps 配合 AutocompleteInput 内部设置，保证点击穿透不过早收起键盘。
const rnPageScrollProps: any = isRN
  ? { keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true }
  : {}

interface PasswordEditFormProps {
  /** 初始表单数据，仅在挂载时生效（编辑页每次跳转都会新建实例，保证拿到最新数据） */
  form: Password
  passwords: Password[]
  onSave: (form: Password) => void
  onCancel: () => void
}

function uniqueValues(list: Password[], field: keyof Password): string[] {
  const values = new Set<string>()
  for (const p of list) {
    const v = p[field]
    if (typeof v === 'string' && v) {
      values.add(v)
    }
  }
  return Array.from(values)
}

function uniqueTags(list: Password[]): string[] {
  const tags = new Set<string>()
  for (const p of list) {
    for (const t of p.tags) {
      if (t) tags.add(t)
    }
  }
  return Array.from(tags)
}

const PasswordEditForm: React.FC<PasswordEditFormProps> = ({ form: editForm, passwords, onSave, onCancel }) => {
  // 表单展示值：作为输入框 defaultValue 的初值 / 已提交值（失焦、选择建议等时机回显）
  const [localForm, setLocalForm] = useState<Password>(editForm)
  // 表单最新值（输入过程中逐键更新，保存时读取）
  const formRef = useRef<Password>(editForm)

  // 密码明文/密文切换，默认为隐藏（点按小图标可切换，方便用户自查输入是否正确）
  const [showPassword, setShowPassword] = useState(false)

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  // 输入框为非受控（不传 value，只传 defaultValue），输入框展示由原生输入框自身维护，
  // 输入过程中不会有任何 value 的 setData，彻底规避快速输入丢字、删除回弹。
  // 此处仅把逐键输入写入 formRef，供保存时读取。
  const updateInput = useCallback((field: keyof Password, value: string | string[] | boolean) => {
    formRef.current = { ...formRef.current, [field]: value }
  }, [])

  // 失焦 / 确认 / 选择建议等提交时机：同步到展示状态（defaultValue），保证后续重开/回显正确
  const commitField = useCallback((field: keyof Password, value: string | string[] | boolean) => {
    formRef.current = { ...formRef.current, [field]: value }
    setLocalForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(() => {
    onSave(formRef.current)
  }, [onSave])

  const usernameSuggestions = useMemo(() => uniqueValues(passwords, 'username'), [passwords])
  const passwordSuggestions = useMemo(() => uniqueValues(passwords, 'password'), [passwords])
  const loginMethodSuggestions = useMemo(() => uniqueValues(passwords, 'loginMethod'), [passwords])
  const emailSuggestions = useMemo(() => uniqueValues(passwords, 'email'), [passwords])
  const phoneSuggestions = useMemo(() => uniqueValues(passwords, 'phone'), [passwords])
  const weixinSuggestions = useMemo(() => uniqueValues(passwords, 'weixin'), [passwords])
  const allTags = useMemo(() => uniqueTags(passwords), [passwords])

  return (
    <View className="edit-page" onClick={() => closeAllDropdowns()}>
      <ScrollView className="edit-body" scrollY {...rnPageScrollProps}>
        <View className="edit-form">
          {/* 用 CustomWrapper 将表单与整页大数据隔离，避免输入时 Taro 默认 setData 遍历整个页面虚拟 DOM
              导致 value 回写延迟，出现快速输入丢字、删除的字重新出现的现象 */}
          <CustomWrapper>
            <View className="field-item">
              <Text className="field-label">图标</Text>
              <View className="icon-picker">
                {PASSWORD_ICONS.map((ic) => (
                  <View
                    key={ic}
                    className={localForm.icon === ic ? 'icon-option icon-option--active' : 'icon-option'}
                    onClick={() => commitField('icon', ic)}
                  >
                    <Text className="icon-emoji">{ic}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="field-item">
              <Text className="field-label">标题（必填）</Text>
              <SafeInput
                className="edit-input"
                defaultValue={localForm.title}
                onInput={(v) => updateInput('title', v)}
                onChange={(v) => commitField('title', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">用户名</Text>
              <AutocompleteInput
                defaultValue={localForm.username}
                suggestions={usernameSuggestions}
                onInput={(v) => updateInput('username', v)}
                onCommit={(v) => commitField('username', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">密码</Text>
              <View className="password-field">
                <AutocompleteInput
                  className="edit-input password-field-input"
                  defaultValue={localForm.password}
                  password={!showPassword}
                  suggestions={passwordSuggestions}
                  onInput={(v) => updateInput('password', v)}
                  onCommit={(v) => commitField('password', v)}
                />
                <View className="password-eye" onClick={togglePassword}>
                  <Text className="password-eye-icon">{showPassword ? '🙈' : '👁️'}</Text>
                </View>
              </View>
            </View>
            <View className="field-item">
              <Text className="field-label">登录方式</Text>
              <AutocompleteInput
                defaultValue={localForm.loginMethod}
                suggestions={loginMethodSuggestions}
                placeholder="如：手机验证码、微信、邮箱"
                onInput={(v) => updateInput('loginMethod', v)}
                onCommit={(v) => commitField('loginMethod', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">关联邮箱</Text>
              <AutocompleteInput
                defaultValue={localForm.email}
                suggestions={emailSuggestions}
                onInput={(v) => updateInput('email', v)}
                onCommit={(v) => commitField('email', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">关联微信</Text>
              <AutocompleteInput
                defaultValue={localForm.weixin}
                suggestions={weixinSuggestions}
                onInput={(v) => updateInput('weixin', v)}
                onCommit={(v) => commitField('weixin', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">关联手机</Text>
              <AutocompleteInput
                defaultValue={localForm.phone}
                type="number"
                suggestions={phoneSuggestions}
                onInput={(v) => updateInput('phone', v)}
                onCommit={(v) => commitField('phone', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">网址</Text>
              <SafeInput
                className="edit-input"
                defaultValue={localForm.website}
                onInput={(v) => updateInput('website', v)}
                onChange={(v) => commitField('website', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">标签</Text>
              <TagAutocompleteInput
                tags={localForm.tags}
                allTags={allTags}
                onChange={(v) => commitField('tags', v)}
              />
            </View>
            <View className="field-item">
              <Text className="field-label">备注（支持换行）</Text>
              <Textarea className="edit-textarea" defaultValue={localForm.note} onInput={(e) => updateInput('note', e.detail.value)} onBlur={(e) => commitField('note', e.detail.value)} />
            </View>
            <View className="field-item">
              <Checkbox
                checked={localForm.isTop}
                onChange={(v) => commitField('isTop', v)}
                label="置顶"
              />
            </View>
          </CustomWrapper>
        </View>
      </ScrollView>
      <View className="edit-footer edit-actions">
        <Button type="default" block onClick={onCancel}>取消</Button>
        <Button type="primary" block onClick={handleSave}>保存</Button>
      </View>
    </View>
  )
}

export default PasswordEditForm
