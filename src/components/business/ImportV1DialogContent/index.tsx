import React, { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import { showToast } from '@/utils/toast'
import Button from '@/components/base/Button'
import { Password } from '@/types/password'
import { parseV1ImportFile } from '@/utils/importV1'
import './index.scss'

interface ImportV1DialogContentProps {
  /** v1 备份文件内容（JSON 字符串） */
  content: string
  /** 导入回调 */
  onImport: (passwords: Password[]) => Promise<{ added: number; updated: number }>
  /** 完成回调（导入成功后） */
  onDone: () => void
}

// v1 导入：仅支持明文，解析很快，文件变更后自动解析并展示预览。
const ImportV1DialogContent: React.FC<ImportV1DialogContentProps> = ({ content, onImport, onDone }) => {
  const [preview, setPreview] = useState<Password[] | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setPreview(null)
    setError('')
    if (!content) return
    try {
      setPreview(parseV1ImportFile(content))
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    }
  }, [content])

  const handleImport = useCallback(async () => {
    if (!preview || importing) return
    setImporting(true)
    try {
      const result = await onImport(preview)
      onDone()
      showToast({
        title: `导入完成：新增 ${result.added} 条，更新 ${result.updated} 条`,
        icon: 'none',
        duration: 2000,
      })
    } catch {
      showToast({ title: '导入失败', icon: 'error' })
    } finally {
      setImporting(false)
    }
  }, [preview, importing, onImport, onDone])

  return (
    <View className="import-v1-content">
      {error ? (
        <View className="import-v1-info import-v1-info-error">
          <Text className="import-v1-text import-v1-text-error">{error}</Text>
        </View>
      ) : null}

      {!error && preview ? (
        <View className="import-v1-info">
          <Text className="import-v1-text">共解析到 {preview.length} 条密码</Text>
          <Text className="import-v1-text">点击「导入」将保存到应用中</Text>
        </View>
      ) : null}

      <View className="import-v1-footer">
        <Button type="primary" disabled={!preview || importing} onClick={handleImport}>
          {importing ? '导入中...' : '导入'}
        </Button>
      </View>
    </View>
  )
}

export default ImportV1DialogContent
