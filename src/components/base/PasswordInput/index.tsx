import React, { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import SafeInput from '@/components/base/SafeInput'
import './index.scss'

/**
 * 通用密码输入框：在 SafeInput 基础上内置"显示 / 隐藏"切换（眼睛图标）。
 * 密码默认隐藏，点击眼睛可在明文 / 密文间切换。
 * 输入框自带盒样式（边框、背景、字号、右侧预留眼睛空间），
 * 其余属性（defaultValue / onInput / placeholder 等）透传给内部 SafeInput，
 * 其中 className 仅用于按需微调（覆盖自带盒样式时需谨慎，勿覆盖 padding-right）。
 */
interface PasswordInputProps {
  /** 输入框初值 / 已提交值（非受控） */
  defaultValue: string
  /** 每键输入回调，供父级把最新值写入 ref */
  onInput?: (value: string) => void
  /** 失焦 / 键盘确认回调 */
  onChange?: (value: string) => void
  onBlur?: () => void
  onConfirm?: (value: string) => void
  /** 输入框盒样式（边框、背景、字号等），追加到自带样式之后 */
  className?: string
  /** 外层容器 .password-input-field 的样式类，用于 flex 布局等场景 */
  fieldClassName?: string
  placeholder?: string
  placeholderClass?: string
  placeholderStyle?: string
  maxlength?: number
  focus?: boolean
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done'
  disabled?: boolean
  /** 其余 SafeInput 属性原样透传 */
  [key: string]: any
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  defaultValue,
  onInput,
  onChange,
  onBlur,
  onConfirm,
  className = '',
  fieldClassName = '',
  placeholder,
  placeholderClass,
  placeholderStyle,
  maxlength,
  focus,
  confirmType,
  disabled,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), [])

  return (
    <View className={`password-input-field ${fieldClassName}`.trim()}>
      <SafeInput
        className={`password-input-field-input ${className}`.trim()}
        defaultValue={defaultValue}
        onInput={onInput}
        onChange={onChange}
        onBlur={onBlur}
        onConfirm={onConfirm}
        password={!showPassword}
        placeholder={placeholder}
        placeholderClass={placeholderClass}
        placeholderStyle={placeholderStyle}
        maxlength={maxlength}
        focus={focus}
        confirmType={confirmType}
        disabled={disabled}
        {...rest}
      />
      <View className="password-input-eye" onClick={togglePassword}>
        <Text className="password-input-eye-icon">{showPassword ? '🙈' : '👁️'}</Text>
      </View>
    </View>
  )
}

export default PasswordInput
