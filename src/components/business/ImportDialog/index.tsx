import React, { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import ImportDialogContent from '@/components/business/ImportDialogContent'
import { Password } from '@/types/password'
import './index.scss'

interface ImportDialogProps {
  visible: boolean
  onImport: (passwords: Password[]) => Promise<{ added: number; updated: number }>
  onClose: () => void
}

const ImportDialog: React.FC<ImportDialogProps> = ({ visible, onImport, onClose }) => {
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [error, setError] = useState('')

  const resetState = useCallback(() => {
    setFileName('')
    setFileContent('')
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const handleChooseFile = useCallback(() => {
    Taro.chooseMessageFile({
      type: 'file',
      count: 1,
      extension: ['qp2.json'],
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
  }, [])

  return (
    <Modal visible={visible} title="导入密码" onClose={handleClose}>
      <View className="import-content">
        {/* 文件选择 */}
        <View className="import-file-section">
          <Button type="default" textColor="#237166" onClick={handleChooseFile}>
            {fileName ? '重新选择文件' : '选择文件 (.qp2.json)'}
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

        {/* 导入内容：密码验证 + 解析 + 预览 + 导入 */}
        {fileContent && (
          <ImportDialogContent
            content={fileContent}
            onImport={onImport}
            onDone={handleClose}
          />
        )}
      </View>
    </Modal>
  )
}

export default ImportDialog
