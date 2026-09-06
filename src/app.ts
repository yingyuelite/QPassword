import { Component } from 'react'

import type { PropsWithChildren } from 'react'

import { utf8Encode, utf8Decode } from './utils/codec'
import { loadSettings } from './utils/storage'
import './app.scss'

// 微信小程序端没有全局的 TextEncoder / TextDecoder，
// 而 @noble/hashes 与 @noble/ciphers 的 utf8ToBytes / bytesToUtf8 会直接使用它们，
// 这里复用 codec.ts 中的 utf8Encode / utf8Decode 实现 polyfill，避免真机报错：
// ReferenceError: TextEncoder is not defined
// 使用普通函数构造函数（不用 class 语法，避免经 Babel 转译、打包混淆后依赖 helper 模块出问题），
// 并同时挂载到 globalThis 与 global 上，兼容不同基础库版本下全局对象指向的差异。
function polyfillTextEncoderDecoder() {
  // @ts-ignore
  const g: any = typeof globalThis !== 'undefined' ? globalThis : global
  if (typeof g.TextEncoder === 'undefined') {
    // eslint-disable-next-line no-inner-declarations
    function TextEncoder() {}
    TextEncoder.prototype.encode = function (str: string): Uint8Array {
      return utf8Encode(str)
    }
    g.TextEncoder = TextEncoder
  }
  if (typeof g.TextDecoder === 'undefined') {
    // eslint-disable-next-line no-inner-declarations
    function TextDecoder() {}
    TextDecoder.prototype.decode = function (bytes: Uint8Array): string {
      return utf8Decode(bytes)
    }
    g.TextDecoder = TextDecoder
  }
}
polyfillTextEncoderDecoder()

// 微信小程序端：移除 Taro 运行时对输入框 value 的强制 setData 回写，
// 根治"极快输入丢字、按住删除时被删的字回弹"的异步回写竞态。
if (process.env.TARO_ENV === 'weapp') {
  require('./utils/patchFormElement')
}

if (process.env.TARO_ENV === 'rn') {
  // 以下代码为了解决报错：TypeError: TopViewEventEmitter.removeListener is not a function (it is undefined)
  // 在 RN 0.74+ 中 DeviceEventEmitter.removeListener 已被移除
  // 解决方案：在 DeviceEventEmitter 上添加 removeListener 的 polyfill，兼容旧代码。
  const { DeviceEventEmitter } = require('react-native')
  const listenerMap = new Map<string, Set<{ listener: Function; subscription: any }>>()

  const originalAddListener = DeviceEventEmitter.addListener.bind(DeviceEventEmitter)
  DeviceEventEmitter.addListener = (eventName: string, listener: Function) => {
    const subscription = originalAddListener(eventName, listener)
    if (!listenerMap.has(eventName)) {
      listenerMap.set(eventName, new Set())
    }
    listenerMap.get(eventName)!.add({ listener, subscription })
    return subscription
  }

  if (!DeviceEventEmitter.removeListener) {
    DeviceEventEmitter.removeListener = (eventName: string, listener: Function) => {
      const listeners = listenerMap.get(eventName)
      if (listeners) {
        for (const item of listeners) {
          if (item.listener === listener) {
            item.subscription.remove()
            listeners.delete(item)
            break
          }
        }
      }
    }
  }
}

class App extends Component<PropsWithChildren> {

  componentDidMount() {
    // 预热设置缓存（主题等），减少页面首帧的主题闪烁
    loadSettings()
  }

  componentDidShow() { }

  componentDidHide() { }

  // this.props.children 是将要会渲染的页面
  render() {
    return this.props.children
  }
}


export default App
