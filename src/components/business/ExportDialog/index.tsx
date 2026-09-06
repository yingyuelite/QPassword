import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { showToast } from '@/utils/toast'
import Modal from '@/components/base/Modal'
import Checkbox from '@/components/base/Checkbox'
import Button from '@/components/base/Button'
import { Password } from '@/types/password'
import { prepareExportData, ExportData } from '@/utils/export'
import './index.scss'

interface ExportDialogProps {
  visible: boolean
  passwords: Password[]
  onClose: () => void
}

const ExportDialog: React.FC<ExportDialogProps> = ({ visible, passwords, onClose }) => {
  const [encrypt, setEncrypt] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportData, setExportData] = useState<ExportData | null>(null)
  // encrypt 或 passwords 变化时预先准备导出数据
  useEffect(() => {
    if (!visible || passwords.length === 0) {
      setExportData(null)
      return
    }
    prepareExportData(passwords, encrypt).then(setExportData)
  }, [visible, passwords, encrypt])

  const handleExport = () => {
    if (exporting) return

    if (!exportData) {
      showToast({ title: '密码数量为0，无需导出', icon: 'none' })
      return
    }

    setExporting(true)
    try {
      // writeFileSync 是同步的，shareFileMessage 紧跟其后，保持在同一手势调用栈中
      const fs = Taro.getFileSystemManager()
      const tempFilePath = `${Taro.env.USER_DATA_PATH}/${exportData.fileName}`
      fs.writeFileSync(tempFilePath, exportData.jsonStr, 'utf-8')

      Taro.shareFileMessage({
        filePath: tempFilePath,
        fileName: exportData.fileName,
      }).then((res) => {
        console.log('分享结果:', res)
        // 单从 res 无法判断是否终止了分享操作，因为 res 结果总是 {errMsg: "shareFileMessage:ok"}
        // if (res.errMsg?.includes('cancel')) {
        //   return
        // }
        showToast({ title: '导出成功', icon: 'success' })
        onClose()
      }).catch(() => {
        showToast({ title: '导出失败', icon: 'error' })
      }).finally(() => {
        setExporting(false)
      })
    } catch (err) {
      console.error('导出操作失败:', err)
      showToast({ title: '导出失败', icon: 'error' })
      setExporting(false)
    }
  }

  return (
    <Modal visible={visible} title="导出密码" onClose={onClose}>
      <View className="export-content">
        <View className="export-option">
          <Checkbox
            checked={encrypt}
            onChange={setEncrypt}
            label="密文导出"
            color="#237166"
          />
          <Text className="export-option-desc">
            所有密码将被加密存储，仅在提供正确口令时才能解密。请妥善保管导出的文件，避免泄露给他人。
          </Text>
          {encrypt && (
            <View className="export-option-reminder">
              <Text className="export-option-reminder-text">
                温馨提醒：请务必牢记当前的口令，因为之后执行导入时，需要提供正确的口令才能导入。
              </Text>
            </View>
          )}
        </View>

        <View className="export-option">
          <Checkbox
            checked={!encrypt}
            onChange={(checked) => setEncrypt(!checked)}
            label="明文导出（不推荐）"
            color="#e64340"
          />
          <Text className="export-option-desc export-option-warning">
            所有密码将以明文形式存储，存在安全风险，请妥善保管导出的文件，切勿泄露给他人。
          </Text>
        </View>

        <View className="export-info">
          <Text className="export-info-text">
            导出数量：{passwords.length} 条密码
          </Text>
        </View>

        <View className="export-footer">
          <Button type="default" onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleExport}>
            {exporting ? '导出中...' : '导出'}
          </Button>
        </View>
      </View>
    </Modal>
  )
}

export default ExportDialog
