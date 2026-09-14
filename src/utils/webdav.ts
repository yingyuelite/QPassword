import Taro from '@tarojs/taro'
import { Password } from '@/types/password'
import { Backup, BackupMeta, defaultBackup } from '@/types/backup'
import { WebDAVConfig } from '@/types/webdav'
import { aesGcmEncrypt } from './crypto'
import { loadPasscode } from './storage'
import { getAuthHeader } from './auth'
import { encodePath } from './url'

const BACKUP_FILE = 'QPassword_backup.qp2'
const META_FILE = 'QPassword_meta.json'

/** 发送 WebDAV 请求 */
function sendRequest(
  url: string,
  method: string,
  config: WebDAVConfig,
  data?: string | ArrayBuffer,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; data: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {
      ...getAuthHeader(config.username, config.password),
      ...(extraHeaders || {}),
    }

    // RN 端 Taro.request 的适配器实现，GET 请求会把入参 data（默认 {} ）序列化为空串
    // 再以 "?" 追加到 URL 末尾（结果形如 .../xxx?... ），坚果云等 WebDAV 服务器会因此
    // 报 "nustore path is not valid"，而微信小程序端无此行为。故 RN 端改用原生 fetch 发送。
    if (process.env.TARO_ENV === 'rn') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined
      const timer = setTimeout(() => controller?.abort(), 60000)
      const init: RequestInit = {
        method,
        headers: header,
        body: data as BodyInit | undefined,
        ...(controller ? { signal: controller.signal } : {}),
      }
      fetch(url, init)
        .then(async (res) => {
          const text = await res.text()
          const responseHeaders: Record<string, string> = {}
          if (res.headers && typeof res.headers.forEach === 'function') {
            res.headers.forEach((value, key) => {
              responseHeaders[key.toLowerCase()] = value
            })
          }
          resolve({
            status: res.status,
            data: text,
            headers: responseHeaders,
          })
        })
        .catch((err) => {
          console.error('[WebDAVClient] request fail:', err)
          reject(new Error(err?.message || '请求失败'))
        })
        .finally(() => clearTimeout(timer))
      return
    }

    Taro.request({
      url,
      method: method as any,
      data,
      header,
      responseType: 'text',
      dataType: 'text',
      success: (res) => {
        const responseHeaders: Record<string, string> = {}
        if (res.header) {
          Object.keys(res.header).forEach((key) => {
            responseHeaders[key.toLowerCase()] = String(res.header![key])
          })
        }
        resolve({
          status: res.statusCode,
          data: res.data,
          headers: responseHeaders,
        })
      },
      fail: (err) => {
        console.error('[WebDAVClient] request fail:', err)
        reject(new Error(err.errMsg || '请求失败'))
      },
    })
  })
}

/** 原生 WebDAV 客户端接口 */
interface NativeWebDAVClient {
  putFileContents(path: string, content: string, options?: { overwrite?: boolean }): Promise<void>
  getFileContents(path: string, options?: { format?: string }): Promise<string>
}

/** 创建原生 WebDAV 客户端 */
export function createWebDAVClient(config: WebDAVConfig): NativeWebDAVClient {
  const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url

  const client: NativeWebDAVClient = {
    async putFileContents(path: string, content: string, options?: { overwrite?: boolean }): Promise<void> {
      const url = encodePath(baseUrl, path)
      const extraHeaders: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
      }
      if (!options?.overwrite) {
        extraHeaders['If-None-Match'] = '*'
      }
      const response = await sendRequest(url, 'PUT', config, content, extraHeaders)
      if (response.status >= 200 && response.status < 300) {
        // 成功
        return
      }
      throw new Error(`上传文件失败，状态码：${response.status}`)
    },

    async getFileContents(path: string, _options?: { format?: string }): Promise<string> {
      const url = encodePath(baseUrl, path)
      const response = await sendRequest(url, 'GET', config)
      // console.log('[WebDAVClient] getFileContents response:', JSON.stringify(response))
      if (response.status >= 200 && response.status < 300) {
        // 成功
        return response.data
      }
      throw new Error(`下载文件失败，状态码：${response.status}`)
    },
  }

  return client
}

/**
 * 备份密码到 WebDAV 服务器
 */
export async function backupToWebDAV(
  passwords: Password[],
  config: WebDAVConfig,
): Promise<BackupMeta> {
  const client = createWebDAVClient(config)

  // TODO load encrypted passwords
  const cipherText = await aesGcmEncrypt(JSON.stringify(passwords))
  if (!cipherText) {
    throw new Error('加密失败')
  }

  const passcode = await loadPasscode()

  const backup: Backup = {
    ...defaultBackup,
    passcode,
    passwords: cipherText,
  }

  const backupJson = JSON.stringify(backup)
  await client.putFileContents(`${BACKUP_FILE}`, backupJson, { overwrite: true })

  const meta: BackupMeta = {
    time: Date.now(),
    count: passwords.length,
  }
  const metaJson = JSON.stringify(meta)
  await client.putFileContents(`${META_FILE}`, metaJson, { overwrite: true })

  return meta
}

/** 读取 WebDAV 上的元数据文件 */
export async function readBackupMeta(config: WebDAVConfig): Promise<BackupMeta | null> {
  try {
    const client = createWebDAVClient(config)

    const content = await client.getFileContents(`${META_FILE}`, { format: 'text' })
    return JSON.parse(content) as BackupMeta
  } catch {
    return null
  }
}

/**
 * 从 WebDAV 下载备份文件内容
 * 返回 JSON 字符串，可直接传给 ImportDialogContent 处理
 */
export async function downloadBackupContent(config: WebDAVConfig): Promise<string> {
  const client = createWebDAVClient(config)

  const content = await client.getFileContents(`${BACKUP_FILE}`, { format: 'text' })
  return content
}
