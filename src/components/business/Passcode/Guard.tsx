import React, { createContext, useContext } from 'react'
import { View, Text } from '@tarojs/components'
import { usePasscode } from '@/hooks/usePasscode'
import { useTheme } from '@/hooks/useTheme'
import { PasscodeType } from '@/types/passcode'
import PasscodeSetup from './Setup'
import PasscodeVerify from './Verify'

interface PasscodeContextValue {
  unlocked: boolean
  change: (newType: PasscodeType, newValue: string) => Promise<void>
  lock: () => void
}

export const PasscodeContext = createContext<PasscodeContextValue>({
  unlocked: false,
  change: async () => {},
  lock: () => {},
})

export function usePasscodeContext() {
  return useContext(PasscodeContext)
}

/** 兼容旧用法，仅返回 unlocked 状态 */
export function usePasscodeUnlocked() {
  return useContext(PasscodeContext).unlocked
}

interface GuardProps {
  children: React.ReactNode
}

const PasscodeGuard: React.FC<GuardProps> = ({ children }) => {
  const { status, passcode, setup, verify, lock, change } = usePasscode()
  const { colors } = useTheme()

  if (status === 'loading') {
    return (
      <View className="master-page">
        <Text style={{ color: colors.textPrimary, fontSize: 32 }}>加载中...</Text>
      </View>
    )
  }

  if (status === 'unset') {
    return <PasscodeSetup onSetup={setup} />
  }

  if (status === 'locked' && passcode) {
    return <PasscodeVerify passcode={passcode} onVerify={verify} />
  }

  return (
    <PasscodeContext.Provider value={{ unlocked: status === 'unlocked', change, lock }}>
      {children}
    </PasscodeContext.Provider>
  )
}

export default PasscodeGuard
