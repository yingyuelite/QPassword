import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import RootSiblings from 'react-native-root-siblings'

interface LoadingOption {
  title?: string
  mask?: boolean
}

let siblings: RootSiblings | null = null

/**
 * RN 端没有类似 Taro.showLoading 的原生全局 Loading API。
 * 这里复用 Taro 官方 toast/loading 的实现机制：通过 react-native-root-siblings 的
 * RootSiblings 渲染，把 loading 挂到 RootSiblingParent（Taro 已在 createReactNativeApp
 * 中包裹整个应用）之下、React 应用 UI 树之外，作为独立全局原生视图。
 *
 * FIXME：Loading 无法在 RNModal 之上显示。即打开了 RNModal 之后，Loading 会被遮挡。
 * 目前没有找到解决方案。
 */
export function showLoading(options?: LoadingOption): Promise<void> {
  // console.log('[RN]showLoading', options)
  if (siblings) {
    siblings.destroy()
    siblings = null
  }
  siblings = new RootSiblings(
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color="#237166" />
        {options?.title ? <Text style={styles.title}>{options.title}</Text> : null}
      </View>
    </View>
  )
  return Promise.resolve()
}

export function hideLoading(): Promise<void> {
  if (siblings) {
    siblings.destroy()
    siblings = null
  }
  return Promise.resolve()
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 12,
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
  },
})
