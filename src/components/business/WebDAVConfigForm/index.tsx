import React, { useState, useEffect, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import SafeInput from '@/components/base/SafeInput'
import PasswordInput from '@/components/base/PasswordInput'
import Button from '@/components/base/Button'
import { WebDAVConfig } from '@/types/webdav'
import './index.scss'

interface WebDAVConfigFormProps {
  /** 编辑时传入已有配置，新增时为 undefined */
  config?: WebDAVConfig
  onSave: (config: Omit<WebDAVConfig, 'id'> & { id?: string }) => void
  onCancel: () => void
}

interface FormValues {
  name: string
  url: string
  username: string
  password: string
}

const initialValues = (config?: WebDAVConfig): FormValues => ({
  name: config?.name ?? '',
  url: config?.url ?? '',
  username: config?.username ?? '',
  password: config?.password ?? '',
})

const WebDAVConfigForm: React.FC<WebDAVConfigFormProps> = ({ config, onSave, onCancel }) => {
  // 各字段最新值：输入过程中逐键写入 ref（输入框为非受控，不回写展示值），保存时读取
  const valuesRef = useRef<FormValues>(initialValues(config))
  // 实时校验值：仅用于按钮可用性计算，不作为 defaultValue 回写输入框（避免 value setData 竞态）
  const [values, setValues] = useState<FormValues>(initialValues(config))

  useEffect(() => {
    valuesRef.current = initialValues(config)
    setValues(initialValues(config))
  }, [config])

  const updateField = (field: keyof FormValues, value: string) => {
    valuesRef.current = { ...valuesRef.current, [field]: value }
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const name = valuesRef.current.name.trim()
    const url = valuesRef.current.url.trim()
    const username = valuesRef.current.username.trim()
    const password = valuesRef.current.password.trim()
    if (!name) return
    if (!url) return
    if (!username) return
    if (!password) return
    onSave({
      id: config?.id,
      name,
      url,
      username,
      password,
    })
  }

  const isValid = values.name.trim() && values.url.trim() && values.username.trim() && values.password.trim()

  return (
    <View className="webdav-config-form">
      <View className="webdav-form-field">
        <Text className="webdav-form-label">服务器名称</Text>
        <SafeInput
          className="webdav-form-input"
          defaultValue={config?.name ?? ''}
          onInput={(v) => updateField('name', v)}
          placeholder="例如：坚果云"
          placeholderClass="webdav-form-placeholder"
        />
        <Text className="webdav-form-hint">起一个名字，用于识别不同的备份服务器</Text>
      </View>

      <View className="webdav-form-field">
        <Text className="webdav-form-label">服务器地址</Text>
        <SafeInput
          className="webdav-form-input"
          defaultValue={config?.url ?? ''}
          onInput={(v) => updateField('url', v)}
          placeholder="https://dav.jianguoyun.com/dav/我的密码"
          placeholderClass="webdav-form-placeholder"
        />
        <Text className="webdav-form-hint">填写备份的完整路径，请确保路径已提前创建好</Text>
      </View>

      <View className="webdav-form-field">
        <Text className="webdav-form-label">用户名</Text>
        <SafeInput
          className="webdav-form-input"
          defaultValue={config?.username ?? ''}
          onInput={(v) => updateField('username', v)}
          placeholder="请输入用户名"
          placeholderClass="webdav-form-placeholder"
        />
      </View>

      <View className="webdav-form-field">
        <Text className="webdav-form-label">密码</Text>
        <PasswordInput
          defaultValue={config?.password ?? ''}
          onInput={(v) => updateField('password', v)}
          placeholder="请输入密码"
          placeholderClass="webdav-form-placeholder"
        />
      </View>

      <View className="webdav-form-footer">
        <Button type="default" onClick={onCancel}>取消</Button>
        <Button type="primary" disabled={!isValid} onClick={handleSave}>保存</Button>
      </View>
    </View>
  )
}

export default WebDAVConfigForm
