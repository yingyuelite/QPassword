import React, { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import { showToast } from '@/utils/toast'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import ImportDialogContent from '@/components/business/ImportDialogContent'
import ImportV1DialogContent from '@/components/business/ImportV1DialogContent'
import ImportPasscodeModal from '@/components/business/ImportPasscodeModal'
import { Password } from '@/types/password'
import { PasscodeType } from '@/types/passcode'
import { getDocumentPicker, getFileSystem } from '@/utils/rn-expo'
import './index.scss'

interface ImportDialogProps {
  visible: boolean
  onImport: (passwords: Password[]) => Promise<{ added: number; updated: number }>
  onClose: () => void
}

/** v2：常规导入（.qp2）；v1：从旧版本导入明文备份（.qpwd） */
type ImportMode = 'v2' | 'v1'

/** 页面级口令弹窗状态：由 ImportDialogContent 通知打开 */
interface PasscodeModalState {
  type: PasscodeType
  submit: (value: string) => Promise<Password[] | null>
}

const ImportDialog: React.FC<ImportDialogProps> = ({ visible, onImport, onClose }) => {
  const [mode, setMode] = useState<ImportMode>('v2')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [passcodeModal, setPasscodeModal] = useState<PasscodeModalState | null>(null)

  const resetState = useCallback(() => {
    setFileName('')
    setFileContent('')
    setError('')
    setReading(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    setMode('v2')
    setPasscodeModal(null)
    onClose()
  }, [resetState, onClose])

  // 切换 v2/v1 导入模式：清空已选文件与口令弹窗，避免沿用另一种格式的状态
  const handleSwitchMode = useCallback((next: ImportMode) => {
    resetState()
    setPasscodeModal(null)
    setMode(next)
  }, [resetState])

  // 稳定回调引用：避免每次渲染生成新的行内函数，防止 ImportDialogContent effect 反复触发
  const handlePasscodeOpen = useCallback((type: PasscodeType, submit: (value: string) => Promise<Password[] | null>) => {
    setPasscodeModal({ type, submit })
  }, [])

  const handlePasscodeClose = useCallback(() => {
    setPasscodeModal(null)
  }, [])

  const handleChooseFile = useCallback(async () => {
    try {
      const DocumentPicker = getDocumentPicker()
      if (!DocumentPicker) return
      const FileSystem = getFileSystem()
      if (!FileSystem) return

      const isV1File = mode === 'v1'
      const result = await DocumentPicker.getDocumentAsync({
        // v1 的 .qpwd 可能是未知 MIME，放宽类型以免选不到；v2 的 .qp2 为 JSON
        type: isV1File ? '*/*' : 'application/json',
        multiple: false,
        copyToCacheDirectory: true, // 复制到应用缓存目录，保证返回可读的 file:// URI
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }

      const file = result.assets[0]
      const name = file.name || (isV1File ? 'unknown.qpwd' : 'unknown.qp2')

      setReading(true)
      setFileName(name)
      setError('')
      setFileContent('')

      try {
        const content = await FileSystem.readAsStringAsync(file.uri)
        setFileContent(content)
      } catch (readErr) {
        console.error('读取文件失败:', readErr)
        setError('文件读取失败，请重试')
      } finally {
        setReading(false)
      }
    } catch (err) {
      console.error('选择文件失败:', err)
      showToast({ title: '文件选择失败', icon: 'error' })
    }
  }, [mode])

  const isV1 = mode === 'v1'

  return (
    <>
      <Modal visible={visible} title={isV1 ? '导入 v1 版本密码' : '导入密码'} onClose={handleClose}>
        <View className="import-content">
          {/* v1 导入：仅明文支持提示 */}
          {isV1 && (
            <View className="import-info">
              <Text className="import-info-text">
                仅支持导入 v1 版本导出的明文密码文件（.qpwd），加密文件无法导入
              </Text>
            </View>
          )}

          <View className="import-file-section">
            <Button type="default" textColor="#237166" onClick={handleChooseFile} disabled={reading}>
              {reading ? '读取中...' : (fileName ? '重新选择文件' : (isV1 ? '选择文件 (.qpwd)' : '选择文件 (.qp2)'))}
            </Button>
            {fileName && (
              <Text className="import-file-name">已选择：{fileName}</Text>
            )}
          </View>

          {error && (
            <View className="import-info import-info-error">
              <Text className="import-info-text import-info-text-error">
                {error}
              </Text>
            </View>
          )}

          {fileContent && !isV1 && (
            <ImportDialogContent
              content={fileContent}
              onImport={onImport}
              onDone={handleClose}
              onPasscodeOpen={handlePasscodeOpen}
              onPasscodeClose={handlePasscodeClose}
            />
          )}
          {fileContent && isV1 && (
            <ImportV1DialogContent
              content={fileContent}
              onImport={onImport}
              onDone={handleClose}
            />
          )}

          {/* 底部次级入口：v2 模式进入 v1 导入，v1 模式返回 */}
          <View className="import-v1-entry">
            <Text
              className="import-v1-link"
              onClick={() => handleSwitchMode(isV1 ? 'v2' : 'v1')}
            >
              {isV1 ? '返回' : '从 v1 版本导入密码'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* 页面级全屏口令弹窗：置于 base Modal 之外，RN 端使用原生 Modal 全屏展示 */}
      <ImportPasscodeModal
        visible={passcodeModal !== null}
        passcodeType={passcodeModal?.type ?? 'pattern'}
        onClose={() => setPasscodeModal(null)}
        onSubmit={async (value) => {
          if (!passcodeModal) return null
          const result = await passcodeModal.submit(value)
          if (result) setPasscodeModal(null)
          return result
        }}
      />
    </>
  )
}

export default ImportDialog
