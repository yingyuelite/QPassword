import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import SafeInput from '@/components/base/SafeInput'
import {
  nextDropdownId,
  subscribeDropdownClose,
  closeOtherDropdowns,
} from '@/utils/dropdownBus'
import { stopPropagation } from '@/utils/event'
import './index.scss'

const isWeapp = process.env.TARO_ENV === 'weapp'
const isRN = process.env.TARO_ENV === 'rn'

// RN 专用 ScrollView 属性：
// - keyboardShouldPersistTaps：避免 RN 在输入框聚焦时，第一次点击下拉项被系统"吞掉"仅用于收起键盘，
//   导致需要点第二次才能选中（点击穿透问题）。
// - nestedScrollEnabled：下拉 ScrollView 嵌在页面 ScrollView 内时，让滑动手势作用于下拉本身而非整页。
const rnScrollProps: any = isRN
  ? { keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true }
  : {}

interface AutocompleteInputProps {
  // 输入框初值（非受控，输入框展示由原生输入框自身维护）；
  // 选择建议后父级通过 onCommit 更新该值，SafeInput 检测到变化后重挂载让建议值立即展示
  defaultValue: string
  suggestions: string[]
  onInput: (value: string) => void
  // 输入提交回调（失焦 / 选择建议 / 键盘确认键）：父级需把当前输入同步为展示值，
  // 选择建议时依赖它更新 defaultValue，SafeInput 才会重挂载让完整建议值展示
  onCommit: (value: string) => void
  placeholder?: string
  className?: string
  type?: 'text' | 'number' | 'idcard' | 'digit' | 'safe-password' | 'nickname'
  password?: boolean
}

// 触摸结束后保留"正在交互"标记的时长，覆盖 H5 上 blur 晚于 touchend 的时序
const CLEAR_INTERACTION_DELAY = 400

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  defaultValue,
  suggestions,
  onInput,
  onCommit,
  placeholder,
  className,
  type,
  password,
}) => {
  const [focused, setFocused] = useState(false)
  // 输入过程中的当前文本（驱动下拉过滤），非受控输入框本身由原生输入框维护
  const [filterText, setFilterText] = useState(defaultValue)
  const filterTextRef = useRef(defaultValue)
  const focusedRef = useRef(false)
  // 键盘收起后仍保持下拉选项，避免点击键盘隐藏按钮时选项消失
  const [keepOpen, setKeepOpen] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 正在与下拉列表交互（滚动/点击）时，忽略 input 的 blur，避免列表意外消失
  const interactingRef = useRef(false)
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardHeightRef = useRef(0)
  const openRef = useRef(false)
  const idRef = useRef(nextDropdownId())

  // 监听键盘高度（仅小程序），键盘弹起时把下拉选项定位到键盘上方
  useEffect(() => {
    if (!isWeapp) return
    const onChange = (res: { height: number }) => {
      keyboardHeightRef.current = res.height
      setKeyboardHeight(res.height)
    }
    Taro.onKeyboardHeightChange(onChange)
    return () => {
      Taro.offKeyboardHeightChange(onChange)
    }
  }, [])

  useEffect(() => {
    openRef.current = focused || keepOpen
  }, [focused, keepOpen])

  // 输入过程中保持内部文本（focused 时不跟随 defaultValue）；
  // 失焦后 defaultValue 变化（父级提交）时同步内部文本，保证再次聚焦时下拉过滤基于已提交值
  useEffect(() => {
    if (!focusedRef.current) {
      setFilterText(defaultValue)
      filterTextRef.current = defaultValue
    }
  }, [defaultValue])

  useEffect(() => {
    focusedRef.current = focused
  }, [focused])

  // 键盘收起时保持选项；键盘重新弹起且焦点已切到其他输入框时关闭选项
  useEffect(() => {
    if (!isWeapp) return
    if (keyboardHeight === 0 && openRef.current) {
      setKeepOpen(true)
    }
    // 仅在焦点已离开本输入框（切到其他输入框）时关闭，避免"弹出再关闭"的闪烁
    if (keyboardHeight > 0 && !focused) {
      setKeepOpen(false)
    }
  }, [keyboardHeight, focused])

  const filtered = useMemo(() => {
    if (!filterText) return suggestions.slice(0, 50)
    const kw = filterText.toLowerCase()
    return suggestions
      .filter((s) => s.toLowerCase().includes(kw))
      .slice(0, 50)
  }, [filterText, suggestions])

  const showDropdown = (focused || keepOpen) && filtered.length > 0
  // 小程序端键盘弹起时，选项以"键盘上方的悬浮条"形式展示，避免被键盘遮挡
  const showStrip = isWeapp && keyboardHeight > 0 && showDropdown
  const showBelow = showDropdown && !showStrip

  const clearBlurTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const markInteracting = useCallback(() => {
    interactingRef.current = true
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
  }, [])

  const clearInteraction = useCallback(() => {
    interactionTimerRef.current = setTimeout(() => {
      interactingRef.current = false
      interactionTimerRef.current = null
    }, CLEAR_INTERACTION_DELAY)
  }, [])

  const handleFocus = useCallback(() => {
    clearBlurTimer()
    // 聚焦本输入框时，立即关闭其他输入框的下拉（点击另一个输入框一次即可切换）
    closeOtherDropdowns(idRef.current)
    setFocused(true)
    setKeepOpen(false)
  }, [clearBlurTimer])

  const handleBlur = useCallback(() => {
    // 滚动/点击下拉列表期间产生的 blur 不应关闭列表，也不应提交（选择建议时会提交）
    if (interactingRef.current) return
    // 失焦即提交当前输入，父级同步展示值
    onCommit(filterTextRef.current)
    timerRef.current = setTimeout(() => {
      // 键盘已收起说明 blur 来自键盘隐藏，保持选项；否则（切到其他输入框等）关闭
      if (isWeapp && keyboardHeightRef.current === 0) {
        setKeepOpen(true)
      } else {
        setKeepOpen(false)
      }
      setFocused(false)
    }, 80)
  }, [onCommit])

  const handleInput = useCallback((text: string) => {
    setFilterText(text)
    filterTextRef.current = text
    onInput(text)
  }, [onInput])

  const handleSelect = useCallback((suggestion: string) => {
    clearBlurTimer()
    setFilterText(suggestion)
    filterTextRef.current = suggestion
    onInput(suggestion)
    // 父级 onCommit 更新 defaultValue 后，SafeInput 检测到变化自动重挂载输入框，
    // 让提交后的 defaultValue（完整建议值）立即展示，无需手动 key 重挂载
    onCommit(suggestion)
    // 选中后保持输入框聚焦与展开，避免"选中即 blur 又被 keyboardShouldPersistTaps
    // 重聚焦触发 onFocus 重新展开"的闪烁。
    interactingRef.current = false
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
  }, [onInput, onCommit, clearBlurTimer])

  const handleConfirm = useCallback((value: string) => {
    onCommit(value)
    setFilterText(value)
    filterTextRef.current = value
  }, [onCommit])

  const handleDismiss = useCallback(() => {
    clearBlurTimer()
    setFocused(false)
    setKeepOpen(false)
    interactingRef.current = false
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
  }, [clearBlurTimer])

  // 注册"点击其他下拉时关闭本下拉"的关闭函数，卸载时自动移除
  useEffect(() => {
    return subscribeDropdownClose(idRef.current, handleDismiss)
  }, [handleDismiss])

  const renderItems = useCallback(() => (
    <View className="autocomplete-dropdown-content">
      {filtered.map((s) => (
        <Text
          key={s}
          className="autocomplete-item"
          onClick={(e) => {
            stopPropagation(e)
            handleSelect(s)
          }}
        >{s}</Text>
      ))}
    </View>
  ), [filtered, handleSelect])

  return (
    <View className="autocomplete-wrapper">
      <SafeInput
        className={className || 'autocomplete-edit-input'}
        defaultValue={defaultValue}
        type={type}
        password={password}
        focus={focused}
        placeholder={placeholder}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onConfirm={handleConfirm}
        onClick={(e) => {
          stopPropagation(e)
          // RN：选中建议后输入框可能仍保留焦点（keyboardShouldPersistTaps 使键盘不收起），
          // 再次点击不会触发 onFocus，导致下拉无法重新展开。这里点击输入框时显式展开下拉。
          if (!focusedRef.current) {
            setFocused(true)
            setKeepOpen(false)
          }
        }}
      />
      {/* 下拉列表始终挂载，通过 display 控制显隐，保持 wrapper 子树结构稳定。
          否则 weapp 端 CustomWrapper 在子树结构变化（下拉出现/消失）时会对该子树整体
          cn 节点重置，把输入框元素旧的 value 重新应用回去，导致正在输入的内容被替换 */}
      <View
        className="autocomplete-strip"
        style={showStrip ? { bottom: keyboardHeight } : { display: 'none' }}
      >
        <ScrollView
          className="autocomplete-strip-scroll"
          scrollY
          onClick={(e) => stopPropagation(e)}
          onTouchStart={markInteracting}
          onTouchMove={markInteracting}
          onTouchEnd={clearInteraction}
          onTouchCancel={clearInteraction}
          {...rnScrollProps}
        >
          {renderItems()}
        </ScrollView>
      </View>
      <ScrollView
        className="autocomplete-dropdown"
        style={showBelow ? {} : { display: 'none' }}
        scrollY
        onClick={(e) => stopPropagation(e)}
        onTouchStart={markInteracting}
        onTouchMove={markInteracting}
        onTouchEnd={clearInteraction}
        onTouchCancel={clearInteraction}
        {...rnScrollProps}
      >
        {renderItems()}
      </ScrollView>
    </View>
  )
}

export default AutocompleteInput
