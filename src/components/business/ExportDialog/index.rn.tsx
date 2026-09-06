import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { showToast } from '@/utils/toast'
import Modal from '@/components/base/Modal'
import Checkbox from '@/components/base/Checkbox'
import Button from '@/components/base/Button'
import { Password } from '@/types/password'
import { prepareExportData } from '@/utils/export'
import { getFileSystem } from '@/utils/rn-expo'
import './index.scss'

interface ExportDialogProps {
  visible: boolean
  passwords: Password[]
  onClose: () => void
}

const ExportDialog: React.FC<ExportDialogProps> = ({ visible, passwords, onClose }) => {
  const [encrypt, setEncrypt] = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return

    if (!passwords || passwords.length === 0) {
      showToast({ title: '密码数量为0，无需导出', icon: 'none' })
      return
    }

    setExporting(true)
    try {
      const FileSystem = getFileSystem()
      if (!FileSystem) return

      const { jsonStr, fileName } = await prepareExportData(passwords, encrypt)

      const SAF = FileSystem.StorageAccessFramework

      // StorageAccessFramework 仅在 Android 端可用（iOS 不支持系统目录选择器）
      if (!SAF || typeof SAF.requestDirectoryPermissionsAsync !== 'function') {
        showToast({ title: '当前系统暂不支持导出，请使用 Android 端', icon: 'none', duration: 3000 })
        return
      }

      // 弹出系统目录选择器，让用户选择目标目录
      const initialUri = 'content://com.android.externalstorage.documents/tree/primary%3ADownload'
      const { granted, directoryUri } = await SAF.requestDirectoryPermissionsAsync(initialUri)
      if (!granted) {
        showToast({ title: '未授权存储权限', icon: 'none' })
        return
      }

      // 在目标目录下创建文件并写入导出内容
      const fileUri = await SAF.createFileAsync(directoryUri, fileName, 'application/json')
      await FileSystem.writeAsStringAsync(fileUri, jsonStr)

      showToast({ title: '导出成功', icon: 'success' })
      onClose()
    } catch (err) {
      console.error('导出操作失败:', err)
      showToast({ title: '导出失败', icon: 'error' })
    } finally {
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
            所有密码将以明文形式存储，存在安全风险。请妥善保管导出的文件，切勿泄露给他人。
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
