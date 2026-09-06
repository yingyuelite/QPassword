import React, { useEffect, useState } from 'react'
import { Modal as RNModal, View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'

interface ModalProps {
  visible: boolean
  title?: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

/**
 * 依据当前窗口宽高计算弹窗尺寸与样式。
 * RN 端 Taro.getSystemInfoSync 返回的是模块加载时的缓存值，旋转屏幕后不会更新，
 * 因此需要从 react-native 的 Dimensions 实时读取窗口尺寸，并在旋转时重新计算。
 */
function computeStyles() {
  const { height: windowHeight, width: windowWidth } = Dimensions.get('window')
  // 与小程序端保持一致：弹窗高度上限为窗口高度的 80%
  const dialogHeight = Math.round(windowHeight * 0.8)
  const dialogWidth = Math.round(windowWidth * 0.85)

  // 把 750 设计稿中的 px 换算为当前屏幕的 dp，与 rn.scss 的换算基准保持一致
  const scale = windowWidth / 750
  const p = (n: number) => Math.round(n * scale)
  // 估算 header / footer 的实际渲染高度（含上下 padding 与行高），略微取大作为安全余量
  const headerHeight = p(100)
  const footerHeight = p(120)
  const bodyMaxHeight = Math.max(dialogHeight - headerHeight - footerHeight, 0)

  return {
    dialogHeight,
    dialogWidth,
    bodyMaxHeight,
    styles: StyleSheet.create({
      mask: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      dialog: {
        backgroundColor: '#fff',
        borderRadius: p(16),
        width: dialogWidth,
        maxHeight: dialogHeight,
        flexDirection: 'column',
        overflow: 'hidden',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: p(12),
        paddingRight: p(28),
        paddingBottom: p(12),
        paddingLeft: p(28),
      },
      title: {
        flex: 1,
        fontSize: p(32),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
      },
      close: {
        fontSize: p(40),
        color: '#999',
        paddingLeft: p(16),
      },
      body: {
        flexGrow: 0,
        flexShrink: 1,
        maxHeight: bodyMaxHeight,
      },
      content: {
        padding: p(28),
      },
      footer: {
        flexDirection: 'row',
        gap: p(20),
        paddingTop: p(16),
        paddingRight: p(28),
        paddingBottom: p(28),
        paddingLeft: p(28),
      },
    }),
  }
}

/**
 * RN 端实现：基于 react-native 原生 Modal（动画类型为 fade），
 * 自带平滑的淡入淡出过渡，不受小程序端 CSS transition 限制。
 */
const Modal: React.FC<ModalProps> = ({ visible, title, onClose, children, footer }) => {
  const [win, setWin] = useState(computeStyles)

  useEffect(() => {
    // 窗口尺寸变化（如横竖屏切换）后重新计算弹窗尺寸与样式，避免显示不完整
    const sub = Dimensions.addEventListener('change', () => {
      setWin(computeStyles())
    })
    return () => sub?.remove?.()
  }, [])

  const { styles } = win

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.mask}>
        <View style={styles.dialog}>
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.close} onPress={onClose}>×</Text>
            </View>
          ) : null}

          <ScrollView style={styles.body} nestedScrollEnabled>
            <View style={styles.content}>
              {children}
            </View>
          </ScrollView>

          {footer ? (
            <View style={styles.footer}>
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </RNModal>
  )
}

export default Modal
