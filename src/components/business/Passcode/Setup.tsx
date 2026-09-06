import React, { useState, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { showLoading, hideLoading } from '@/utils/loading'
import { showToast } from '@/utils/toast'
import PatternLock from '@/components/business/PatternLock'
import Icon from '@/components/base/Icon'
import SafeInput from '@/components/base/SafeInput'
import Button from '@/components/base/Button'
import { PasscodeType } from '@/types/passcode'
import './index.scss'

interface SetupProps {
  onSetup: (type: PasscodeType, value: string) => Promise<void>
}

const PasscodeSetup: React.FC<SetupProps> = ({ onSetup }) => {
  const [step, setStep] = useState<'choose' | 'pattern' | 'text'>('choose')
  // 密码输入框最新值（非受控，逐键写入 ref，确认时读取）
  const inputRef = useRef('')
  const confirmRef = useRef('')
  const [patternFirst, setPatternFirst] = useState<number[] | null>(null)

  /** 让出主线程，给原生层机会先把 loading 绘制出来（RN 桥接需要，小程序端无害） */
  const yieldToRender = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50))

  /**
   * 保存口令。PBKDF2 为同步计算，会阻塞 JS 线程，
   * 因此必须使用原生 Loading（由原生层渲染，不依赖 JS 线程）。
   */
  const runSetup = async (type: PasscodeType, value: string) => {
    await showLoading({ title: '口令设置中', mask: true })
    await yieldToRender()
    try {
      await onSetup(type, value)
    } finally {
      await hideLoading()
    }
  }

  const handleChoosePattern = () => setStep('pattern')
  const handleChooseText = () => setStep('text')

  const handlePatternComplete = (pattern: number[]) => {
    if (pattern.length < 4) {
      showToast({ title: '图案至少连接4个点', icon: 'none' })
      return
    }
    const patternStr = pattern.join(',')
    if (patternFirst === null) {
      setPatternFirst(pattern)
      showToast({ title: '请再次绘制图案确认', icon: 'none' })
    } else {
      if (patternFirst.join(',') === patternStr) {
        runSetup('pattern', patternStr)
      } else {
        showToast({ title: '两次图案不一致，请重新绘制', icon: 'none' })
        setPatternFirst(null)
      }
    }
  }

  const handlePasswordConfirm = () => {
    const inputValue = inputRef.current
    const confirmValue = confirmRef.current
    if (inputValue.length < 4) {
      showToast({ title: '口令至少4位', icon: 'none' })
      return
    }
    if (inputValue !== confirmValue) {
      showToast({ title: '两次口令不一致', icon: 'none' })
      return
    }
    runSetup('text', inputValue)
  }

  if (step === 'choose') {
    return (
      <View className="master-page">
        <View className="master-card">
          <Icon name="key" size={48} />
          <Text className="master-title">设置口令</Text>
          <Text className="master-desc">口令用于保护您的密码数据，请选择一种方式设置。</Text>
          <Text className="master-desc">请注意：不管是图案口令还是文字口令，请尽可能设置的长一点，因为口令越长数据越安全。</Text>
          <View className="master-options">
            <View className="master-option" onClick={handleChoosePattern}>
              <Text className="master-option-icon">🔢</Text>
              <Text className="master-option-title">图案口令</Text>
              <Text className="master-option-desc">绘制图案作为口令</Text>
            </View>
            <View className="master-option" onClick={handleChooseText}>
              <Text className="master-option-icon">🔤</Text>
              <Text className="master-option-title">文字口令</Text>
              <Text className="master-option-desc">输入文字作为口令</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  if (step === 'pattern') {
    return (
      <View className="master-page">
        <View className="master-card">
          <Text className="master-title">
            {patternFirst === null ? '绘制图案' : '再次绘制确认'}
          </Text>
          <Text className="master-desc">至少连接4个点，越长越好</Text>
          <PatternLock onChange={handlePatternComplete} />
          <View className="master-actions">
            <Button type="default" block onClick={() => { setStep('choose'); setPatternFirst(null) }}>返回</Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="master-page">
      <View className="master-card">
        <Text className="master-title">设置口令</Text>
        <Text className="master-desc">口令至少4位，越长越好</Text>
        <View className="master-field">
          <Text className="master-label">输入口令</Text>
          <SafeInput
            className="master-input"
            type="text"
            password
            placeholder="请输入口令"
            defaultValue=""
            onInput={(v) => { inputRef.current = v }}
          />
        </View>
        <View className="master-field">
          <Text className="master-label">确认口令</Text>
          <SafeInput
            className="master-input"
            type="text"
            password
            placeholder="请再次输入口令"
            defaultValue=""
            onInput={(v) => { confirmRef.current = v }}
          />
        </View>
        <View className="master-actions">
          <Button type="default" block onClick={() => setStep('choose')}>返回</Button>
          <Button type="primary" block onClick={handlePasswordConfirm}>确认</Button>
        </View>
      </View>
    </View>
  )
}

export default PasscodeSetup
