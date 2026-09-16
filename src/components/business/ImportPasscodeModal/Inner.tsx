import React, { useState, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import { showToast } from '@/utils/toast'
import PatternLock from '@/components/business/PatternLock'
import PasswordInput from '@/components/base/PasswordInput'
import Button from '@/components/base/Button'
import { PasscodeType } from '@/types/passcode'
import { Password } from '@/types/password'

interface ImportPasscodeModalInnerProps {
  /** 导出口令类型：图案 / 文字 */
  passcodeType: PasscodeType
  /** 关闭口令输入弹窗 */
  onClose: () => void
  /** 提交导出口令，返回解析出的密码列表；验证失败返回 null（保持弹窗打开显示错误） */
  onSubmit: (value: string) => Promise<Password[] | null>
}

// 口令收集主体（小程序端与 RN 端弹窗共用）：
// 只负责收集图案 / 文字口令，验证与解析由父级（onSubmit）完成。
// 错误通过 Toast 提示，不在弹窗内插入错误元素，避免额外元素导致 PatternLock 位置上移。
// 弹窗本身不滚动、无缩放动画，因此 PatternLock 能完整显示且坐标测量准确。
const ImportPasscodeModalInner: React.FC<ImportPasscodeModalInnerProps> = ({
  passcodeType,
  onClose,
  onSubmit,
}) => {
  const [submitting, setSubmitting] = useState(false)
  // 文字口令输入框最新值（非受控，逐键写入 ref，提交时读取）
  const inputRef = useRef('')
  // 提交失败后重挂载文字输入框，清空已输入内容
  const [textKey, setTextKey] = useState(0)

  const submit = useCallback(async (value: string) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await onSubmit(value)
      if (result === null) {
        showToast({
          title: passcodeType === 'pattern' ? '图案错误，请重试' : '口令错误，请重试',
          icon: 'none',
        })
        // 文字口令：清空输入框让用户重新输入
        if (passcodeType === 'text') {
          inputRef.current = ''
          setTextKey((k) => k + 1)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }, [submitting, onSubmit, passcodeType])

  const handlePatternChange = useCallback((pattern: number[]) => {
    if (pattern.length < 4) {
      showToast({ title: '图案至少连接4个点', icon: 'none' })
      return
    }
    submit(pattern.join(','))
  }, [submit])

  const handleConfirmClick = useCallback(() => {
    submit(inputRef.current)
  }, [submit])

  return (
    <View className="import-pm-card">
      <View className="import-pm-header">
        <Text className="import-pm-title">输入导出口令</Text>
        <Text className="import-pm-close" onClick={onClose}>×</Text>
      </View>

      <Text className="import-pm-desc">
        {passcodeType === 'pattern' ? '请绘制导出时的图案口令' : '请输入导出时的口令'}
      </Text>

      {passcodeType === 'pattern' ? (
        <View className="import-pm-pattern">
          <PatternLock onChange={handlePatternChange} />
        </View>
      ) : (
        <View className="import-pm-input-row">
          <PasswordInput
            key={textKey}
            fieldClassName="import-pm-input-field"
            placeholder="请输入口令"
            placeholderClass="import-pm-placeholder"
            defaultValue=""
            onInput={(v) => { inputRef.current = v }}
            onConfirm={handleConfirmClick}
            focus
          />
          <Button
            type="primary"
            size="custom"
            style={{ width: 38, height: 38, borderRadius: 19, flexShrink: 0 }}
            onClick={handleConfirmClick}
          >
            →
          </Button>
        </View>
      )}

      <View className="import-pm-footer">
        <Button type="default" onClick={onClose}>取消</Button>
      </View>
    </View>
  )
}

export default ImportPasscodeModalInner