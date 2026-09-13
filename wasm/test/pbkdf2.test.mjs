// PBKDF2-HMAC-SHA256 wasm 交叉验证测试（Node.js，无第三方依赖）
//
// 用法：
//   node wasm/test/pbkdf2.test.mjs            # 默认测试 wasm/pbkdf2.wasm
//   node wasm/test/pbkdf2.test.mjs <path.wasm>
//
// 覆盖点：
//   1. RFC 7914 §11 标准测试向量（PBKDF2-HMAC-SHA256，c=1/2/4096）
//   2. 与 Node 内置 crypto.pbkdf2Sync 随机交叉验证
//      （不同长度口令（含中文/emoji）、不同 salt、20000 轮、dkLen 32/64）
//   3. wasm 内存布局约束检查：只使用低地址区，不触碰高位常量段（K 表 ~1MB）
//   4. 连续调用一致性：同一输入两次调用结果一致（无明显内部状态残留）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

// 与 src/utils/pbkdf2.ts 保持一致的线性内存布局
const PW_OFFSET = 0
const SALT_OFFSET = 64 * 1024
const OUT_OFFSET = 128 * 1024
// wasm 模块中 SHA-256 K 常量表所在的高位区域（数据段起点，即 __stack_pointer 初值）
const K_TABLE_OFFSET = 1048576

const wasmPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(dirname(fileURLToPath(import.meta.url)), '../pbkdf2.wasm')

const bytes = readFileSync(wasmPath)
const { module, instance } = await WebAssembly.instantiate(bytes, {})
const exports = instance.exports
const memory = new Uint8Array(exports.memory.buffer)

console.log(`加载: ${wasmPath} (${bytes.length} bytes)`)
console.log(`导出符号: ${Object.keys(exports).join(', ')}`)
console.log(`内存: ${exports.memory.buffer.byteLength} bytes`)

if (typeof exports.pbkdf2_sha256 !== 'function') {
  console.error('FAIL: 缺少 pbkdf2_sha256 导出')
  process.exit(1)
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str)
}

/** 调用 wasm 内的 pbkdf2_sha256（线性内存方式） */
function wasmPbkdf2(pwStr, saltBytes, rounds, dkLen) {
  const pw = utf8Bytes(pwStr)
  memory.set(pw, PW_OFFSET)
  memory.set(saltBytes, SALT_OFFSET)
  exports.pbkdf2_sha256(
    PW_OFFSET, pw.length,
    SALT_OFFSET, saltBytes.length,
    rounds, dkLen, OUT_OFFSET,
  )
  return memory.slice(OUT_OFFSET, OUT_OFFSET + dkLen)
}

const toHex = (u8) => Buffer.from(u8).toString('hex')

let pass = 0
let fail = 0

function check(name, actual, expected) {
  const act = toHex(actual)
  const exp = toHex(expected)
  if (act === exp) {
    pass++
    console.log(`  PASS ${name}`)
  } else {
    fail++
    console.error(`  FAIL ${name}`)
    console.error(`    expected: ${exp}`)
    console.error(`    actual:   ${act}`)
  }
}

// ---- 1. RFC 7914 §11 PBKDF2-HMAC-SHA256 标准向量 ----
console.log('\n[1] RFC 7914 标准测试向量')
const vectors = [
  { pw: 'password', salt: 'salt', c: 1, dkLen: 32, hex: '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b' },
  { pw: 'password', salt: 'salt', c: 2, dkLen: 32, hex: 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43' },
  { pw: 'password', salt: 'salt', c: 4096, dkLen: 32, hex: 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a' },
]
for (const v of vectors) {
  const actual = wasmPbkdf2(v.pw, utf8Bytes(v.salt), v.c, v.dkLen)
  check(`PBKDF2("${v.pw}", "${v.salt}", ${v.c}, ${v.dkLen})`, actual, Buffer.from(v.hex, 'hex'))
}

// ---- 2. 与 Node crypto 交叉验证 ----
console.log('\n[2] 与 Node crypto.pbkdf2Sync 交叉验证')
const rounds = 20000
const cases = [
  { pw: 'password', salt: randomBytes(32), dkLen: 32 },
  { pw: 'correct horse battery staple', salt: utf8Bytes('fixed-salt'), dkLen: 32 },
  { pw: 'pässwörd', salt: randomBytes(8), dkLen: 32 },
  { pw: '密码保护口令', salt: utf8Bytes('中文盐值'), dkLen: 32 },
  { pw: '🔐🍎混合emoji口令', salt: utf8Bytes('salt'), dkLen: 32 },
  { pw: 'x'.repeat(200), salt: randomBytes(32), dkLen: 64 },
  { pw: 'abc', salt: utf8Bytes('1234567890'), dkLen: 64 },
]
for (const c of cases) {
  const node = pbkdf2Sync(utf8Bytes(c.pw), c.salt, rounds, c.dkLen, 'sha256')
  const wasm = wasmPbkdf2(c.pw, c.salt, rounds, c.dkLen)
  check(`wasm==node (pw.len=${utf8Bytes(c.pw).length}, salt.len=${c.salt.length}, dkLen=${c.dkLen})`, wasm, node)
}

// ---- 3. 高位常量段保护检查 ----
console.log('\n[3] 高位内存（K 常量表）未被破坏')
// 先在"安全"位置做一次计算，随后再检查 K 表区域是否仍等于 sha256_init 之后的初值。
// K 表是编译器放入数据段的内容，此时应当仍为原样（未清零）。
// 取 64*4 字节覆盖 64 个 K 常量（big-endian），若有任意字节为 0xFF 全部重置也视为集体损坏的强信号：
// 更可靠的判据是：调用前后 K 表区域字节完全一致。
const kBefore = memory.slice(K_TABLE_OFFSET, K_TABLE_OFFSET + 256)
wasmPbkdf2('password', utf8Bytes('salt'), 20000, 32)
const kAfter = memory.slice(K_TABLE_OFFSET, K_TABLE_OFFSET + 256)
check('K 表区域调用前后一致', kAfter, kBefore)

// ---- 4. 连续调用一致性 ----
console.log('\n[4] 连续调用结果一致')
const salt = randomBytes(32)
const first = wasmPbkdf2('stable-input', salt, rounds, 32)
const second = wasmPbkdf2('stable-input', salt, rounds, 32)
check('两次相同输入结果一致', second, first)

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)