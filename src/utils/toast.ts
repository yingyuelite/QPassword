import Taro from '@tarojs/taro'

interface ToastOptions {
  title: string
  icon?: 'none' | 'success' | 'error' | 'loading'
  duration?: number
}

export function showToast(options: ToastOptions) {
  Taro.showToast(options)
}
