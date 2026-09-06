import React from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

export type ButtonType = 'primary' | 'default' | 'danger' | 'dashed' | 'text'
export type ButtonSize = 'custom' | 'small' | 'middle' | 'large'

export interface ButtonProps {
  /** 按钮类型，决定底色与文字颜色 */
  type?: ButtonType
  /** 按钮尺寸 */
  size?: ButtonSize
  /** 是否占满剩余宽度（flex: 1） */
  block?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义文字颜色 */
  textColor?: string
  /** 图标（展示在文字左侧） */
  icon?: React.ReactNode
  onClick?: () => void
  onLongPress?: () => void
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({
  type = 'default',
  size = 'middle',
  block = false,
  disabled = false,
  textColor,
  icon,
  onClick,
  onLongPress,
  className,
  style,
  children,
}) => {
  const textStyle = textColor ? { color: textColor } : undefined
  const classNames = [
    'btn',
    `btn-bg-${type}`,
    `btn-size-${size}`,
    block ? 'btn-block' : '',
    disabled ? 'btn-disabled' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <View
      className={classNames}
      style={style}
      hoverClass={disabled ? undefined : 'hover-style'}
      hoverStyle={disabled ? undefined : { opacity: 0.8 }}
      onClick={disabled ? undefined : onClick}
      onLongPress={disabled ? undefined : onLongPress}
    >
      {icon ? (
        <Text className={`btn-icon btn-icon-${type} btn-icon-${size}`} style={{ ...textStyle, color: '#000000' }}>
          {icon}
        </Text>
      ) : null}
      <Text className={`btn-text btn-text-${type} btn-text-${size}`} style={textStyle}>
        {children}
      </Text>
    </View>
  )
}

export default Button
