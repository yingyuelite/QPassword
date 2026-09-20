import { memo, useCallback, useEffect, useRef } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
 * 小程序/H5 端密码列表：使用 @tarojs/components-advanced 的虚拟列表，只渲染可视区域的项。
 * RN 端对应实现见 index.rn.tsx
 */
const PasswordList: React.FC<PasswordListProps> = memo(function PasswordList({
  items,
  onEdit,
  onDelete,
}: PasswordListProps) {
  // VirtualList 的实例（List 类组件），用于数据变化后修正 / 重测 item 高度
  const listRef = useRef<any>(null)
  // 上一次的列表数据，用于把旧的高度缓存按 id 映射到新索引
  const prevItemsRef = useRef<Password[]>([])

  /**
   * 重新测量当前已渲染 item 的真实高度并写回 VirtualList 的高度缓存。
   *
   * VirtualList 的高度缓存是按「索引」记录的，且它自身的重新测量发生在每次更新的
   * setTimeout(0) —— 小程序端此时 setData 通常还没渲染完成，会量到旧高度；对已经测量过的
   * item 又不会再重试。因此在数据变化、且渲染完成之后，主动量取已渲染 item 的真实高度写回。
   */
  const remeasureRenderedItems = useCallback(() => {
    const inst = listRef.current
    const preset = inst?.preset
    const itemList = inst?.itemList
    if (!inst || !preset || !itemList || typeof inst._getRangeToRender !== 'function') {
      // 拿不到内部实例时退化为普通重渲染
      inst?.refresh?.()
      return
    }

    // [overscanStart, overscanStop, start, stop]，取已渲染（含预渲染）的范围
    const [overscanStart, overscanStop] = inst._getRangeToRender()
    const indices: number[] = []
    const query = Taro.createSelectorQuery()
    for (let i = overscanStart; i <= overscanStop; i++) {
      query.select(`#${preset.id}-${i}`).boundingClientRect()
      indices.push(i)
    }
    query.exec((rects: any[]) => {
      if (!Array.isArray(rects)) return
      rects.forEach((rect, i) => {
        const size = rect?.height
        const index = indices[i]
        if (typeof size === 'number' && size > 0 && itemList.getSize(index) !== size) {
          itemList.setSize(index, size)
        }
      })
    })
  }, [])

  useEffect(() => {
    const inst = listRef.current
    const itemList = inst?.itemList
    const prevItems = prevItemsRef.current
    prevItemsRef.current = items

    // 关键修复：VirtualList 内部的高度缓存 list 是按索引存的，增删 / 排序（如新增密码排到最前）
    // 只会让数组整体错位，并不会同步移动缓存，于是每个 item 都沿用了「上一个 item」的高度，
    // 滚动时每个 item 都要先按错误高度渲染、再被重新测量，造成条目消失又出现。
    // 这里按密码 id 把旧缓存映射到新索引，保持每个 item 的高度缓存始终对应它自己。
    if (itemList && Array.isArray(itemList.list)) {
      const prevIndexById = new Map<number, number>()
      prevItems.forEach((p, i) => prevIndexById.set(p.id, i))
      const prevList: number[] = itemList.list
      itemList.list = items.map((p) => {
        const oldIndex = prevIndexById.get(p.id)
        const size = oldIndex != null ? prevList[oldIndex] : -1
        return typeof size === 'number' && size >= 0 ? size : -1
      })
      itemList.refreshCounter = (itemList.refreshCounter || 0) + 1
      inst?.refresh?.()
    }

    // 渲染完成后再测量：略晚一次（确保 setData 已应用），再稍晚一次兜底
    const timer1 = setTimeout(remeasureRenderedItems, 120)
    const timer2 = setTimeout(remeasureRenderedItems, 360)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [items, remeasureRenderedItems])

  // 页面重新显示时（例如从编辑页新增/编辑后返回）重新测量：
  // 数据变更事件通常在本页仍处于后台时就触发了，此时页面未真正渲染、量不到高度，
  // 等本页重新显示、列表渲染完成后再量一次。
  Taro.useDidShow(() => {
    remeasureRenderedItems()
  })

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
      ref={(inst: unknown) => { listRef.current = inst }}
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
