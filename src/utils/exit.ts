import Taro from '@tarojs/taro'

/**
 * 退出小程序 / 应用。
 * 微信小程序端调用官方退出接口（该接口必须由用户点击行为触发，需在点击回调中同步调用，
 * 不能在 setTimeout 或 Promise 回调等异步上下文中调用）；H5 等其他非 RN 端无法主动退出，仅保持锁定状态。
 */
export function exitApp(): void {
  if (process.env.TARO_ENV === 'weapp') {
    Taro.exitMiniProgram({
      fail: (err) => {
        console.error('[exit] exitMiniProgram fail:', err)
      },
    })
  }
}
