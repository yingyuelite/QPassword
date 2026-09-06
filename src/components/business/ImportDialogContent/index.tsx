import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { showLoading, hideLoading } from '@/utils/loading'
import { showToast } from '@/utils/toast'
import PatternLock from '@/components/business/PatternLock'
import PasswordInput from '@/components/base/PasswordInput'
import Button from '@/components/base/Button'
import { Password } from '@/types/password'
import { Passcode, PasscodeType } from '@/types/passcode'
import {
  checkImportNeedPasscode,
  verifyImportPasscode,
  parseImportFile,
  readImportFile,
} from '@/utils/import'
import './index.scss'

interface ImportDialogContentProps {
  /** 备份文件内容（JSON 字符串） */
  content: string
  /** 导入回调 */
  onImport: (passwords: Password[]) => Promise<{ added: number; updated: number }>
  /** 完成回调（导入成功后） */
  onDone: () => void
}

/** 口令验证状态 */
type PasscodeStep =
  | { status: 'idle' }
  | { status: 'none' }
  | { status: 'key_match'; type: PasscodeType; backupPasscode: Passcode }
  | { status: 'need_input'; type: PasscodeType; backupPasscode: Passcode }

const ImportDialogContent: React.FC<ImportDialogContentProps> = ({ content, onImport, onDone }) => {
  const [passcodeStep, setPasscodeStep] = useState<PasscodeStep>({ status: 'idle' })
  // 导出时的口令输入框最新值（非受控，逐键写入 ref，解析时读取）
  const exportPasscodeRef = useRef('')
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<Password[] | null>(null)
  const [error, setError] = useState('')

  // 初始化：分析文件是否需要口令
  useEffect(() => {
    if (!content) return
    try {
      const header = readImportFile(content)
      checkImportNeedPasscode(header.passcode).then((result) => {
        setPasscodeStep(result ?? { status: 'none' })
      })
    } catch {
      setError('文件格式不正确')
    }
  }, [content])

  /** 让出主线程，给原生层机会先把 loading 绘制出来（RN 桥接需要，小程序端无害） */
  const yieldToRender = () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50))

  /** 封装耗时操作（verifyImportPasscode / parseImportFile），执行前显示原生 Loading */
  const withLoading = useCallback(async <T,>(task: () => Promise<T>, title: string): Promise<T> => {
    await showLoading({ title, mask: true })
    await yieldToRender()
    try {
      return await task()
    } finally {
      await hideLoading()
    }
  }, [])

  const handlePreview = useCallback(async () => {
    if (!content) {
      setError('无文件内容')
      return
    }
    setError('')

    try {
      if (passcodeStep.status === 'none') {
        const result = await withLoading(() => parseImportFile(content), '解析中')
        setPreview(result)
      } else if (passcodeStep.status === 'key_match') {
        const result = await withLoading(() => parseImportFile(content, { useCurrentKey: true }), '解析中')
        setPreview(result)
      } else if (passcodeStep.status === 'need_input') {
        if (!exportPasscodeRef.current) {
          setError('请输入导出时的口令')
          return
        }
        const result = await withLoading(() => parseImportFile(content, { useInputKey: exportPasscodeRef.current }), '解析中')
        setPreview(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    }
  }, [content, passcodeStep, withLoading])

  const handlePatternComplete = useCallback(async (pattern: number[]) => {
    if (passcodeStep.status !== 'need_input') return

    const patternStr = pattern.join(',')
    let pass = false
    let result: Password[] | null = null
    try {
      await withLoading(async () => {
        pass = verifyImportPasscode(patternStr, passcodeStep.backupPasscode)
        if (pass) {
          result = await parseImportFile(content, { useInputKey: patternStr })
        }
      }, '校验中')
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
      return
    }
    if (!pass) {
      setError('图案错误，请重试')
      return
    }

    setError('')
    setPreview(result)
  }, [content, passcodeStep, withLoading])

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

  const canParse = content && !preview && passcodeStep.status !== 'idle'
  const canImport = preview && !importing

  return (
    <View className="import-content-main">
      {/* 密码输入：图案口令 */}
      {passcodeStep.status === 'need_input' && passcodeStep.type === 'pattern' && !preview && (
        <View className="import-password-section">
          <Text className="import-password-label">请绘制导出时的图案口令</Text>
          <PatternLock onChange={handlePatternComplete} />
        </View>
      )}

      {/* 密码输入：文字口令 */}
      {passcodeStep.status === 'need_input' && passcodeStep.type === 'text' && !preview && (
        <View className="import-password-section">
          <Text className="import-password-label">请输入导出时的口令</Text>
          <PasswordInput
            placeholder="请输入口令"
            defaultValue=""
            onInput={(v) => { exportPasscodeRef.current = v }}
            onConfirm={handlePreview}
          />
        </View>
      )}

      {/* 明文导入提示 */}
      {passcodeStep.status === 'none' && content && !preview && (
        <View className="import-info">
          <Text className="import-info-text">导入的数据未加密，无需解密</Text>
        </View>
      )}

      {/* 密钥匹配提示 */}
      {passcodeStep.status === 'key_match' && content && !preview && (
        <View className="import-info">
          <Text className="import-info-text">导入的数据支持使用当前的密钥解密，无需提供口令</Text>
        </View>
      )}

      {/* 错误提示 */}
      {error && (
        <View className="import-info import-info-error">
          <Text className="import-info-text import-info-text-error">
            {error}
          </Text>
        </View>
      )}

      {/* 预览信息 */}
      {preview && (
        <View className="import-info">
          <Text className="import-info-text">
            共解析到 {preview.length} 条密码
          </Text>
          <Text className="import-info-text">
            点击「导入」将自动去重并保存
          </Text>
        </View>
      )}

      {/* 底部按钮 */}
      <View className="import-footer">
        {!preview ? (
          <Button type="primary" disabled={!canParse} onClick={handlePreview}>解析</Button>
        ) : (
          <Button type="primary" disabled={!canImport} onClick={handleImport}>
            {importing ? '导入中...' : '导入'}
          </Button>
        )}
      </View>
    </View>
  )
}

export default ImportDialogContent
