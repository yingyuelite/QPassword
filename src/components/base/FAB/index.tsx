import React from 'react'
import { Text } from '@tarojs/components'
import Button from '@/components/base/Button'
import './index.scss'

interface FABProps {
  onClick: () => void
}

const FAB: React.FC<FABProps> = ({ onClick }) => {
  return (
    <Button
      type="primary"
      size="small"
      className="fab"
      style={{ borderRadius: 9999 }}
      onClick={onClick}
    >
      <Text className="fab-icon">+</Text>
    </Button>
  )
}

export default FAB
