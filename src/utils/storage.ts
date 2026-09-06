import Taro from '@tarojs/taro'
import { normalizePassword, Password } from '@/types/password'
import { Passcode } from '@/types/passcode'
import { SearchState, EMPTY_SEARCH_STATE } from '@/types/search_state'
import { WebDAVConfig } from '@/types/webdav'
import { DEFAULT_SETTINGS, normalizeSettings, Settings } from '@/types/settings'
import { aesGcmEncrypt, aesGcmDecrypt } from './crypto'

const KEY_PASSWORDS = 'passwords'
const KEY_SEARCH_HISTORY = 'search_history'
const KEY_SEARCH_STATE = 'search_state'
const KEY_PASSCODE = 'passcode'
const KEY_WEBDAV_CONFIGS = 'webdav_configs'
const KEY_FIRST_USE_NOTICE = 'first_use_notice_seen'
const KEY_SETTINGS = 'settings'
const MAX_HISTORY = 30

/** 加载最近一次使用的搜索状态 */
export async function loadSearchState(): Promise<SearchState> {
  try {
    const { data } = await Taro.getStorage({ key: KEY_SEARCH_STATE })
    const parsed = data ? (JSON.parse(data) as Partial<SearchState>) : null
    return {
      keyword: typeof parsed?.keyword === 'string' ? parsed.keyword : '',
      tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
    }
  } catch {
    return { ...EMPTY_SEARCH_STATE }
  }
}

/** 持久化搜索状态 */
export async function saveSearchState(state: SearchState): Promise<void> {
  try {
    await Taro.setStorage({ key: KEY_SEARCH_STATE, data: JSON.stringify(state) })
  } catch (err) {
    console.error('saveSearchState error', err)
  }
}

export async function loadPasswords(): Promise<Password[]> {
  const startTime = Date.now()
  console.log('loadPasswords start')
  try {
    const { data } = await Taro.getStorage({ key: KEY_PASSWORDS })
    if (!data) {
      console.log(`loadPasswords end, cost ${Date.now() - startTime}ms, 无数据`)
      return []
    }
    const plainText = aesGcmDecrypt(data)
    if (!plainText) {
      console.error('解密失败')
      console.log(`loadPasswords end, cost ${Date.now() - startTime}ms, 解密失败`)
      return []
    }
    const result = JSON.parse(plainText) as Password[]
    console.log(`loadPasswords end, cost ${Date.now() - startTime}ms, 加载 ${result.length} 条`)
    // 补齐缺失字段（旧版本数据可能缺少新增字段，如 loginMethod），避免 undefined 导致界面异常
    return result.map((item) => normalizePassword(item || {}))
  } catch (err) {
    console.log(`loadPasswords end, cost ${Date.now() - startTime}ms, 异常`)
    return []
  }
}

export async function savePasswords(passwords: Password[]): Promise<boolean> {
  const startTime = Date.now()
  console.log(`savePasswords start, 保存 ${passwords.length} 条`)
  const cipherText = await aesGcmEncrypt(JSON.stringify(passwords))
  if (!cipherText) {
    console.error('加密失败')
    return false
  }
  try {
    await Taro.setStorage({ key: KEY_PASSWORDS, data: cipherText })
    console.log(`savePasswords end, cost ${Date.now() - startTime}ms, 保存成功`)
    return true
  } catch (err) {
    console.error('savePasswords error', err)
    return false
  }
}

export async function loadSearchHistory(): Promise<string[]> {
  try {
    const { data } = await Taro.getStorage({ key: KEY_SEARCH_HISTORY })
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export async function addSearchHistory(keyword: string): Promise<string[]> {
  const list = await loadSearchHistory()
  const next = [keyword, ...list.filter((k) => k !== keyword)].slice(0, MAX_HISTORY)
  await Taro.setStorage({ key: KEY_SEARCH_HISTORY, data: JSON.stringify(next) })
  return next
}

export async function clearSearchHistory(): Promise<void> {
  await Taro.setStorage({ key: KEY_SEARCH_HISTORY, data: JSON.stringify([]) })
}

export async function loadPasscode(): Promise<Passcode | null> {
  try {
    const { data } = await Taro.getStorage({ key: KEY_PASSCODE })
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function savePasscode(data: Passcode): Promise<boolean> {
  try {
    await Taro.setStorage({ key: KEY_PASSCODE, data: JSON.stringify(data) })
    return true
  } catch (err) {
    console.error('savePasscode error', err)
    return false
  }
}

/** 是否已展示过首次使用须知 */
export async function loadFirstUseNoticeSeen(): Promise<boolean> {
  try {
    const { data } = await Taro.getStorage({ key: KEY_FIRST_USE_NOTICE })
    return data === true
  } catch {
    return false
  }
}

/** 标记首次使用须知已展示，之后不再自动弹出 */
export async function markFirstUseNoticeSeen(): Promise<void> {
  try {
    await Taro.setStorage({ key: KEY_FIRST_USE_NOTICE, data: true })
  } catch (err) {
    console.error('标记首次使用须知失败:', err)
  }
}

/** 加载所有 WebDAV 配置 */
export async function loadWebDAVConfigs(): Promise<WebDAVConfig[]> {
  try {
    const { data } = await Taro.getStorage({ key: KEY_WEBDAV_CONFIGS })
    if (!data) return []
    const plainText = aesGcmDecrypt(data)
    if (!plainText) {
      console.error('解密失败')
      return []
    }
    return JSON.parse(plainText) as WebDAVConfig[]
  } catch {
    return []
  }
}

/** 保存所有 WebDAV 配置 */
export async function saveWebDAVConfigs(configs: WebDAVConfig[]): Promise<boolean> {
  const cipherText = await aesGcmEncrypt(JSON.stringify(configs))
  if (!cipherText) {
    console.error('加密失败')
    return false
  }
  try {
    await Taro.setStorage({ key: KEY_WEBDAV_CONFIGS, data: cipherText })
    return true
  } catch (err) {
    console.error('saveWebDAVConfigs error', err)
    return false
  }
}

/** 设置缓存：app 启动预热后，供页面首帧同步读取，避免主题闪烁 */
let cachedSettings: Settings | null = null

/** 同步读取缓存的设置（尚未加载时返回默认值） */
export function getCachedSettings(): Settings {
  return cachedSettings ? { ...cachedSettings } : { ...DEFAULT_SETTINGS }
}

/** 加载应用设置（当前：主题模式）。非敏感数据，明文存储 */
export async function loadSettings(): Promise<Settings> {
  try {
    if (!cachedSettings) {
      const { data } = await Taro.getStorage({ key: KEY_SETTINGS })
      cachedSettings = normalizeSettings(data ? JSON.parse(data) : null)
    }
    return { ...cachedSettings }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** 保存应用设置（当前：主题模式） */
export async function saveSettings(settings: Settings): Promise<boolean> {
  cachedSettings = { ...settings }
  try {
    await Taro.setStorage({ key: KEY_SETTINGS, data: JSON.stringify(settings) })
    return true
  } catch (err) {
    console.error('saveSettings error', err)
    return false
  }
}
