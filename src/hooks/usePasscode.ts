import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { loadPasscode, savePasscode } from '@/utils/storage'
import { decryptDataKey, generateSalt, generatePasscodeKey, encryptDataKey, generateDataKey, clearDataKey } from '@/utils/crypto'
import { Passcode, PasscodeType } from '@/types/passcode'
import { GLOBAL_DATA } from '@/global/key'
import { KDF_ITERATIONS } from '@/utils/pbkdf2'

export const EVENT_PASSCODE_CHANGED = 'passcode_changed'

/**
 * 口令状态
 * - loading: 初始状态，口令配置读取中
 * - unset: 未设置口令
 * - locked: 已设置口令，尚未解锁
 * - unlocked: 已设置口令，已解锁
 */
export type PasscodeStatus = 'loading' | 'unset' | 'locked' | 'unlocked'

export function usePasscode() {
  const [status, setStatus] = useState<PasscodeStatus>('loading')
  const [passcode, setPasscode] = useState<Passcode | null>(null)

  useEffect(() => {
    loadPasscode().then((data) => {
      setPasscode(data)
      setStatus(data ? 'locked' : 'unset')
    })
    // 跨页面同步：更改口令页面调用 change 后，其他页面的 usePasscode 实例刷新本地状态
    // 以保证首页在锁定后能用新口令正确解密数据密钥。
    const handler = () => {
      loadPasscode().then((data) => {
        setPasscode(data)
        setStatus((prev) => {
          // 解锁状态下更改口令：内存中数据密钥未变，保持解锁；否则回到锁定/未设置
          if (data && prev === 'unlocked') return 'unlocked'
          return data ? 'locked' : 'unset'
        })
      })
    }
    Taro.eventCenter.on(EVENT_PASSCODE_CHANGED, handler)
    return () => {
      Taro.eventCenter.off(EVENT_PASSCODE_CHANGED, handler)
    }
  }, [])

  const setup = useCallback(async (type: PasscodeType, value: string) => {
    console.log('setup', type, value)
    // value: 1-9，英文逗号分割，如：1,4,5,2

    // 1. 生成新口令密钥
    const salt = await generateSalt()
    const passcodeKey = generatePasscodeKey(value, salt, KDF_ITERATIONS)
    // 2. 生成新数据密钥并加密
    GLOBAL_DATA.dataKey = await generateDataKey()
    const edk = await encryptDataKey(passcodeKey, GLOBAL_DATA.dataKey!)
    setPasscode({ type, salt, iterations: KDF_ITERATIONS, edk })
    // 3. 保存新的口令配置
    await savePasscode({ type, salt, iterations: KDF_ITERATIONS, edk })
    setStatus('unlocked')
  }, [])

  const verify = useCallback(async (value: string): Promise<boolean> => {
    const dataKey = decryptDataKey(value, passcode!)
    if (dataKey) {
      GLOBAL_DATA.dataKey = dataKey
      setStatus('unlocked')
      return true
    }
    return false
  }, [passcode])

  const lock = useCallback(() => {
    clearDataKey()
    if (passcode) setStatus('locked')
  }, [passcode])

  /**
   * 更改口令
   */
  const change = useCallback(async (newType: PasscodeType, newValue: string) => {
    // 1. 生成新口令密钥
    const salt = await generateSalt()
    const passcodeKey = generatePasscodeKey(newValue, salt, KDF_ITERATIONS)
    // 2. 用新密钥重新加密并保存
    const edk = await encryptDataKey(passcodeKey, GLOBAL_DATA.dataKey!)
    setPasscode({ type: newType, salt, iterations: KDF_ITERATIONS, edk })
    // 3. 保存新的口令配置
    await savePasscode({ type: newType, salt, iterations: KDF_ITERATIONS, edk })
    Taro.eventCenter.trigger(EVENT_PASSCODE_CHANGED)
  }, [])

  return { status, passcode, setup, verify, lock, change }
}
