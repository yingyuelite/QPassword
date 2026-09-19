import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { View, Input, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
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

interface TagAutocompleteInputProps {
  tags: string[]
  allTags: string[]
  onChange: (tags: string[]) => void
}

// 触摸结束后保留"正在交互"标记的时长，覆盖 H5 上 blur 晚于 touchend 的时序
const CLEAR_INTERACTION_DELAY = 400

const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({ tags, allTags, onChange }) => {
  // 输入过程中的当前文本（驱动下拉过滤与确认新增）。
  // 输入框为非受控（默认不传 value），输入框展示由原生输入框自身维护，避免逐键 value 回写导致丢字/回弹
  const [filterText, setFilterText] = useState('')
  const filterTextRef = useRef('')
  // 用于"添加标签后清空输入框"的瞬时受控值；默认 null 表示非受控，仅在清空时短暂传入 value
  const [forcedValue, setForcedValue] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
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
    const onChange1 = (res: { height: number }) => {
      keyboardHeightRef.current = res.height
      setKeyboardHeight(res.height)
    }
    Taro.onKeyboardHeightChange(onChange1)
    return () => {
      Taro.offKeyboardHeightChange(onChange1)
    }
  }, [])

  useEffect(() => {
    openRef.current = focused || keepOpen
  }, [focused, keepOpen])

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

  const selectedSet = useMemo(() => new Set(tags), [tags])

  const filtered = useMemo(() => {
    const kw = filterText.toLowerCase()
    return allTags
      .filter((t) => !selectedSet.has(t))
      .filter((t) => !kw || t.toLowerCase().includes(kw))
      .slice(0, 50)
  }, [filterText, allTags, selectedSet])

  const showDropdown = (focused || keepOpen) && filtered.length > 0

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

  const addTag = useCallback((tag: string) => {
    if (!tag.trim()) return
    if (selectedSet.has(tag)) return
    onChange([...tags, tag.trim()])
  }, [tags, selectedSet, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }, [tags, onChange])

  const handleFocus = useCallback(() => {
    clearBlurTimer()
    // 聚焦本输入框时，立即关闭其他输入框的下拉（点击另一个输入框一次即可切换）
    closeOtherDropdowns(idRef.current)
    setFocused(true)
    setKeepOpen(false)
  }, [clearBlurTimer])

  const handleBlur = useCallback(() => {
    // 滚动/点击下拉列表期间产生的 blur 不应关闭列表
    if (interactingRef.current) return
    timerRef.current = setTimeout(() => {
      // 键盘已收起说明 blur 来自键盘隐藏，保持选项；否则（切到其他输入框等）关闭
      if (isWeapp && keyboardHeightRef.current === 0) {
        setKeepOpen(true)
      } else {
        setKeepOpen(false)
      }
      setFocused(false)
    }, 80)
  }, [])

  const handleInput = useCallback((value: string) => {
    // 输入过程中不应关闭列表；仅更新过滤文本，不写回输入框 value，避免逐键 value setData 竞态
    clearBlurTimer()
    setFilterText(value)
    filterTextRef.current = value
  }, [clearBlurTimer])

  // 添加标签后清空输入框：瞬时传入受控 value='' 清空原生输入框；
  // 下一帧释放回非受控（移除 value），避免后续输入被 value 重置（被删的字回弹）
  const clearInput = useCallback(() => {
    setForcedValue('')
    setTimeout(() => setForcedValue(null), 0)
  }, [])

  const handleSelect = useCallback((tag: string) => {
    clearBlurTimer()
    addTag(tag)
    setFilterText('')
    filterTextRef.current = ''
    clearInput()
    // 选中后保持输入框聚焦与下拉展开，便于连续添加多个标签；
    // 同时避免"选中即 blur，又被 keyboardShouldPersistTaps 重聚焦触发 onFocus 重新展开"的闪烁。
    interactingRef.current = false
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
  }, [addTag, clearBlurTimer, clearInput])

  const handleConfirm = useCallback(() => {
    const t = filterTextRef.current
    if (t.trim()) {
      addTag(t.trim())
    }
    setFilterText('')
    filterTextRef.current = ''
    clearInput()
    clearBlurTimer()
    // 选中后保持输入框聚焦与下拉展开，避免闪烁（见 handleSelect 说明）
    interactingRef.current = false
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current)
      interactionTimerRef.current = null
    }
  }, [addTag, clearBlurTimer, clearInput])

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
    <View className="tag-autocomplete-dropdown-content">
      {filtered.map((tag) => (
        <Text
          key={tag}
          className="tag-autocomplete-item"
          onClick={(e) => {
            stopPropagation(e)
            handleSelect(tag)
          }}
        >{tag}</Text>
      ))}
    </View>
  ), [filtered, handleSelect])

  return (
    <View className="tag-autocomplete">
      <View className="tag-autocomplete-wrapper">
        <Input
          className="tag-edit-input"
          defaultValue=""
          {...(forcedValue !== null ? { value: forcedValue } : {})}
          focus={focused}
          placeholder="输入标签搜索或按Enter新增"
          onInput={(e) => handleInput(e.detail.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onConfirm={handleConfirm}
          onClick={(e) => {
            stopPropagation(e)
            // RN：选中标签后输入框可能仍保留焦点（keyboardShouldPersistTaps 使键盘不收起），
            // 再次点击不会触发 onFocus，导致下拉无法重新展开。这里点击输入框时显式展开下拉。
            if (!focused) {
              setFocused(true)
              setKeepOpen(false)
            }
          }}
        />
        {/* 下拉列表始终挂载，通过 display 控制显隐，保持 wrapper 子树结构稳定。
            否则 weapp 端 CustomWrapper 在子树结构变化（下拉出现/消失）时会对该子树整体
            cn 节点重置，把输入框元素旧的 value 重新应用回去，导致正在输入的内容被替换 */}
        <ScrollView
          enable-flex="true"
          className="tag-autocomplete-dropdown"
          style={showDropdown ? {} : { display: 'none' }}
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
      {tags.length > 0 ? (
        <View className="tag-list">
          {tags.map((tag) => (
            <Text
              key={tag}
              className="tag-chip"
              onClick={() => removeTag(tag)}
            >{tag} ×</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default TagAutocompleteInput
