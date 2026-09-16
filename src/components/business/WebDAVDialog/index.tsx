import React, { useState, useCallback, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { showToast } from '@/utils/toast'
import Modal from '@/components/base/Modal'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import Button from '@/components/base/Button'
import WebDAVConfigForm from '@/components/business/WebDAVConfigForm'
import ImportDialogContent from '@/components/business/ImportDialogContent'
import ImportPasscodeModal from '@/components/business/ImportPasscodeModal'
import { useWebDAVConfig } from '@/hooks/useWebDAVConfig'
import { stopPropagation } from '@/utils/event'
import { Password } from '@/types/password'
import { PasscodeType } from '@/types/passcode'
import { BackupMeta } from '@/types/backup'
import { WebDAVConfig } from '@/types/webdav'
import { backupToWebDAV, readBackupMeta, downloadBackupContent } from '@/utils/webdav'
import { formatTime } from '@/utils/time'
import './index.scss'

interface WebDAVDialogProps {
  visible: boolean
  passwords: Password[]
  onImport: (passwords: Password[]) => Promise<{ added: number; updated: number }>
  onClose: () => void
}

type ViewMode = 'list' | 'add' | 'edit' | 'restore'

/** 页面级口令弹窗状态：由 ImportDialogContent 通知打开 */
interface PasscodeModalState {
  type: PasscodeType
  submit: (value: string) => Promise<Password[] | null>
}

const WebDAVDialog: React.FC<WebDAVDialogProps> = ({ visible, passwords, onImport, onClose }) => {
  const { configs, add, update, remove } = useWebDAVConfig(visible)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingConfig, setEditingConfig] = useState<WebDAVConfig | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<WebDAVConfig | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [backupMetaMap, setBackupMetaMap] = useState<Record<string, BackupMeta | null>>({})
  const [restoreContent, setRestoreContent] = useState<string | null>(null)
  const [showReminder, setShowReminder] = useState(false)
  const [passcodeModal, setPasscodeModal] = useState<PasscodeModalState | null>(null)
  // 打开弹窗时重置为列表模式
  useEffect(() => {
    if (visible) {
      setViewMode('list')
      setEditingConfig(undefined)
      setRestoreContent(null)
      setShowReminder(false)
      setPasscodeModal(null)
    }
  }, [visible])

  // 加载各服务器的元数据并测试连接
  useEffect(() => {
    if (!visible) return
    console.log('[WebDAVDialog] configs changed, count:', configs.length)
    if (configs.length === 0) return
    configs.forEach(async (config) => {
      console.log('[WebDAVDialog] testing config:', config.name, config.url)
      const meta = await readBackupMeta(config)
      setBackupMetaMap((prev) => ({ ...prev, [config.id]: meta }))
    })
  }, [visible, configs])

  const selectedConfig = configs.find((c) => c.id === selectedId)

  const handleAdd = useCallback(() => {
    setEditingConfig(undefined)
    setViewMode('add')
  }, [])

  const handleEdit = useCallback((config: WebDAVConfig) => {
    setEditingConfig(config)
    setViewMode('edit')
  }, [])

  const handleSave = useCallback(async (data: Omit<WebDAVConfig, 'id'> & { id?: string }) => {
    if (data.id) {
      await update(data as WebDAVConfig)
    } else {
      const newConfig: WebDAVConfig = {
        ...data,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      }
      await add(newConfig)
    }
    setViewMode('list')
    setEditingConfig(undefined)
  }, [add, update])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    if (selectedId === deleteTarget.id) setSelectedId(null)
    remove(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, remove, selectedId])

  const handleBack = useCallback(() => {
    setViewMode('list')
    setEditingConfig(undefined)
    setRestoreContent(null)
    setPasscodeModal(null)
  }, [])

  // 稳定回调引用：避免每次渲染生成新的行内函数，防止 ImportDialogContent effect 反复触发
  const handlePasscodeOpen = useCallback((type: PasscodeType, submit: (value: string) => Promise<Password[] | null>) => {
    setPasscodeModal({ type, submit })
  }, [])

  const handlePasscodeClose = useCallback(() => {
    setPasscodeModal(null)
  }, [])

  const handleBackup = useCallback(async () => {
    if (!selectedConfig || loading) return
    if (!passwords || passwords.length === 0) {
      showToast({ title: '当前密码数量为0，无需备份', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const meta = await backupToWebDAV(passwords, selectedConfig)
      setBackupMetaMap((prev) => ({ ...prev, [selectedConfig.id]: meta }))
      setShowReminder(true)
      showToast({ title: '备份成功', icon: 'success' })
    } catch (err) {
      console.error('备份失败:', err)
      showToast({ title: '备份失败：' + (err as Error).message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [selectedConfig, passwords, loading])

  const handleRestore = useCallback(async () => {
    if (!selectedConfig || loading) return
    setLoading(true)
    try {
      const content = await downloadBackupContent(selectedConfig)
      // console.log('[WebDAVDialog] download backup content:', content)
      setRestoreContent(content)
      setViewMode('restore')
    } catch (err) {
      console.error('下载备份失败:', err)
      showToast({ title: '下载失败：' + (err as Error).message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [selectedConfig, loading])

  const handleRestoreDone = useCallback(() => {
    setPasscodeModal(null)
    setRestoreContent(null)
    setViewMode('list')
    onClose()
  }, [onClose])

  const renderList = () => (
    <View className="webdav-list">
      {configs.length === 0 ? (
        <View className="webdav-empty">
          <Text className="webdav-empty-text">暂无配置的服务器</Text>
          <Text className="webdav-empty-hint">点击下方按钮添加 WebDAV 服务器</Text>
        </View>
      ) : (
        configs.map((config) => {
          const meta = backupMetaMap[config.id]
          const isSelected = selectedId === config.id
          return (
            <View
              key={config.id}
              className={`webdav-server-item ${isSelected ? 'webdav-server-item-selected' : ''}`}
              onClick={() => setSelectedId(config.id)}
            >
              <View className="webdav-server-info">
                <Text className="webdav-server-name">{config.name}</Text>
                <View>
                    {meta
                      ? <Text className="webdav-server-meta">{`上次备份：${formatTime(meta.time)} 共 ${meta.count} 条`}</Text>
                      : <Text className="webdav-server-meta-fail">无备份记录或服务器连接失败</Text>}
                  </View>
              </View>
              <View className="webdav-server-actions">
                <View className="webdav-server-action" onClick={(e) => { stopPropagation(e); handleEdit(config) }}>
                  <Text className="webdav-server-action-text">✏️</Text>
                </View>
                <View className="webdav-server-action webdav-server-action-danger" onClick={(e) => { stopPropagation(e); setDeleteTarget(config) }}>
                  <Text className="webdav-server-action-text">🗑️</Text>
                </View>
              </View>
            </View>
          )
        })
      )}

      <Button type="dashed" style={{ marginTop: 16 }} onClick={handleAdd}>+ 添加服务器</Button>

      {configs.length > 0 && (
        <>
          {showReminder && (
            <View className="webdav-reminder">
              <Text className="webdav-reminder-text">
                温馨提醒：请务必牢记当前的口令，因为后续恢复数据时，可能需要提供正确的口令。
              </Text>
            </View>
          )}
          <View className="webdav-action-bar">
          <Button
            type="primary"
            block
            icon="📤"
            disabled={!selectedId || loading}
            onClick={handleBackup}
          >
            备份
          </Button>
          <Button
            type="primary"
            block
            icon="📥"
            disabled={!selectedId || loading}
            onClick={handleRestore}
          >
            恢复
          </Button>
        </View>
        </>
      )}
    </View>
  )

  const renderForm = () => (
    <WebDAVConfigForm
      config={editingConfig}
      onSave={handleSave}
      onCancel={handleBack}
    />
  )

  const renderRestore = () => (
    <View>
      <View className="webdav-restore-header">
        <Text className="webdav-restore-hint">
          从「{selectedConfig?.name}」恢复密码
        </Text>
      </View>
      <ImportDialogContent
        content={restoreContent!}
        onImport={onImport}
        onDone={handleRestoreDone}
        onPasscodeOpen={handlePasscodeOpen}
        onPasscodeClose={handlePasscodeClose}
      />
    </View>
  )

  const title = viewMode === 'list'
    ? '备份与恢复'
    : viewMode === 'add'
      ? '添加服务器'
      : viewMode === 'edit'
        ? '编辑服务器'
        : '恢复密码'

  return (
    <>
      <Modal visible={visible} title={title} onClose={onClose}>
        {viewMode === 'list' && renderList()}
        {viewMode === 'add' && renderForm()}
        {viewMode === 'edit' && renderForm()}
        {viewMode === 'restore' && renderRestore()}
      </Modal>
      <ConfirmDialog
        visible={deleteTarget !== null}
        title="删除服务器"
        content={deleteTarget ? `确定删除「${deleteTarget.name}」吗？` : ''}
        confirmText="删除"
        confirmColor="#e64340"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
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

export default WebDAVDialog
