import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { stopPropagation } from '@/utils/event'
import { getWindowInfo } from '@/utils/system'
import './index.scss'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
}

interface ContextMenuProps {
  visible: boolean
  items: MenuItem[]
  onClose: () => void
}

const isRN = process.env.TARO_ENV === 'rn'

// RN 不支持 box-shadow，需用原生 shadow/elevation 替代（仅 RN 生效，小程序/H5 忽略）
const RN_SHADOW: any = isRN
  ? (require('react-native') as any).Platform.OS === 'android'
    ? { elevation: 4 }
    : {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 7,
        shadowColor: '#000',
      }
  : undefined

// 屏幕宽度大于高度时视为横屏（屏幕高度有限），限制菜单高度使其可滚动；
// 竖屏时屏幕高度足够，不再限制高度，显示全部菜单项
function resolveMenuMaxHeight() {
  let height: number
  let width: number
  if (isRN) {
    // RN 端 getSystemInfoSync 返回的是模块加载时的缓存值，旋转屏幕后不会更新，
    // 因此需要从 react-native 的 Dimensions 实时读取窗口尺寸
    const win = (require('react-native') as any).Dimensions.get('window')
    width = win.width
    height = win.height
  } else {
    const info = getWindowInfo()
    width = info.windowWidth
    height = info.windowHeight
  }
  if (width > height) {
    return Math.round(height * 0.5)
  }
  return undefined
}

const ContextMenu: React.FC<ContextMenuProps> = ({ visible, items, onClose }) => {
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | undefined>(resolveMenuMaxHeight)

  useEffect(() => {
    // 窗口尺寸变化（如横竖屏切换）后重新计算菜单最大高度
    const recompute = () => setMenuMaxHeight(resolveMenuMaxHeight())

    if (isRN) {
      const sub = (require('react-native') as any).Dimensions.addEventListener('change', recompute)
      return () => sub?.remove?.()
    }
    Taro.onWindowResize(recompute)
    return () => {
      Taro.offWindowResize(recompute)
    }
  }, [])

  if (!visible) return null

  return (
    <View className="context-menu-mask" onClick={onClose}>
      <View className="context-menu" style={RN_SHADOW} onClick={(e) => stopPropagation(e)}>
        <ScrollView
          enable-flex="true"
          className="context-menu-scroll"
          scrollY
          // @ts-ignore
          nestedScrollEnabled
          style={{ maxHeight: menuMaxHeight }}
        >
          {items.map((item) => (
            <View
              key={item.key}
              className={`context-menu-item ${item.danger ? 'context-menu-item-danger' : ''}`}
              onClick={() => {
                item.onClick()
                onClose()
              }}
            >
              {item.icon ? <Text className="context-menu-icon">{item.icon}</Text> : null}
              <Text className="context-menu-label">{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

export default ContextMenu
