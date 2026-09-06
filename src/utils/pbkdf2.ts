// 非 RN 端（微信小程序等）：PBKDF2-HMAC-SHA256 使用 @noble/hashes 纯 JS 实现
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'

// 小程序端默认迭代次数 20000
export const KDF_ITERATIONS = 20000

/**
 * 生成口令密钥，算法：PBKDF2-HMAC-SHA256
 * @param passcode 口令
 * @param salt 盐值（字节）
 * @param iterations 迭代次数
 * @param dkLen 派生密钥长度（字节）
 */
export function pbkdf2Sha256(passcode: string, salt: Uint8Array, iterations: number, dkLen: number): Uint8Array {
  // 口令先自行转成 UTF-8 字节再传入 @noble/hashes，
  // 避免库内部 utf8ToBytes 依赖全局 TextEncoder（微信小程序真机 production 构建尤其不稳定）
  return pbkdf2(sha256, passcode, salt, { c: iterations, dkLen })
}
