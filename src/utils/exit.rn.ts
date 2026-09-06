import { BackHandler } from 'react-native'

/**
 * 退出应用。
 * RN 端 Android 通过 BackHandler.exitApp 退出应用；
 * iOS 受平台限制不允许主动退出，此时仅保持锁定状态（由调用方 lock）。
 */
export function exitApp(): void {
  BackHandler.exitApp()
}