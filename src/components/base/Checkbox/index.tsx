import React from 'react'
import { View, Text } from '@tarojs/components'
import { useTheme } from '@/hooks/useTheme'
import './index.scss'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  color?: string
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, color }) => {
  const { colors } = useTheme()
  const finalColor = color ?? colors.primary
  return (
    <View className="checkbox-wrap" onClick={() => onChange(!checked)}>
      <View
        className={`checkbox ${checked ? 'checkbox-checked' : ''}`}
        style={checked ? { backgroundColor: finalColor, borderColor: finalColor } : undefined}
      >
        {checked ? <Text className="checkbox-tick">✓</Text> : null}
      </View>
      {label ? <Text className="checkbox-label">{label}</Text> : null}
    </View>
  )
}

export default Checkbox
