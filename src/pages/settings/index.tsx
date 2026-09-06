import { View, Text } from '@tarojs/components'
import { useTheme, saveThemeMode } from '@/hooks/useTheme'
import { THEME_MODE_OPTIONS, type ThemeMode } from '@/types/settings'
import { showToast } from '@/utils/toast'
import { useNavigationBarTheme } from '@/utils/navigationBar'
import ThemeRoot from '@/components/base/ThemeRoot'
import RadioGroup from '@/components/base/RadioGroup'
import './index.scss'

const Settings = () => {
  useNavigationBarTheme()
  const { themeMode } = useTheme()

  const handleSelect = async (mode: ThemeMode) => {
    if (mode === themeMode) return
    const ok = await saveThemeMode(mode)
    showToast({ title: ok ? '主题已切换' : '设置失败', icon: ok ? 'none' : 'error' })
  }

  return (
    <ThemeRoot>
      <View className="settings-page">
        <View className="settings-section">
          <Text className="settings-section-title">主题</Text>
          <RadioGroup options={THEME_MODE_OPTIONS} value={themeMode} onChange={handleSelect} />
        </View>
      </View>
    </ThemeRoot>
  )
}

export default Settings
