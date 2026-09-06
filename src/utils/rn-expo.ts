// RN 端动态加载 expo 原生模块的封装。
// 当 RN 端未重新编译原生应用时，某些 expo 模块可能尚未随原生包加载，
// 这里统一做"模块存在性"检查并给出提示，避免在组件里重复判断与提示。
// 注意：Metro 要求 require() 的参数为静态字符串，因此通过 getter 惰性加载。

import { showToast } from '@/utils/toast'

function loadModule(getModule: () => any): any {
  try {
    return getModule()
  } catch (err) {
    console.error('[rn-expo] 加载 expo 模块失败:', err)
    return null
  }
}

/** 获取 expo-document-picker 模块；未加载时提示重新编译并返回 null */
export function getDocumentPicker(): any {
  const DocumentPicker = loadModule(() => require('expo-document-picker'))
  if (!DocumentPicker || typeof DocumentPicker.getDocumentAsync !== 'function') {
    showToast({ title: '请重新编译原生应用以加载文件选择模块', icon: 'none', duration: 3000 })
    return null
  }
  return DocumentPicker
}

/** 获取 expo-file-system 模块；未加载时提示重新编译并返回 null */
export function getFileSystem(): any {
  const FileSystem = loadModule(() => require('expo-file-system'))
  if (!FileSystem || typeof FileSystem.writeAsStringAsync !== 'function') {
    showToast({ title: '请重新编译原生应用以加载文件存储模块', icon: 'none', duration: 3000 })
    return null
  }
  return FileSystem
}
