import React, { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import ImportDialogContent from '@/components/business/ImportDialogContent'
import ImportV1DialogContent from '@/components/business/ImportV1DialogContent'
import ImportPasscodeModal from '@/components/business/ImportPasscodeModal'
import { Password } from '@/types/password'
import { PasscodeType } from '@/types/passcode'
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
  const [passcodeModal, setPasscodeModal] = useState<PasscodeModalState | null>(null)

  const resetState = useCallback(() => {
    setFileName('')
    setFileContent('')
    setError('')
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

  const handleChooseFile = useCallback(() => {
    // v2 导出为 .qp2，v1 导出为 .qpwd
    const extension = mode === 'v1' ? ['qpwd'] : ['qp2']
    Taro.chooseMessageFile({
      type: 'file',
      count: 1,
      extension, // 需要特别注意的是：iOS端的微信小程序不支持双扩展名，如 qp2.json
      success: (res) => {
        const file = res.tempFiles[0]
        setFileName(file.name)
        setError('')
        setFileContent('')

        const fs = Taro.getFileSystemManager()
        fs.readFile({
          filePath: file.path,
          encoding: 'utf-8',
          success: (readRes) => {
            setFileContent(readRes.data as string)
          },
          fail: () => {
            setError('文件读取失败')
          },
        })
      },
    })
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

          {/* 文件选择 */}
          <View className="import-file-section">
            <Button type="default" textColor="#237166" onClick={handleChooseFile}>
              {fileName ? '重新选择文件' : (isV1 ? '选择文件 (.qpwd)' : '选择文件 (.qp2)')}
            </Button>
            {fileName && (
              <Text className="import-file-name">已选择：{fileName}</Text>
            )}
          </View>

          {/* 错误提示 */}
          {error && (
            <View className="import-info import-info-error">
              <Text className="import-info-text import-info-text-error">
                {error}
              </Text>
            </View>
          )}

          {/* 导入内容：解析 + 预览 + 导入 */}
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

      {/* 页面级全屏口令弹窗：置于 base Modal 之外，避免被 .modal 的 transform 缩放裁剪 */}
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
