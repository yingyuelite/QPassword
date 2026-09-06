import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import { USAGE_ITEMS } from '@/constants/usage'
import { loadFirstUseNoticeSeen, markFirstUseNoticeSeen } from '@/utils/storage'
import './index.scss'

const FirstUseNotice = () => {
  const [visible, setVisible] = useState(false)

  // 首次进入应用时弹出使用须知，仅展示一次
  useEffect(() => {
    let cancelled = false
    loadFirstUseNoticeSeen().then((seen) => {
      if (!cancelled && !seen) {
        setVisible(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClose = () => {
    setVisible(false)
    markFirstUseNoticeSeen()
  }

  return (
    <Modal
      visible={visible}
      title="使用须知"
      onClose={handleClose}
      footer={(
        <Button type="primary" block onClick={handleClose}>
          我知道了
        </Button>
      )}
    >
      <View className="first-use-body">
        {USAGE_ITEMS.map((text, idx) => (
          <View key={idx} className="first-use-item">
            <Text className="first-use-text">{text}</Text>
          </View>
        ))}
      </View>
    </Modal>
  )
}

export default FirstUseNotice
