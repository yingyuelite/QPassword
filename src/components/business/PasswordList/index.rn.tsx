import { memo, useCallback } from 'react'
import { VirtualList } from '@tarojs/components-rn'
import { Password } from '@/types/password'
import PasswordItem from '@/components/business/PasswordItem'
import './index.rn.scss'

interface PasswordListProps {
  items: Password[]
  onEdit: (pwd: Password) => void
  onDelete: (pwd: Password) => void
}

/**
 * RN 端密码列表：使用 @tarojs/components-rn 的 VirtualList（内部为 FlatList）
 * 列表项间通过 PasswordItem 自身的 margin-bottom 分隔
 */
const PasswordList: React.FC<PasswordListProps> = memo(function PasswordList({
  items,
  onEdit,
  onDelete,
}: PasswordListProps) {
  const renderRow = useCallback(({ item }: { item: Password }) => (
    <PasswordItem
      password={item}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  ), [onEdit, onDelete])

  return (
    <VirtualList
      style={{ flex: 1 }}
      item={renderRow}
      itemData={items}
      itemSize={300}
      overscanCount={5}
    />
  )
})

export default PasswordList
