// RN 端：PBKDF2-HMAC-SHA256 走原生实现 react-native-quick-crypto，
// 避免纯 JS 实现在 Hermes 引擎上计算 20 万次迭代导致长时间卡顿
// 注意：低版本包的 pbkdf2Sync 只挂在默认导出对象上，类型声明未命名具名导出
import quickCrypto from 'react-native-quick-crypto'

// RN 端默认迭代次数 200000
export const KDF_ITERATIONS = 200000

/**
 * 生成口令密钥，算法：PBKDF2-HMAC-SHA256
 * @param password 口令
 * @param salt 盐值（字节）
 * @param iterations 迭代次数
 * @param dkLen 派生密钥长度（字节）
 */
export function pbkdf2Sha256(password: string, salt: Uint8Array, iterations: number, dkLen: number): Uint8Array {
  const key = quickCrypto.pbkdf2Sync(password, salt, iterations, dkLen, 'sha256')
  return new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
}
