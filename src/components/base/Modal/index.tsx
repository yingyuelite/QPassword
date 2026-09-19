import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ModalKeyboardContext, ModalInputFocusContext } from './context'
import './index.scss'

/** 过渡动画时长，需与 index.scss 中的 transition 时长保持一致 */
const ANIM_DURATION = 150

interface ModalProps {
  visible: boolean
  title?: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

// RN 端 getSystemInfoSync 返回的是模块加载时的缓存值，旋转屏幕后不会更新，
// 因此需要从 react-native 的 Dimensions 实时读取窗口尺寸
const getScreenSize = () => {
  return Taro.getSystemInfoSync()
}

const { windowHeight, windowWidth } = getScreenSize()
// 弹窗高度上限（与 index.rn.scss 的 max-height: 80% 对应）
const dialogHeight = Math.round(windowHeight * 0.8)
const dialogWidth = Math.round(windowWidth * 0.85)
// 换算基准与 rn.scss 一致：1rpx = windowWidth / 750 px
const scale = windowWidth / 750
// 估算 .modal-header / .modal-footer 高度。微信 scroll-view 需要「确定高度」才能滚动，
// 因此 body 必须给一个数值 max-height；这里取偏大值，宁可 body 略小也不要裁剪底部。
const headerHeight = Math.round(120 * scale)
const footerHeight = Math.round(160 * scale)

type KeyboardHeightCallback = (res: { height: number }) => void

/** 微信小程序全局 wx 上与键盘高度相关的接口（基础库 >= 2.7.0） */
interface WechatKeyboardApis {
  onKeyboardHeightChange?: (callback: KeyboardHeightCallback) => void
  offKeyboardHeightChange?: (callback: KeyboardHeightCallback) => void
}
// 微信小程序运行时提供全局 wx；直接取用，不依赖 Taro 的 API 代理是否包含该接口
declare const wx: WechatKeyboardApis | undefined

/**
 * 订阅全局键盘高度变化（兜底手段之一）。
 * 优先直接调用微信原生 wx.onKeyboardHeightChange（不依赖 Taro 代理）；
 * 若不可用再退回 Taro API。返回取消订阅函数。
 */
function subscribeKeyboardHeight(callback: KeyboardHeightCallback): () => void {
  if (typeof wx !== 'undefined' && typeof wx.onKeyboardHeightChange === 'function') {
    wx.onKeyboardHeightChange(callback)
    return () => wx.offKeyboardHeightChange?.(callback)
  }
  if (typeof Taro.onKeyboardHeightChange === 'function') {
    Taro.onKeyboardHeightChange(callback)
    return () => Taro.offKeyboardHeightChange?.(callback)
  }
  return () => {}
}

/** 自增计数器，为每个 Modal 实例生成唯一 id */
// let modalIdSeq = 0

const Modal: React.FC<ModalProps> = ({ visible, title, onClose, children, footer }) => {
  /**
   * 是否挂载。注意：首次打开后不再卸载（关闭仅隐藏）。
   * 小程序端若在关闭时 return null 删除节点，Taro 需要整层重写同级节点数组（无法定点删除数组元素），
   * 这会导致同级的 VirtualList/scroll-view 被重新渲染并应用初始 scroll-top=0，列表滚动位置丢失（回到顶部）。
   * 因此关闭动画结束后仅切换为隐藏态（visibility: hidden），保持 DOM 结构稳定。
   */
  const [mounted, setMounted] = useState(visible)
  /** 是否处于"显示"状态，用于切换动画 class */
  const [show, setShow] = useState(visible)
  /** 退场动画结束后置为 true，彻底隐藏节点（不可交互、不可见），但保留在 DOM 中 */
  const [hidden, setHidden] = useState(!visible)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * 输入法（键盘）高度。弹窗内的输入框聚焦时键盘会打开，若不做处理，固定定位的弹窗
   * 不会随键盘上移，表单底部的输入框会被键盘遮挡。
   * 收起键盘后高度为 0，弹窗恢复居中。
   */
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  // 延迟归零的定时器：用于吞掉键盘动画 / 切换输入框过程中瞬时上报的 0
  const keyboardResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 防抖应用定时器：把键盘动画期间的多次上报合并为「稳定后的最新值」
  const keyboardApplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingHeightRef = useRef(0)
  // 本次键盘会话内 keyboardchange 是否已上报过有效高度（用于让 focus 只做兜底）
  const keyboardchangeReportedRef = useRef(false)

  /**
   * 合并多个键盘高度来源（输入框 focus / 输入框 keyboardheightchange / 全局 wx 事件）。
   *
   * 不能取「最大值」：iOS 首次 focus 会上报一个偏大的值（例如终值 367 之前先报 562），
   * 取最大值会把偏大值永久保留，导致弹窗抬得过高（间隙≈弹窗高度）。
   * 改为「防抖取最新稳定值」：动画期间的上报不断重置定时器，稳定后才应用最后一次值，
   * 既能跟上键盘又能避免中间值与异常值造成的抖动/过高。
   * 归零延迟更长，用于吞掉切换输入框时 blur(0)→focus(新值) 的瞬时 0。
   */
  const applyKeyboardHeight = useCallback((height: number, source?: string) => {
    if (source === 'keyboardchange') {
      keyboardchangeReportedRef.current = height > 0
    }

    // keyboardchange 是可靠的键盘高度来源；iOS 上 focus 的首个事件可能上报偏大值，
    // 一旦本次键盘已由 keyboardchange 上报过，就忽略 focus，避免把高度带偏（过高）。
    if (source === 'focus' && keyboardchangeReportedRef.current) return

    const clearApply = () => {
      if (keyboardApplyTimer.current) {
        clearTimeout(keyboardApplyTimer.current)
        keyboardApplyTimer.current = null
      }
    }
    const clearReset = () => {
      if (keyboardResetTimer.current) {
        clearTimeout(keyboardResetTimer.current)
        keyboardResetTimer.current = null
      }
    }

    if (height > 0) {
      clearReset()
      pendingHeightRef.current = height
      clearApply()
      keyboardApplyTimer.current = setTimeout(() => {
        keyboardApplyTimer.current = null
        setKeyboardHeight(pendingHeightRef.current)
      }, 60)
    } else {
      clearApply()
      pendingHeightRef.current = 0
      clearReset()
      keyboardResetTimer.current = setTimeout(() => {
        keyboardResetTimer.current = null
        setKeyboardHeight(0)
      }, 120)
    }
  }, [])

  useEffect(() => {
    return subscribeKeyboardHeight((res) => applyKeyboardHeight(res.height, 'global'))
  }, [applyKeyboardHeight])

  // 当前聚焦的输入框 id（由 ModalInputFocusContext 上报），键盘弹出后据此滚动到可见区域
  const focusedInputIdRef = useRef('')
  const [scrollIntoViewId, setScrollIntoViewId] = useState('')
  const scrollIntoViewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 供 handleInputFocus 读取当前键盘状态（避免闭包读到旧值）
  const keyboardHeightStateRef = useRef(0)
  keyboardHeightStateRef.current = keyboardHeight

  const triggerScrollIntoView = useCallback((id: string) => {
    if (!id) return
    // 先清空再设置，保证多次聚焦同一个 id 时也能重新触发 scroll-into-view
    setScrollIntoViewId('')
    if (scrollIntoViewTimer.current) clearTimeout(scrollIntoViewTimer.current)
    scrollIntoViewTimer.current = setTimeout(() => {
      scrollIntoViewTimer.current = null
      setScrollIntoViewId(id)
    }, 30)
  }, [])

  const handleInputFocus = useCallback((id: string) => {
    focusedInputIdRef.current = id
    // 键盘已弹起（切换输入框）时立即滚动；键盘尚未弹起则由下方 keyboardHeight 的 effect 处理
    if (keyboardHeightStateRef.current > 0) {
      triggerScrollIntoView(id)
    }
  }, [triggerScrollIntoView])

  // 键盘弹出、弹窗高度收缩完成后，把聚焦的输入框滚动到可见区域，
  // 避免处于表单底部、被收缩后的 body 裁掉的输入框不可见。
  // 注意：这里必须在定时器触发时读取「最新的」聚焦 id，不能用调度时的快照，
  // 否则键盘弹起过程中用户又点了别的输入框时，会滚动到旧输入框，把当前聚焦的输入框挤出可视区域。
  useEffect(() => {
    if (keyboardHeight <= 0) return
    const timer = setTimeout(() => triggerScrollIntoView(focusedInputIdRef.current), 300)
    return () => clearTimeout(timer)
  }, [keyboardHeight, triggerScrollIntoView])

  // 键盘收起后清理滚动定位状态，避免下次打开时复用陈旧 id 触发错误滚动
  useEffect(() => {
    if (keyboardHeight > 0) return
    focusedInputIdRef.current = ''
    setScrollIntoViewId('')
  }, [keyboardHeight])

  useEffect(() => {
    if (visible) {
      // 进入：先挂载并取消隐藏，下一帧再切换到显示态，确保 transition 生效
      setMounted(true)
      setHidden(false)
      if (exitTimer.current) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
      enterTimer.current = setTimeout(() => setShow(true), 16)
    } else {
      // 退出：先切到隐藏态播放动画，动画结束后彻底隐藏（但不卸载，避免小程序端同级节点数组重写导致列表滚动位置丢失）
      setShow(false)
      if (keyboardResetTimer.current) {
        clearTimeout(keyboardResetTimer.current)
        keyboardResetTimer.current = null
      }
      if (keyboardApplyTimer.current) {
        clearTimeout(keyboardApplyTimer.current)
        keyboardApplyTimer.current = null
      }
      setKeyboardHeight(0)
      focusedInputIdRef.current = ''
      setScrollIntoViewId('')
      if (enterTimer.current) {
        clearTimeout(enterTimer.current)
        enterTimer.current = null
      }
      exitTimer.current = setTimeout(() => setHidden(true), ANIM_DURATION)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (exitTimer.current) clearTimeout(exitTimer.current)
      if (keyboardResetTimer.current) clearTimeout(keyboardResetTimer.current)
      if (keyboardApplyTimer.current) clearTimeout(keyboardApplyTimer.current)
      if (scrollIntoViewTimer.current) clearTimeout(scrollIntoViewTimer.current)
    }
  }, [])

  if (!mounted) return null

  // 键盘弹出时，遮罩下边界上移到键盘顶部（bottom = 键盘高度），弹窗在键盘上方区域居中。
  // 弹窗/body 用数值 max-height：微信 scroll-view 只有拿到确定的数值高度才能滚动；
  // 同时 header/footer 用偏大的估算值，保证 body 上限不会超过弹窗可视高度、避免底部被裁剪。
  const keyboardOpen = keyboardHeight > 0
  const availableHeight = Math.max(windowHeight - keyboardHeight, 0)
  const dialogMaxHeight = keyboardOpen ? Math.min(dialogHeight, availableHeight) : dialogHeight
  const bodyMaxHeight = Math.max(dialogMaxHeight - headerHeight - footerHeight, 0)

  return (
    <ModalKeyboardContext.Provider value={applyKeyboardHeight}>
      <ModalInputFocusContext.Provider value={handleInputFocus}>
        <View
          className={`modal-mask ${show ? 'modal-mask-show' : ''} ${hidden ? 'modal-mask-hidden' : ''}`}
          // @ts-ignore – catchtouchmove 是小程序原生属性，Taro 类型未覆盖
          catchtouchmove={() => {}}
          style={keyboardOpen ? { bottom: keyboardHeight } : undefined}
        >
          <View
            className={`modal ${show ? 'modal-show' : ''}`}
            style={keyboardOpen ? { maxHeight: dialogMaxHeight } : undefined}
          >
            {title ? (
              <View className="modal-header">
                <Text className="modal-title">{title}</Text>
                <Text className="modal-close" onClick={onClose}>×</Text>
              </View>
            ) : null}

            <ScrollView
              className="modal-body"
              scrollY
              // @ts-ignore
              nestedScrollEnabled
              scrollIntoView={scrollIntoViewId || undefined}
              // 用动画滚动，微信会同步移动聚焦的原生输入框层，避免滚动时输入框错位到容器外
              scrollWithAnimation
              style={{ width: dialogWidth, maxHeight: bodyMaxHeight }}
            >
              <View className="modal-content">
                {children}
              </View>
            </ScrollView>

            {footer ? (
              <View className="modal-footer">
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </ModalInputFocusContext.Provider>
    </ModalKeyboardContext.Provider>
  )
}

export default Modal
