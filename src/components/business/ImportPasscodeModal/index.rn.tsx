import React from 'react'
import { Modal as RNModal } from 'react-native'
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

// RN 端：使用原生 Modal（fade 过渡），展示在 ImportDialog 的原生 Modal 之上。
// 弹窗内容只有口令输入（不滚动），图案可完整显示。
const ImportPasscodeModal: React.FC<ImportPasscodeModalProps> = ({
  visible,
  passcodeType,
  onClose,
  onSubmit,
}) => {
  if (!visible) return null

  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="import-pm-mask">
        <ImportPasscodeModalInner passcodeType={passcodeType} onClose={onClose} onSubmit={onSubmit} />
      </View>
    </RNModal>
  )
}

export default ImportPasscodeModal
