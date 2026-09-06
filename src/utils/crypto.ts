// 注意：导入 @noble/ciphers 和 @noble/hashes 库需要带 .js 后缀
import { gcm } from '@noble/ciphers/aes.js'
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js'
import { base64 } from '@scure/base'
import { GLOBAL_DATA } from '@/global/key'
import { Passcode } from '@/types/passcode'
import { utf8Encode, utf8Decode } from './codec'
// RN 端会通过同名文件 random.rn.ts / pbkdf2.rn.ts 走 react-native-quick-crypto 原生实现
import { randomBytes } from './random'
import { pbkdf2Sha256 } from './pbkdf2'

const SALT_LENGTH = 32
const KEY_LENGTH = 32
const GCM_NONCE_LENGTH = 12

/** 生成随机盐值 */
export async function generateSalt(): Promise<string> {
  return bytesToHex(await randomBytes(SALT_LENGTH))
}

/** 生成随机数据密钥 */
export async function generateDataKey(): Promise<Uint8Array> {
  return randomBytes(KEY_LENGTH)
}

/**
 * 生成口令密钥，算法：PBKDF2-HMAC-SHA256
 * @param passcode 输入的口令
 * @param salt 盐值
 * @param iterations 迭代次数
 * @returns 口令密钥
 */
export function generatePasscodeKey(passcode: string, salt: string, iterations: number): Uint8Array {
  const startTime = Date.now()
  console.log('generatePasscodeKey start')
  const saltBytes = hexToBytes(salt)
  const keyBytes = pbkdf2Sha256(passcode, saltBytes, iterations, KEY_LENGTH)
  console.log(`generatePasscodeKey end, cost ${Date.now() - startTime}ms`)
  return keyBytes
}

// ---- AES-256-GCM encryption ----

/**
 * 加密数据密钥
 * @param passcodeKey 口令密钥
 * @param dataKey 数据密钥
 * @returns 加密的数据密钥
 */
export async function encryptDataKey(passcodeKey: Uint8Array, dataKey: Uint8Array): Promise<string> {
  const nonce = await randomBytes(GCM_NONCE_LENGTH)
  const aes = gcm(passcodeKey, nonce)
  const ciphertext = aes.encrypt(dataKey)
  const result = new Uint8Array(GCM_NONCE_LENGTH + ciphertext.length)
  result.set(nonce, 0)
  result.set(ciphertext, GCM_NONCE_LENGTH)
  return bytesToHex(result)
}

/**
 * 使用输入的口令解密数据密钥，可以验证口令是否正确
 * @param input 输入的口令
 * @param passcode 存储的KDF算法参数，如盐值、迭代次数，以及经 AES-256-GCM 加密的数据密钥（EDK）
 * @returns 成功则返回解密出的数据密钥，否则返回 null
 */
export function decryptDataKey(input: string, passcode: Passcode): Uint8Array | null {
  // 验证 passcode 是否正确
  const passcodeKey = generatePasscodeKey(input, passcode.salt, passcode.iterations)
  try {
    const ciphertext = hexToBytes(passcode.edk)
    const nonce = ciphertext.slice(0, GCM_NONCE_LENGTH)
    const data = ciphertext.slice(GCM_NONCE_LENGTH)

    const aes = gcm(passcodeKey, nonce)
    const dataKey = aes.decrypt(data)
    return dataKey
  } catch (err) {
    console.info('AES-256-GCM 解密失败:', err)
    return null
  }
}

export function clearDataKey() {
  GLOBAL_DATA.dataKey = null
}

/** AES-256-GCM 加密，返回 base64 字符串（含 nonce） */
export async function aesGcmEncrypt(value: string, aesKey: Uint8Array | null = GLOBAL_DATA.dataKey): Promise<string | null> {
  if (!aesKey) throw new Error('AES key not set')

  try {
    const nonce = await randomBytes(GCM_NONCE_LENGTH)
    const data = utf8Encode(value)
    const aes = gcm(aesKey, nonce)
    const ciphertext = aes.encrypt(data)
    // GCM输出格式：密文(含tag) | noble-ciphers自动附加16字节tag
    const result = new Uint8Array(GCM_NONCE_LENGTH + ciphertext.length)
    result.set(nonce, 0)
    result.set(ciphertext, GCM_NONCE_LENGTH)
    return base64.encode(result)
  } catch (err) {
    console.error('AES-256-GCM 加密失败:', err)
    return null
  }
}

/** AES-256-GCM 解密，输入 base64 字符串（含 nonce） */
export function aesGcmDecrypt(encrypted: string, aesKey: Uint8Array | null = GLOBAL_DATA.dataKey): string | null {
  if (!aesKey) throw new Error('AES key not set')
  try {
    const ciphertext = base64.decode(encrypted)
    const nonce = ciphertext.slice(0, GCM_NONCE_LENGTH)
    const data = ciphertext.slice(GCM_NONCE_LENGTH)

    const aes = gcm(aesKey, nonce)
    const plaintext = aes.decrypt(data)
    return utf8Decode(plaintext)
  } catch (err) {
    console.error('AES-256-GCM 解密失败:', err)
    return null
  }
}
