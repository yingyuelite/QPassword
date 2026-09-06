import { ToastAndroid, Platform, Alert } from 'react-native'

interface ToastOptions {
  title: string
  icon?: 'none' | 'success' | 'error' | 'loading'
  duration?: number
}

export function showToast(options: ToastOptions) {
  const prefix = options.icon === 'success' ? '✓ ' : options.icon === 'error' ? '✗ ' : ''
  const text = prefix + options.title

  if (Platform.OS === 'android') {
    const d = options.duration && options.duration > 2000 ? ToastAndroid.LONG : ToastAndroid.SHORT
    ToastAndroid.show(text, d)
  } else {
    Alert.alert('', text)
  }
}
