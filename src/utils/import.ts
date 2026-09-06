import { Password, normalizePassword } from '@/types/password'
import { Backup } from '@/types/backup'
import { Passcode, PasscodeType } from '@/types/passcode'
import { GLOBAL_DATA } from '@/global/key'
import { aesGcmDecrypt, decryptDataKey } from './crypto'
import { loadPasscode } from './storage'


export function readImportFile(content: string): Backup {
  const data: Backup = JSON.parse(content)
  // version 属性和 passwords 需要存在
  if (!data.version || !data.passwords) {
    throw new Error('文件格式不正确')
  }
  return data
}

/**
 * 判断导入文件是否需要用户输入口令
 * @returns null 表示明文导出（无需口令），否则返回口令状态信息
 */
export async function checkImportNeedPasscode(
  filePasscode: Passcode | null,
): Promise<
  | { status: 'key_match'; type: PasscodeType; backupPasscode: Passcode }
  | { status: 'need_input'; type: PasscodeType; backupPasscode: Passcode }
  | null
> {
  // 明文导出，无需密码
  if (!filePasscode) {
    return null
  }

  // 加密导出，比较是否与当前存储的随机盐和edk一致，一致则说明没有更改或重设过口令
  const currentPasscode = await loadPasscode()
  if (currentPasscode && currentPasscode.salt === filePasscode.salt && currentPasscode.edk === filePasscode.edk) {
    // 密钥一致，无需用户再次输入
    return {
      status: 'key_match',
      type: filePasscode.type,
      backupPasscode: filePasscode,
    }
  }

  // 密钥不一致，需要用户输入导出时的口令
  return {
    status: 'need_input',
    type: filePasscode.type,
    backupPasscode: filePasscode,
  }
}

/**
 * 验证用户输入的口令是否与备份文件的口令匹配
 */
export function verifyImportPasscode(
  input: string,
  backupPasscode: Passcode
): boolean {
  return decryptDataKey(input, backupPasscode) !== null
}

/**
 * 补齐解析出的密码列表，保证每条密码字段完整
 */
function normalizePasswordList(rawList: unknown): Password[] {
  if (!Array.isArray(rawList)) return []
  return rawList.map((item) => normalizePassword((item || {}) as Partial<Password>))
}

/**
 * 解析导入文件内容，返回密码列表
 * @param content 文件 JSON 字符串内容
 * @param options.useInputKey 用户输入的口令（密钥不匹配时需提供）
 * @param options.useCurrentKey 是否使用当前已设置的口令解密（密钥匹配时）
 */
export async function parseImportFile(
  content: string,
  options?: { useInputKey?: string; useCurrentKey?: boolean }
): Promise<Password[]> {
  const data = readImportFile(content)

  const isEncrypted = data.passcode !== null

  if (!isEncrypted) {
    return normalizePasswordList(data.passwords)
  }

  // 加密文件，使用当前密钥解密
  if (options?.useCurrentKey) {
    if (!GLOBAL_DATA.dataKey) {
      throw new Error('当前数据密钥未设置')
    }
    const plainText = aesGcmDecrypt(data.passwords as string)
    if (!plainText) {
      console.error('解密失败')
      return []
    }
    return normalizePasswordList(JSON.parse(plainText))
  }

  // 加密文件，使用用户提供的密码解密
  if (options?.useInputKey) {
    const aesKey = decryptDataKey(options.useInputKey, data.passcode!)
    if (!aesKey) {
      throw new Error('口令错误')
    }
    const plainText = aesGcmDecrypt(data.passwords as string, aesKey)
    if (!plainText) {
      console.error('解密失败')
      return []
    }
    return normalizePasswordList(JSON.parse(plainText))
  }

  // 加密文件但未提供密码
  return []
}
