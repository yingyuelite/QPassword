import React, { useState, useRef, useCallback, useContext } from 'react'
import { Input } from '@tarojs/components'
import { ModalKeyboardContext } from '@/components/base/Modal/context'

// 通用非受控输入框：
// 彻底不传 value（只传 defaultValue），输入框展示完全交给原生输入框自身维护，
// 输入过程中不会有任何 value 的 setData，规避 weapp 端快速输入丢字、删除回弹。
// 父级通过 onInput 逐键拿到最新值写入 ref；失焦 / 键盘确认时通过 onChange 提交稳定值。
// 当父级在非输入状态下更新 defaultValue（重置、历史回填、清空等）时，
// 通过 key 重挂载输入框让新初值立即展示（非受控下 defaultValue 仅在挂载时生效）。
interface SafeInputProps {
  /** 输入框初值 / 已提交值（非受控；外部更新后会自动重挂载生效） */
  defaultValue: string
  /** 每键输入回调，供父级把最新值写入 ref（不应回写为 defaultValue，避免 value setData 竞态） */
  onInput?: (value: string) => void
  /** 失焦 / 键盘确认时的提交回调（值已稳定，父级可同步为展示值） */
  onChange?: (value: string) => void
  onBlur?: () => void
  onConfirm?: (value: string) => void
  /** 原样透传给内部 Input（聚焦 / 点击，供下拉、stopPropagation 等场景使用） */
  onFocus?: (e: any) => void
  onClick?: (e: any) => void
  className?: string
  type?: 'text' | 'number' | 'idcard' | 'digit' | 'safe-password' | 'nickname'
  password?: boolean
  placeholder?: string
  placeholderClass?: string
  placeholderStyle?: string
  maxlength?: number
  focus?: boolean
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done'
  disabled?: boolean
}

const SafeInput: React.FC<SafeInputProps> = ({
  defaultValue,
  onInput,
  onChange,
  onBlur,
  onConfirm,
  onFocus,
  onClick,
  ...rest
}) => {
  // 重挂载计数：defaultValue 在非输入状态下被外部更新时重挂载输入框，让新初值立即展示
  const [inputKey, setInputKey] = useState(0)
  // 输入框当前文本（输入过程中逐键更新，失焦/确认时提交）
  const valueRef = useRef(defaultValue)
  // 上一次渲染时的 defaultValue，用于识别"外部更新"而非渲染噪音
  const lastDefaultRef = useRef(defaultValue)
  // 在 base Modal 内时用于上报键盘高度，供弹窗避让输入法（不在 Modal 内为 null）
  const reportKeyboardHeight = useContext(ModalKeyboardContext)

  // defaultValue 变化且与当前输入值不同时重挂载输入框（重置、历史回填、清空等场景）。
  // 输入过程中若父级把同一值回传，defaultValue 与 valueRef 相同，不会重挂载，避免输入中断
  if (defaultValue !== lastDefaultRef.current) {
    lastDefaultRef.current = defaultValue
    if (defaultValue !== valueRef.current) {
      valueRef.current = defaultValue
      setInputKey((k) => k + 1)
    }
  }

  const handleInput = useCallback((e: any) => {
    const v = e.detail.value
    valueRef.current = v
    onInput?.(v)
  }, [onInput])

  // 聚焦时微信的 focus 事件会携带键盘高度（e.detail.height），上报给 Modal 用于避让输入法
  const handleFocus = useCallback((e: any) => {
    onFocus?.(e)
    reportKeyboardHeight?.(e?.detail?.height ?? 0, 'focus')
  }, [onFocus, reportKeyboardHeight])

  // 键盘高度变化（含收起时 height=0），持续同步给 Modal
  const handleKeyboardHeightChange = useCallback((e: any) => {
    reportKeyboardHeight?.(e?.detail?.height ?? 0, 'keyboardchange')
  }, [reportKeyboardHeight])

  const handleBlur = useCallback(() => {
    onBlur?.()
    onChange?.(valueRef.current)
    // 失焦时键盘通常会收起，重置避让距离（兼容不触发全局/组件键盘事件的情况）
    reportKeyboardHeight?.(0)
  }, [onBlur, onChange, reportKeyboardHeight])

  const handleConfirm = useCallback(() => {
    onConfirm?.(valueRef.current)
    onChange?.(valueRef.current)
  }, [onConfirm, onChange])

  return (
    <Input
      key={inputKey}
      defaultValue={defaultValue}
      onInput={handleInput}
      onBlur={handleBlur}
      onConfirm={handleConfirm}
      onFocus={handleFocus}
      onKeyboardHeightChange={reportKeyboardHeight ? handleKeyboardHeightChange : undefined}
      // 在 base Modal 内时，键盘避让完全由 Modal 负责（上报高度 + 移动弹窗）。
      // 必须关闭微信自带的 adjust-position：iOS 端它会把 position:fixed 的弹窗也一起上推，
      // 与手动上移叠加导致抬得过高（弹窗与键盘间出现大片空隙）；Android 端只滚动页面故无此问题。
      adjustPosition={reportKeyboardHeight ? false : undefined}
      onClick={onClick}
      {...rest}
    />
  )
}

export default SafeInput
