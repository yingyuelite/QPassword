import { View, Text } from '@tarojs/components'
import './index.scss'

export interface RadioOption<T extends string | number> {
  value: T
  label: string
}

export interface RadioGroupProps<T extends string | number> {
  /** 可选列表 */
  options: RadioOption<T>[]
  /** 当前选中的值 */
  value: T
  /** 选中变化回调 */
  onChange: (value: T) => void
}

/** 单选按钮组（可复用的基础组件） */
function RadioGroup<T extends string | number>({ options, value, onChange }: RadioGroupProps<T>) {
  return (
    <View className="radio-group">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <View
            key={String(opt.value)}
            className={active ? 'radio-option radio-option--active' : 'radio-option'}
            onClick={() => onChange(opt.value)}
            hoverClass="hover-style"
            hoverStyle={{ opacity: 0.8 }}
          >
            <Text
              className={active ? 'radio-label radio-label--active' : 'radio-label'}
            >
              {opt.label}
            </Text>
            <View
              className={active ? 'radio-badge radio-badge--active' : 'radio-badge'}
            >
              {active ? <View className="radio-dot" /> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default RadioGroup