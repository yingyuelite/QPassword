import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, Block } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { showToast } from '@/utils/toast'
import { Password } from '@/types/password'
import { usePasswords, EVENT_PASSWORDS_CHANGED } from '@/hooks/usePasswords'
import PasswordList from '@/components/business/PasswordList'
import SearchDialog from '@/components/business/SearchDialog'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import ExportDialog from '@/components/business/ExportDialog'
import ImportDialog from '@/components/business/ImportDialog'
import WebDAVDialog from '@/components/business/WebDAVDialog'
import FirstUseNotice from '@/components/business/FirstUseNotice'
import PasscodeGuard, { usePasscodeContext } from '@/components/business/Passcode/Guard'
import ChangePasscode from '@/components/business/Passcode/Change'
import FAB from '@/components/base/FAB'
import Loading from '@/components/base/Loading'
import Icon from '@/components/base/Icon'
import ThemeRoot from '@/components/base/ThemeRoot'
import Button from '@/components/base/Button'
import ContextMenu, { MenuItem } from '@/components/base/ContextMenu'
import { exitApp } from '@/utils/exit'
import { saveSearchState } from '@/utils/storage'
import { useNavigationBarTheme } from '@/utils/navigationBar'
import './index.scss'

/** 关键词 / 标签组合过滤密码列表（纯函数，供搜索异步计算时复用） */
function filterPasswords(list: Password[], keyword: string, tags: string[]): Password[] {
  let result = list
  if (keyword) {
    const kw = keyword.toLowerCase()
    result = result.filter((p) =>
      p.title.toLowerCase().includes(kw) ||
      p.username.toLowerCase().includes(kw) ||
      p.loginMethod.toLowerCase().includes(kw) ||
      p.website.toLowerCase().includes(kw) ||
      p.email.toLowerCase().includes(kw) ||
      p.phone.toLowerCase().includes(kw) ||
      p.weixin.toLowerCase().includes(kw) ||
      p.note.toLowerCase().includes(kw) ||
      p.tags.some((t) => t.toLowerCase().includes(kw))
    )
  }
  if (tags.length > 0) {
    result = result.filter((p) => tags.some((t) => p.tags.includes(t)))
  }
  return result
}

const IndexContent = () => {
  const { unlocked, change, lock } = usePasscodeContext()
  const { passwords, loading, remove, importMany, reload } = usePasswords(unlocked)
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchTags, setSearchTags] = useState<string[]>([])
  // 搜索中标记：设置后先渲染 Loading，再让出主线程异步计算过滤结果，避免大数据量搜索卡死界面
  const [searchInProgress, setSearchInProgress] = useState(false)
  // 搜索完成结果：null 表示非搜索态（展示全部密码）；搜索态时保存过滤后的列表
  const [searchResult, setSearchResult] = useState<Password[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Password | null>(null)
  const [exportVisible, setExportVisible] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [changePasscodeVisible, setChangePasscodeVisible] = useState(false)
  const [webdavVisible, setWebdavVisible] = useState(false)
  // 监听其他页面（如关于页清空密码）对密码数据的变更，刷新列表
  useEffect(() => {
    const handler = () => reload()
    Taro.eventCenter.on(EVENT_PASSWORDS_CHANGED, handler)
    return () => {
      Taro.eventCenter.off(EVENT_PASSWORDS_CHANGED, handler)
    }
  }, [reload])

  // 每次进入（解锁后挂载）时重置搜索状态，默认展示全部密码，
  // 避免用户看到过滤后的密码列表，而不是全部密码以为密码丢失了
  useEffect(() => {
    setSearchKeyword('')
    setSearchTags([])
    setSearchResult(null)
    setSearchInProgress(false)
  }, [])

  // 搜索异步计算：先让出主线程让 Loading 渲染出来（RN 桥接需要，小程序端无害），
  // 再执行过滤并写入结果，完成后收起 Loading
  useEffect(() => {
    if (!searchInProgress) return
    const timer = setTimeout(() => {
      setSearchResult(filterPasswords(passwords, searchKeyword, searchTags))
      setSearchInProgress(false)
    }, 50)
    return () => clearTimeout(timer)
  }, [searchInProgress, searchKeyword, searchTags, passwords])

  const isSearching = searchKeyword.length > 0 || searchTags.length > 0
  // 搜索态用异步计算结果，非搜索态展示全部密码
  const shownPasswords = searchResult ?? passwords

  const handleSearchConfirm = (keyword: string, tags: string[]) => {
    setSearchKeyword(keyword)
    setSearchTags(tags)
    saveSearchState({ keyword, tags })
    if (keyword || tags.length > 0) {
      setSearchInProgress(true)
    } else {
      setSearchResult(null)
      setSearchInProgress(false)
    }
  }

  const handleSearchReset = () => {
    setSearchKeyword('')
    setSearchTags([])
    setSearchResult(null)
    setSearchInProgress(false)
    saveSearchState({ keyword: '', tags: [] })
  }

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [
      {
        key: 'backup',
        label: '备份与恢复',
        icon: '☁️',
        onClick: () => setWebdavVisible(true),
      },
      {
        key: 'export',
        label: '导出密码',
        icon: '📤',
        onClick: () => setExportVisible(true),
      },
      {
        key: 'import',
        label: '导入密码',
        icon: '📥',
        onClick: () => setImportVisible(true),
      },
      {
        key: 'changePasscode',
        label: '更改口令',
        icon: '🔑',
        onClick: () => setChangePasscodeVisible(true),
      },
      // 「设置」仅在非 RN 端展示：RN 端暂未适配该页面
      ...(process.env.TARO_ENV !== 'rn'
        ? [
          {
            key: 'settings',
            label: '设置',
            icon: '⚙️',
            onClick: () => Taro.navigateTo({ url: '/pages/settings/index' }),
          },
        ]
        : []),
      {
        key: 'about',
        label: '关于',
        icon: 'ℹ️',
        onClick: () => Taro.navigateTo({ url: '/pages/about/index' }),
      },
      {
        key: 'lock',
        label: '锁定',
        icon: '🔒',
        onClick: () => lock(),
      },
      // 「退出」仅在 RN 端提供：微信小程序端受 wx.exitMiniProgram 点击态限制无法可靠退出，
      // 故该平台不展示退出入口
      ...(process.env.TARO_ENV === 'rn'
        ? [
          {
            key: 'exit',
            label: '退出',
            icon: '🚪',
            danger: true,
            onClick: () => {
              // 退出前先锁定（清空内存中的数据密钥并置为锁定态），
              // 保证即便 RN 应用只是被移到后台/未完全终止进程，下次打开时也是解锁界面
              lock()
              exitApp()
            },
          },
        ]
        : []),
    ]
    return items
  }, [lock])

  const handleDelete = useCallback((pwd: Password) => {
    setDeleteTarget(pwd)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const ok = await remove(deleteTarget.id)
    showToast({ title: ok ? '已删除' : '删除失败', icon: ok ? 'success' : 'error' })
    setDeleteTarget(null)
  }, [deleteTarget, remove])

  // 编辑 / 新增统一跳转到编辑页，在编辑页保存或取消后返回本页
  const handleEdit = useCallback((pwd: Password) => {
    Taro.navigateTo({ url: `/pages/edit/index?id=${pwd.id}` })
  }, [])

  const handleAdd = useCallback(() => {
    Taro.navigateTo({ url: '/pages/edit/index' })
  }, [])

  return (
    <View className="page-wrapper">
      <View className="password-page">
        <View className="page-header">
          <Text className={isSearching ? 'page-title page-title--searching' : 'page-title'}>
            {isSearching ? '搜索结果' : '全部密码'}
          </Text>
          <View className="page-header-right">
            <Text className="page-count">{isSearching ? (searchInProgress ? '搜索中…' : `${shownPasswords.length}/${passwords.length}`) : `共 ${passwords.length} 条`}</Text>
            <Button
              type="text"
              size="custom"
              style={{ marginLeft: 8 }}
              onClick={() => setSearchVisible(true)}
              onLongPress={handleSearchReset}
            >
              <Icon name="search" size={20} />
            </Button>
            <Button
              type="text"
              size="custom"
              style={{ marginLeft: 8 }}
              onClick={() => setMenuVisible(true)}
            >
              <Icon name="menu" size={20} />
            </Button>
          </View>
        </View>

        {loading || searchInProgress ? (
          <Loading text={searchInProgress ? '搜索中...' : undefined} />
        ) : shownPasswords.length === 0 ? (
          <View className="empty">
            <Text className="empty-text">
              {isSearching ? '没有匹配的密码' : '暂无密码。请点击 + 添加吧~'}
            </Text>
          </View>
        ) : (
          <PasswordList
            items={shownPasswords}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </View>

      <FAB onClick={handleAdd} />

      {/* 用 Block 包裹所有可显隐的弹窗，隔离弹窗显隐时对兄弟节点的 setData 重序列化，
          避免页面（含密码列表 VirtualList 的 scroll-view）因 Taro 删除节点缺陷而滚动回顶 */}
      <Block>
        <SearchDialog
          visible={searchVisible}
          passwords={passwords}
          defaultKeyword={searchKeyword}
          defaultTags={searchTags}
          onClose={() => setSearchVisible(false)}
          onConfirm={handleSearchConfirm}
        />
        <ConfirmDialog
          visible={deleteTarget !== null}
          title="删除密码"
          content={deleteTarget ? `确定删除「${deleteTarget.title}」吗？` : ''}
          confirmText="删除"
          confirmColor="#e64340"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
        <ContextMenu
          visible={menuVisible}
          items={menuItems}
          onClose={() => setMenuVisible(false)}
        />
        <ExportDialog
          visible={exportVisible}
          passwords={passwords}
          onClose={() => setExportVisible(false)}
        />
        <ImportDialog
          visible={importVisible}
          onImport={importMany}
          onClose={() => setImportVisible(false)}
        />
        <ChangePasscode
          visible={changePasscodeVisible}
          onChange={change}
          onClose={() => setChangePasscodeVisible(false)}
        />
        <WebDAVDialog
          visible={webdavVisible}
          passwords={passwords}
          onImport={importMany}
          onClose={() => setWebdavVisible(false)}
        />
      </Block>
      <FirstUseNotice />
    </View>
  )
}

const Index = () => {
  useNavigationBarTheme()
  return (
    <ThemeRoot>
      <PasscodeGuard>
        <IndexContent />
      </PasscodeGuard>
    </ThemeRoot>
  )
}

export default Index
