import Taro from '@tarojs/taro'

type LoadingOption = Partial<Taro.showLoading.Option>

/** 显示全局 loading（小程序端使用 Taro.showLoading，原生渲染，盖在一切之上） */
export function showLoading(options?: LoadingOption): Promise<any> {
  // console.log('[MINI]showLoading', options)
  return Promise.resolve(Taro.showLoading(options as Taro.showLoading.Option))
}

/** 隐藏全局 loading */
export function hideLoading(): Promise<any> {
  return Promise.resolve(Taro.hideLoading())
}
