import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import { showLoading, hideLoading } from '@/utils/loading'
import { showToast } from '@/utils/toast'
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
  /** 需要输入导出口令时，通知页面级组件打开独立的全屏口令弹窗 */
  onPasscodeOpen?: (type: PasscodeType, submit: (value: string) => Promise<Password[] | null>) => void
  /** 口令弹窗关闭 / 内容复位 */
  onPasscodeClose?: () => void
}

/** 口令验证状态 */
type PasscodeStep =
  | { status: 'idle' }
  | { status: 'none' }
  | { status: 'key_match'; type: PasscodeType; backupPasscode: Passcode }
  | { status: 'need_input'; type: PasscodeType; backupPasscode: Passcode }

const ImportDialogContent: React.FC<ImportDialogContentProps> = ({ content, onImport, onDone, onPasscodeOpen, onPasscodeClose }) => {
  const [passcodeStep, setPasscodeStep] = useState<PasscodeStep>({ status: 'idle' })
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<Password[] | null>(null)
  const [error, setError] = useState('')
  // 口令校验步骤的最新值：页面级口令弹窗的 submit 闭包在调用时读取它，避免拿到旧状态（如 status 还是 idle）
  const passcodeStepRef = useRef<PasscodeStep>(passcodeStep)
  passcodeStepRef.current = passcodeStep
  // 口令提交函数的最新引用；声明在最前，供下方 effect 内的 onPasscodeOpen 使用
  const submitRef = useRef<(value: string) => Promise<Password[] | null>>(async () => null)
  // 回调走 ref：父级若以行内函数传入，每次渲染都是新引用，若放进 effect deps 会导致
  // effect 反复执行 → 先 onPasscodeClose 又 onPasscodeOpen，口令弹窗闪烁不停。
  const onPasscodeOpenRef = useRef(onPasscodeOpen)
  onPasscodeOpenRef.current = onPasscodeOpen
  const onPasscodeCloseRef = useRef(onPasscodeClose)
  onPasscodeCloseRef.current = onPasscodeClose

  // 初始化 / 文件变更：先复位上一份文件的状态，再分析新文件是否需要口令
  // 注意：effect 仅依赖 content，避免父级回调引用变化引发的反复开合。
  useEffect(() => {
    setPreview(null)
    setError('')
    onPasscodeCloseRef.current?.()
    if (!content) {
      setPasscodeStep({ status: 'idle' })
      return
    }
    setPasscodeStep({ status: 'idle' })
    try {
      const header = readImportFile(content)
      checkImportNeedPasscode(header.passcode).then((result) => {
        const next = result ?? { status: 'none' }
        setPasscodeStep(next)
        // 需要口令时，通知页面级组件打开独立的全屏口令弹窗（不缩放、不滚动，保证图案完整显示）
        if (next.status === 'need_input') {
          onPasscodeOpenRef.current?.(next.type, submitRef.current)
        }
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
      }
      // need_input 场景由口令弹窗（handlePasscodeSubmit）处理
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
    }
  }, [content, passcodeStep, withLoading])

  /** 口令弹窗提交：验证导出口令并解析；成功返回密码列表（弹窗由页面级组件关闭），失败返回 null（弹窗显示错误） */
  const handlePasscodeSubmit = useCallback(async (value: string): Promise<Password[] | null> => {
    const step = passcodeStepRef.current
    if (step.status !== 'need_input' || !content) return null
    setError('')
    try {
      const result = await withLoading(async () => {
        if (!verifyImportPasscode(value, step.backupPasscode)) {
          return null
        }
        return parseImportFile(content, { useInputKey: value })
      }, '校验中')
      if (result) {
        setPreview(result)
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败')
      return null
    }
  }, [content, withLoading])

  // 始终让页面级弹窗的 submit 指向最新的处理函数
  submitRef.current = handlePasscodeSubmit

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

      {/* 需要口令提示 */}
      {passcodeStep.status === 'need_input' && content && !preview && (
        <View className="import-info">
          <Text className="import-info-text">该文件已加密，需输入导出时的口令才能解析</Text>
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
        {passcodeStep.status === 'need_input' && !preview ? (
          <Button type="primary" onClick={() => onPasscodeOpenRef.current?.(passcodeStep.type, submitRef.current)}>输入口令</Button>
        ) : !preview ? (
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