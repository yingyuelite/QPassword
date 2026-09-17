import React, { useState, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { showLoading, hideLoading } from '@/utils/loading'
import { showToast } from '@/utils/toast'
import PatternLock from '@/components/business/PatternLock'
import Icon from '@/components/base/Icon'
import PasswordInput from '@/components/base/PasswordInput'
import Button from '@/components/base/Button'
import { Passcode } from '@/types/passcode'
import './index.scss'

interface VerifyProps {
  passcode: Passcode
  onVerify: (value: string) => Promise<boolean>
}

const PasscodeVerify: React.FC<VerifyProps> = ({ passcode, onVerify }) => {
  // 密码输入框最新值（非受控，逐键写入 ref，验证时读取）
  const inputRef = useRef('')
  // 验证失败后重挂载输入框，清空已输入内容
  const [verifyKey, setVerifyKey] = useState(0)
  const [error, setError] = useState(false)

  /** 让出主线程，给原生层机会先把 loading 绘制出来（RN 桥接需要，小程序端无害） */
  const yieldToRender = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50))

  /**
   * 执行口令验证。
   * 注意：PBKDF2 为同步计算，会阻塞 JS 线程约 2s，
   * 因此必须使用原生 Loading（由原生层渲染，不依赖 JS 线程），
   * 若用 React 组件渲染 loading，会在 JS 线程被阻塞期间无法绘制。
   */
  const runVerify = async (value: string) => {
    await showLoading({ title: '口令验证中', mask: true })
    await yieldToRender()
    try {
      return await onVerify(value)
    } finally {
      await hideLoading()
    }
  }

  const handlePatternComplete = async (pattern: number[]) => {
    const ok = await runVerify(pattern.join(','))
    if (!ok) {
      setError(true)
      showToast({ title: '图案错误，请重试', icon: 'none' })
      setTimeout(() => setError(false), 1000)
    }
  }

  const handlePasswordVerify = async () => {
    if (!inputRef.current) {
      showToast({ title: '请输入口令', icon: 'none' })
      return
    }
    const ok = await runVerify(inputRef.current)
    if (!ok) {
      setError(true)
      showToast({ title: '口令错误，请重试', icon: 'none' })
      setTimeout(() => setError(false), 1000)
    }
    inputRef.current = ''
    setVerifyKey((k) => k + 1)
  }

  if (passcode.type === 'pattern') {
    return (
      <View className="master-page">
        <View className="master-card">
          <Icon name="key" size={80} />
          <Text className="master-title">验证口令</Text>
          <Text className="master-desc">请绘制图案解锁</Text>
          <View className={`pattern-wrap${error ? ' pattern-error' : ''}`}>
            <PatternLock onChange={handlePatternComplete} />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="master-page">
      <View className="master-card">
        <Icon name="key" size={80} />
        <Text className="master-title">验证口令</Text>
        <Text className="master-desc">请输入口令解锁</Text>
        <View className="master-input-row">
          <PasswordInput
            key={verifyKey}
            fieldClassName="master-input-field"
            placeholder="请输入口令"
            defaultValue=""
            onInput={(v) => { inputRef.current = v }}
            onConfirm={handlePasswordVerify}
            focus
          />
          <Button
            type="primary"
            size="custom"
            style={{ width: 38, height: 38, borderRadius: 19, marginLeft: 16, flexShrink: 0 }}
            onClick={handlePasswordVerify}
          >
            →
          </Button>
        </View>
      </View>
    </View>
  )
}

export default PasscodeVerify
