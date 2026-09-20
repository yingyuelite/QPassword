import React, { useState, useMemo, useEffect, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import SafeInput from '@/components/base/SafeInput'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import { Password } from '@/types/password'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import './index.scss'

interface SearchDialogProps {
  visible: boolean
  passwords: Password[]
  /** 打开时预填的关键词（当前已应用的搜索关键词） */
  defaultKeyword?: string
  /** 打开时预选的标签（当前已应用的搜索标签） */
  defaultTags?: string[]
  onClose: () => void
  onConfirm: (keyword: string, selectedTags: string[]) => void
}

const SearchDialog: React.FC<SearchDialogProps> = ({ visible, passwords, defaultKeyword = '', defaultTags = [], onClose, onConfirm }) => {
  // 关键词展示值：仅用于输入框 defaultValue（重置 / 历史回填等外部更新生效），
  // 输入过程中不回写（输入框为非受控，避免 value setData 竞态），最新值始终以 keywordRef 为准
  const [keyword, setKeyword] = useState('')
  const keywordRef = useRef('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  // 每次打开时自增，用于强制输入框以最新默认值重挂载（见下方说明）
  const [inputKey, setInputKey] = useState(0)
  const { history, add, clear, reload } = useSearchHistory()

  useEffect(() => {
    if (visible) {
      reload()
      // 用传入的当前搜索状态进行预填，打开时即可看到之前设置的搜索条件
      keywordRef.current = defaultKeyword
      setKeyword(defaultKeyword)
      setSelectedTags(defaultTags)
      // 输入框是非受控组件，且仅在 defaultValue 变化时才会重挂载。
      // 若上次未确认就修改/清空了输入框再关闭，此时 keyword 仍等于 defaultKeyword，
      // setKeyword 不会触发更新，输入框会保留上次的残留内容，导致偶尔显示不出上次搜索关键词。
      // 这里每次打开都递增 key，强制输入框按 defaultKeyword 重新挂载。
      setInputKey((k) => k + 1)
    }
  }, [visible, reload, defaultKeyword, defaultTags])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    passwords.forEach((pwd) => pwd.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet)
  }, [passwords])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleConfirm = async () => {
    const kw = keywordRef.current.trim()
    if (kw) {
      await add(kw)
    }
    onConfirm(kw, selectedTags)
    onClose()
  }

  const handleReset = () => {
    keywordRef.current = ''
    setKeyword('')
    setSelectedTags([])
  }

  const handleHistoryClick = (item: string) => {
    keywordRef.current = item
    setKeyword(item)
  }

  return (
    <Modal
      visible={visible}
      title="搜索密码"
      onClose={onClose}
      footer={
        <View className="search-actions">
          <Button type="default" block onClick={handleReset}>重置</Button>
          <Button type="primary" block onClick={handleConfirm}>确定</Button>
        </View>
      }
    >
      <View className="search-field">
        <Text className="search-hint">输入关键词搜索。支持匹配标题、用户名、邮箱、手机号、微信、登录方式、备注、网址、标签等字段的内容：</Text>
        <SafeInput
          key={inputKey}
          className="search-input"
          placeholderClass="search-input-placeholder"
          placeholder="输入关键词"
          defaultValue={keyword}
          onInput={(v) => { keywordRef.current = v }}
        />
      </View>

      {history.length > 0 ? (
        <View className="search-history">
          <View className="search-history-header">
            <Text className="search-tags-label">搜索历史</Text>
            <Text className="search-history-clear" onClick={clear}>清空</Text>
          </View>
          <View className="search-tags-list">
            {history.map((item) => (
              <Text
                key={item}
                className="search-tag"
                onClick={() => handleHistoryClick(item)}
              >
                {item}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {allTags.length > 0 ? (
        <View className="search-tags">
          <Text className="search-tags-label">标签搜索</Text>
          <View className="search-tags-list">
            {allTags.map((tag) => (
              <Text
                key={tag}
                className={`search-tag ${selectedTags.includes(tag) ? 'search-tag-active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      <View className="search-note">
        <Text className="search-note-title">温馨提示：</Text>
        <Text className="search-note-content">1.关键词与标签同时使用时取交集。</Text>
        <Text className="search-note-content">2.多个标签之间为并列关系，满足任一即可。</Text>
        <Text className="search-note-content">3.长按搜索按钮可以清除搜索条件，显示全部密码。</Text>
      </View>
    </Modal>
  )
}

export default SearchDialog
