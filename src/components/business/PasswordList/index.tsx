import { memo, useCallback, useEffect, useRef } from 'react'
import { View } from '@tarojs/components'
import { VirtualList } from '@tarojs/components-advanced'
import { Password } from '@/types/password'
import PasswordItem from '@/components/business/PasswordItem'
import './index.scss'

interface PasswordListProps {
  items: Password[]
  onEdit: (pwd: Password) => void
  onDelete: (pwd: Password) => void
}

/**
 * 小程序/H5 端密码列表：使用 @tarojs/components-advanced 的虚拟列表，只渲染可视区域的项
 * RN 端对应实现见 index.rn.tsx
 */
const PasswordList: React.FC<PasswordListProps> = memo(function PasswordList({
  items,
  onEdit,
  onDelete,
}: PasswordListProps) {
  const listRef = useRef<{ forceUpdate?: () => void } | null>(null)

  /**
   * 数据变化（如编辑密码使某个 item 增高/变矮）后，VirtualList 内部会在组件更新的
   * setTimeout(0) 里重新测量 item 高度，但此时小程序端的 setData 通常尚未渲染完成，
   * 会量到旧高度并误判"尺寸未变"，导致 item 容器一直沿用旧的高度缓存：
   * item 变高则内容溢出与下一项重叠，变矮则中间出现空白。
   * 因此在数据变化后延迟一段时间（确保渲染完成），强制触发一次重渲染，
   * 让 VirtualList 重新测量并修正高度缓存。
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      // List 为 class 组件（经 forwardRef 转发），forceUpdate 后其 componentDidUpdate
      // 会对当前可视区域内的 item 重新执行高度测量
      ;(listRef.current as unknown as { forceUpdate?: () => void } | null)?.forceUpdate?.()
    }, 500)
    return () => clearTimeout(timer)
  }, [items])

  // 单项渲染：data 为完整列表，index 为当前索引，id 用于虚拟列表测量高度
  const renderRow = useCallback(({ id, data, index }: {
    id: string
    data: Password[]
    index: number
    isScrolling?: boolean
  }) => (
    <View id={id} className="password-item-gap">
      <PasswordItem
        password={data[index]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </View>
  ), [onEdit, onDelete])

  return (
    <VirtualList
      ref={(inst: unknown) => {
        listRef.current = inst as { forceUpdate?: () => void } | null
      }}
      className="password-list"
      height="100%"
      width="100%"
      item={renderRow}
      itemData={items}
      itemCount={items.length}
      itemSize={300}
      unlimitedSize
      enhanced
      overscanCount={5}
    />
  )
})

export default PasswordList
