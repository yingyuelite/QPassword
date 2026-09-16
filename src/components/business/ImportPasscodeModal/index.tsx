import React from 'react'
import { View } from '@tarojs/components'
import { PasscodeType } from '@/types/passcode'
import { Password } from '@/types/password'
import ImportPasscodeModalInner from './Inner'
import './index.scss'

interface ImportPasscodeModalProps {
  visible: boolean
  /** 导出口令类型：图案 / 文字 */
  passcodeType: PasscodeType
  onClose: () => void
  /** 提交导出口令，返回解析出的密码列表；验证失败返回 null（保持弹窗打开显示错误） */
  onSubmit: (value: string) => Promise<Password[] | null>
}

// 小程序端：全屏遮罩（fixed 铺满、不滚动、无缩放动画）。
// 单独使用一个 Modal 承载口令输入，避免把 PatternLock 塞进有高度限制的
// ImportDialog 中被迫上下滚动 —— 滚动会改变 PatternLock 的 on-screen 位置，
// 使基于 boundingClientRect 一次性测量的偏移失效，导致输入坐标错位。
const ImportPasscodeModal: React.FC<ImportPasscodeModalProps> = ({
  visible,
  passcodeType,
  onClose,
  onSubmit,
}) => {
  if (!visible) return null

  return (
    <View
      className="import-pm-mask"
      // @ts-ignore – catchtouchmove 是小程序原生属性，Taro 类型未覆盖
      catchtouchmove={() => {}}
    >
      <ImportPasscodeModalInner passcodeType={passcodeType} onClose={onClose} onSubmit={onSubmit} />
    </View>
  )
}

export default ImportPasscodeModal
