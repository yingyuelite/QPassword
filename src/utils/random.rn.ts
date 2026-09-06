// RN 端：使用 react-native-quick-crypto 的原生加密随机数，
// 替代 app.ts 中 Math.sin 种子的弱随机 polyfill 与纯 JS 随机数
// 注意：低版本包的 randomBytes 只挂在默认导出对象上，类型声明未提供具名导出
import quickCrypto from 'react-native-quick-crypto'

/** 生成 size 字节长度的安全随机数 */
export async function randomBytes(size: number): Promise<Uint8Array> {
  const buf = quickCrypto.randomBytes(size)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}
