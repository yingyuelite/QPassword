import React from 'react'
import { View, Text } from '@tarojs/components'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import './index.scss'

interface ConfirmDialogProps {
  visible: boolean
  title?: string
  content?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title = '提示',
  content,
  confirmText = '确定',
  cancelText = '取消',
  confirmColor,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal visible={visible} title={title} onClose={onCancel}>
      <View className="confirm-body">
        {content ? <Text className="confirm-content">{content}</Text> : null}
      </View>
      <View className="confirm-footer">
        <Button type="default" onClick={onCancel}>{cancelText}</Button>
        <Button
          type="primary"
          style={confirmColor ? { backgroundColor: confirmColor } : undefined}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </View>
    </Modal>
  )
}

export default ConfirmDialog
