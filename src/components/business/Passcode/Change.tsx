import React, { useState, useCallback, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { showLoading, hideLoading } from '@/utils/loading'
import { showToast } from '@/utils/toast'
import PatternLock from '@/components/business/PatternLock'
import SafeInput from '@/components/base/SafeInput'
import Button from '@/components/base/Button'
import { PasscodeType } from '@/types/passcode'
import './index.scss'

interface ChangePasscodeProps {
  onChange: (newType: PasscodeType, newValue: string) => Promise<void>
  onClose: () => void
}

type Step = 'choose' | 'pattern' | 'text'

const ChangePasscode: React.FC<ChangePasscodeProps> = ({ onChange, onClose }) => {
  const [step, setStep] = useState<Step>('choose')
  // 密码输入框最新值（非受控，逐键写入 ref，确认时读取）
  const inputRef = useRef('')
  const confirmRef = useRef('')
  const [patternFirst, setPatternFirst] = useState<number[] | null>(null)
  const loadingRef = useRef(false)

  /** 让出主线程，给原生层机会先把 loading 绘制出来（RN 桥接需要，小程序端无害） */
  const yieldToRender = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50))

  /**
   * 更改口令。PBKDF2 为同步计算，会阻塞 JS 线程，
   * 因此必须使用原生 Loading（由原生层渲染，不依赖 JS 线程）。
   */
  const runChange = useCallback(async (newType: PasscodeType, newValue: string) => {
    loadingRef.current = true
    await showLoading({ title: '口令更改中', mask: true })
    await yieldToRender()
    try {
      await onChange(newType, newValue)
    } finally {
      await hideLoading()
      loadingRef.current = false
    }
  }, [onChange])

  const reset = useCallback(() => {
    setStep('choose')
    inputRef.current = ''
    confirmRef.current = ''
    setPatternFirst(null)
    loadingRef.current = false
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handlePatternComplete = useCallback(async (pattern: number[]) => {
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
        try {
          await runChange('pattern', patternStr)
          showToast({ title: '口令已更改', icon: 'success' })
          setTimeout(() => {
            handleClose()
          }, 100)
        } catch {
          showToast({ title: '更改失败，请重试', icon: 'none' })
        }
      } else {
        showToast({ title: '两次图案不一致，请重新绘制', icon: 'none' })
        setPatternFirst(null)
      }
    }
  }, [patternFirst, runChange, handleClose])

  const handlePasswordConfirm = useCallback(async () => {
    if (loadingRef.current) return
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
    try {
      await runChange('text', inputValue)
      showToast({ title: '口令已更改', icon: 'success' })
      setTimeout(() => {
        handleClose()
      }, 100)
    } catch {
      showToast({ title: '更改失败，请重试', icon: 'none' })
    }
  }, [runChange, handleClose])

  // 用 useCallback 包装 onInput，避免小程序端事件处理器更新时 Taro removeEventListener 报错
  const handleInput1 = useCallback((v: string) => {
    inputRef.current = v
  }, [])

  const handleInput2 = useCallback((v: string) => {
    confirmRef.current = v
  }, [])

  return (
    <View className="change-passcode">
      {step === 'choose' && (
        <>
          <Text className="master-desc">请选择新的口令类型</Text>
          <Text className="master-desc">请注意：不管是图案口令还是文字口令，请尽可能设置的长一点，因为口令越长数据越安全。</Text>
          <View className="master-options">
            <View className="master-option" onClick={() => setStep('pattern')}>
              <Text className="master-option-icon">🔢</Text>
              <Text className="master-option-title">图案口令</Text>
              <Text className="master-option-desc">绘制图案作为口令</Text>
            </View>
            <View className="master-option" onClick={() => setStep('text')}>
              <Text className="master-option-icon">🔤</Text>
              <Text className="master-option-title">文字口令</Text>
              <Text className="master-option-desc">输入文字作为口令</Text>
            </View>
          </View>
        </>
      )}

      {step === 'pattern' && (
        <>
          <Text className="master-title">
            {patternFirst === null ? '绘制新图案' : '再次绘制确认'}
          </Text>
          <Text className="master-desc">至少连接4个点，越长越好</Text>
          <PatternLock onChange={handlePatternComplete} />
          <View className="master-actions">
            <Button type="default" block onClick={() => { setStep('choose'); setPatternFirst(null) }}>返回</Button>
          </View>
        </>
      )}

      {step === 'text' && (
        <>
          <Text className="master-title">设置新口令</Text>
          <Text className="master-desc">口令至少4位，越长越好</Text>
          <View className="master-field">
            <Text className="master-label">输入新口令</Text>
            <SafeInput
              className="master-input"
              type="text"
              password
              placeholder="请输入新口令"
              defaultValue=""
              onInput={handleInput1}
            />
          </View>
          <View className="master-field">
            <Text className="master-label">确认新口令</Text>
            <SafeInput
              className="master-input"
              type="text"
              password
              placeholder="请再次输入新口令"
              defaultValue=""
              onInput={handleInput2}
            />
          </View>
          <View className="master-actions">
            <Button type="default" block onClick={() => setStep('choose')}>返回</Button>
            <Button
              type="primary"
              block
              disabled={loadingRef.current}
              onClick={handlePasswordConfirm}
            >
              {loadingRef.current ? '更改中...' : '确认'}
            </Button>
          </View>
        </>
      )}
    </View>
  )
}

export default ChangePasscode
