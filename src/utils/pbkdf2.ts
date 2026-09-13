// 非 RN 端（微信小程序等）：PBKDF2-HMAC-SHA256
// 默认使用 @noble/hashes 纯 JS 实现兜底；
// 微信小程序端若支持 WXWebAssembly（基础库 >= 2.13），则优先用编译好的 pbkdf2.wasm，
// 因为 iOS 小程序运行在 JavaScriptCore 上，纯 JS 的 PBKDF2 计算很慢，
// WASM 相比纯 JS 有数倍到数十倍的提升。
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8Encode } from './codec'

// 小程序端默认迭代次数 20000
export const KDF_ITERATIONS = 20000

// 代码包内的 wasm 路径，与 config/index.ts 中 mini.webpackChain 的 copy 目标保持一致，
// 即输出根目录下的 wasm/pbkdf2.wasm（源码和编译脚本位于项目根 wasm/ 目录）
const WASM_PATH = '/wasm/pbkdf2.wasm'
// 密码、盐、输出的写址偏移。wasm 模块的 SHA-256 K 常量位于高地址（约 1MB 处），
// 不能全内存清零覆盖它，因此只使用低地址的一个干净区域。
const PW_OFFSET = 0
const SALT_OFFSET = 64 * 1024
const OUT_OFFSET = 128 * 1024

/** wasm 导出的函数签名 */
interface Pbkdf2WasmExports {
  memory: WebAssembly.Memory
  pbkdf2_sha256: (
    pwPtr: number, pwLen: number,
    saltPtr: number, saltLen: number,
    rounds: number, dkLen: number,
    dkPtr: number,
  ) => void
}

let wasmInstance: WebAssembly.Instance | null = null
let wasmLoading: Promise<WebAssembly.Instance | null> | null = null

/** 使用 WXWebAssembly 加载并实例化代码包内的 pbkdf2.wasm，失败时返回 null */
function loadWasm(): Promise<WebAssembly.Instance | null> {
  if (wasmInstance) return Promise.resolve(wasmInstance)
  if (wasmLoading) return wasmLoading
  // @ts-ignore 微信小程序专有全局对象
  const WXWebAssembly = typeof globalThis !== 'undefined' ? globalThis.WXWebAssembly : undefined
  const instantiate = WXWebAssembly && WXWebAssembly.instantiate
  if (typeof instantiate !== 'function') return Promise.resolve(null)
  wasmLoading = instantiate(WASM_PATH, {})
    .then((res: { instance?: WebAssembly.Instance }) => {
      wasmInstance = (res && res.instance) || null
      return wasmInstance
    })
    .catch((err) => {
      console.warn('[pbkdf2] WXWebAssembly instantiate failed, fallback to JS:', err)
      wasmInstance = null
      return null
    })
  console.log('[pbkdf2] wasm loading: done')
  return wasmLoading!
}

/** 小程序启动时预热加载 wasm，避免用户首次解锁时还没加载完成而走纯 JS 慢路径 */
export function preloadPbkdf2Wasm(): Promise<void> {
  return loadWasm().then(() => {})
}

function pbkdf2WithWasm(pwBytes: Uint8Array, salt: Uint8Array, iterations: number, dkLen: number): Uint8Array | null {
  if (!wasmInstance) return null
  try {
    const exports = wasmInstance.exports as unknown as Pbkdf2WasmExports
    const memory = new Uint8Array(exports.memory.buffer)
    memory.set(pwBytes, PW_OFFSET)
    memory.set(salt, SALT_OFFSET)
    exports.pbkdf2_sha256(PW_OFFSET, pwBytes.length, SALT_OFFSET, salt.length, iterations, dkLen, OUT_OFFSET)
    return memory.slice(OUT_OFFSET, OUT_OFFSET + dkLen)
  } catch (err) {
    console.warn('[pbkdf2] wasm pbkdf2_sha256 failed, fallback to JS:', err)
    wasmInstance = null
    return null
  }
}

/**
 * 生成口令密钥，算法：PBKDF2-HMAC-SHA256
 * @param passcode 口令
 * @param salt 盐值（字节）
 * @param iterations 迭代次数
 * @param dkLen 派生密钥长度（字节）
 */
export function pbkdf2Sha256(passcode: string, salt: Uint8Array, iterations: number, dkLen: number): Uint8Array {
  // 先统一编码为 UTF-8 字节，保证 wasm 与纯 JS 两条路径的输入完全一致
  const pwBytes = utf8Encode(passcode)
  // 优先使用 WASM（若已加载成功）；否则走 @noble 纯 JS 实现，保证任意环境可用
  const wasmResult = pbkdf2WithWasm(pwBytes, salt, iterations, dkLen)
  if (wasmResult) return wasmResult
  // 直接传字节而非字符串，避免库内部再次依赖全局 TextEncoder（微信小程序真机 production 构建尤其不稳定）
  return pbkdf2(sha256, pwBytes, salt, { c: iterations, dkLen })
}
