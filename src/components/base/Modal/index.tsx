import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
// 与 index.rn.scss 中 .modal 的 max-height: 80% 保持一致，保证 body 高度上限不会超出弹窗可视范围
const dialogHeight = Math.round(windowHeight * 0.8)
const dialogWidth = Math.round(windowWidth * 0.85)
// 换算基准与 rn.scss 一致：1rpx = windowWidth / 750 px
const scale = windowWidth / 750
// 估算 .modal-header / .modal-footer 的实际渲染高度（含上下 padding 与行高），略微取大作为安全余量
const headerHeight = Math.round(100 * scale)
const footerHeight = Math.round(120 * scale)
const bodyMaxHeight = Math.max(dialogHeight - headerHeight - footerHeight, 0)

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
    }
  }, [])

  if (!mounted) return null

  return (
    <View
      className={`modal-mask ${show ? 'modal-mask-show' : ''} ${hidden ? 'modal-mask-hidden' : ''}`}
      // @ts-ignore – catchtouchmove 是小程序原生属性，Taro 类型未覆盖
      catchtouchmove={() => {}}
    >
      <View
        className={`modal ${show ? 'modal-show' : ''}`}
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
  )
}

export default Modal
