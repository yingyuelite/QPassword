import { useCallback } from 'react'
import { View, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ThemeRoot from '@/components/base/ThemeRoot'
import ChangePasscode from '@/components/business/Passcode/Change'
import { usePasscode } from '@/hooks/usePasscode'
import { useNavigationBarTheme } from '@/utils/navigationBar'
import './index.scss'

const ChangePasscodePage = () => {
  useNavigationBarTheme()
  const { change } = usePasscode()
  const isRN = process.env.TARO_ENV === 'rn'

  const handleClose = useCallback(() => {
    Taro.navigateBack()
  }, [])

  return (
    <ThemeRoot>
      <View className="change-page">
        {/* 内容较长（尤其图案口令）时允许滚动，避免底部被裁切：
            RN 端嵌套滚动开启，避免绘制图案时误触发页面滚动 */}
        <ScrollView enable-flex="true" className="change-body" scrollY {...(isRN ? { nestedScrollEnabled: true } : {})}>
          <View className="change-card">
            <ChangePasscode onChange={change} onClose={handleClose} />
          </View>
        </ScrollView>
      </View>
    </ThemeRoot>
  )
}

export default ChangePasscodePage
