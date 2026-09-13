# PBKDF2-HMAC-SHA256 WASM

iOS 微信小程序运行在 JavaScriptCore（JSC）引擎上，纯 JS 实现的 PBKDF2 计算非常慢（20000 轮迭代可达秒级）。
本目录提供了一份零依赖的 WebAssembly 实现（~16KB），在 iOS JSC 上相比 `@noble/hashes` 纯 JS 方案有 **数倍到数十倍** 的性能提升。

小程序端启动时自动预加载 wasm，验证口令时优先走 wasm 快路径；若设备不支持或加载失败，自动降级为纯 JS，功能不受影响。

## 目录结构

```
wasm/
├── README.md           # 本文件
├── build.sh            # 编译脚本（自动探测 zig / clang）
├── pbkdf2.wasm         # 已编译的产物（可直接使用）
├── src/                # C 源码
│   ├── main.c          # wasm 入口导出包装
│   ├── pbkdf2_sha256.c # PBKDF2-HMAC-SHA256 实现（来自 TransparentLC/wasm-pbkdf2-sha256）
│   ├── pbkdf2_sha256.h
│   ├── memcpy.c        # freestanding memcpy（无 libc）
│   ├── memset.c        # freestanding memset
│   └── emscripten-exports.h  # 兼容宏（在非 Emscripten 环境下 EMSCRIPTEN_KEEPALIVE 展开为空）
├── shim/
│   └── string.h        # 提供 memcpy/memset/memcmp 声明（-nostdinc 时无标准 string.h）
└── test/
    └── pbkdf2.test.mjs # Node.js 交叉验证测试（RFC 7914 向量 + 与 Node crypto 比对）
```

## 编译

### 前置要求（任选其一）

| 编译器 | 说明 | 最低版本 |
|-------|------|---------|
| **zig**（推荐） | 单文件二进制，无需安装 libc，无需 root | 0.12+ |
| **clang** | 通常自带 `wasm32` target 和 `lld` 链接器 | LLVM 14+ |
| **emcc**（Emscripten） | 需配合 `STANDALONE_WASM` 标志，产物可能略大且可能带多余导入 | 见下方说明 |

### 一键编译（推荐）

```bash
# 自动探测 zig 或 clang，输出 pbkdf2.wasm 到当前目录
./wasm/build.sh

# 指定编译器
CC=zig   ./wasm/build.sh
CC=clang ./wasm/build.sh
```

编译成功后会自动运行 `node wasm/test/pbkdf2.test.mjs`，将输出 12 项测试结果；全 PASS 即表示产物可用。

### 手动编译（zig）

```bash
zig cc --target=wasm32-freestanding \
  -O3 -flto -nostdlib -nostdinc -I wasm/shim \
  -Wl,--no-entry -Wl,--export-memory \
  -o wasm/pbkdf2.wasm \
  wasm/src/pbkdf2_sha256.c wasm/src/memcpy.c wasm/src/memset.c wasm/src/main.c
```

### 手动编译（clang）

```bash
clang --target=wasm32-unknown-unknown \
  -O3 -flto -nostdlib -nostdinc -I wasm/shim \
  -Wl,--no-entry -Wl,--export-memory -fuse-ld=lld \
  -o wasm/pbkdf2.wasm \
  wasm/src/pbkdf2_sha256.c wasm/src/memcpy.c wasm/src/memset.c wasm/src/main.c
```

### Emscripten 备注

emcc 默认会注入 `env.*` 导入（如 `env.__wasm_call_ctors`）。小程序端 `WXWebAssembly.instantiate` 传入空的 imports，若 emcc 产物引入了外部导入会导致实例化失败。使用 `STANDALONE_WASM` 模式：

```bash
emcc -O3 -nostdlib -nostdinc -I wasm/shim \
  -sSTANDALONE_WASM -sEXPORTED_FUNCTIONS=_pbkdf2_sha256 \
  -o wasm/pbkdf2.wasm \
  wasm/src/pbkdf2_sha256.c wasm/src/memcpy.c wasm/src/memset.c wasm/src/main.c
```

务必运行测试确认无多余导入：若 `node wasm/test/pbkdf2.test.mjs` 报 "missing pbkdf2_sha256 export"，需检查 `-sEXPORTED_FUNCTIONS` 是否正确。

## 产物约束

为了让 `WXWebAssembly.instantiate(path, {})` 成功（imports 为空），wasm 模块必须满足：

1. **零 import**：不得导入任何外部函数（无 `env.*`）
2. **必须导出**：
   - `memory`（线性内存，17 页 = 1,114,112 字节）
   - `pbkdf2_sha256`（函数，签名见下方）
3. **内存布局**：
   - 低地址区供调用方读写：`pw` 在 `[0, ...)`, `salt` 在 `[65536, ...)`, `dk` 在 `[131072, ...)`
   - 高地址区存放数据段（K 常量表等）：约从偏移 `1048576` 开始
   - **绝对不能对整个 `memory` 执行 `mem.fill(0)` 或类似操作**，否则会破坏数据段导致计算结果错误
4. **函数签名**（线性内存偏移）：
   ```
   void pbkdf2_sha256(
     pw: i32, pwLen: i32,
     salt: i32, saltLen: i32,
     rounds: i32, dkLen: i32,
     dk: i32
   ): void
   ```

## 在应用中的接入方式

| 层级 | 文件 | 说明 |
|------|------|------|
| WASM loader + JS 降级 | `src/utils/pbkdf2.ts` | 模块加载期预加载 wasm；调用时优先走 WASM，失败降级 `@noble/hashes` |
| RN 端（独立实现） | `src/utils/pbkdf2.rn.ts` | 使用 `react-native-quick-crypto`，与本 wasm 无关 |
| 小程序代码包复制 | `config/index.ts` | `mini.webpackChain` 中用 CopyPlugin + filter 仅复制 `pbkdf2.wasm` |
| 启动预加载 | `src/app.ts` | `process.env.TARO_ENV === 'weapp'` 时调用 `preloadPbkdf2Wasm()` |

### 兼容性要求

- 微信客户端 ≥ **8.0.49**（原生 WASM 优化）
- 基础库 ≥ **2.13**（`WXWebAssembly` 全局对象存在）

不满足时 `WXWebAssembly.instantiate` 调用会被跳过或抛出异常，`pbkdf2.ts` 会捕获并自动走纯 JS 降级路径。

## 测试

```bash
# 直接运行（默认测试 wasm/pbkdf2.wasm）
node wasm/test/pbkdf2.test.mjs

# 指定其他 wasm 文件
node wasm/test/pbkdf2.test.mjs path/to/custom.wasm
```

测试覆盖：
1. **RFC 7914 §11 标准向量**（c=1/2/4096）
2. **与 Node 内置 `crypto.pbkdf2Sync` 随机交叉验证**（不同长度口令含中文/emoji、不同盐、20000 轮、dkLen 32/64）
3. **高位内存保护**：调用前后 K 常量表区域字节保持一致
4. **连续调用一致性**：同一 wasm 实例多次调用结果完全相同

## 参考

- [TransparentLC/wasm-pbkdf2-sha256](https://github.com/TransparentLC/wasm-pbkdf2-sha256) — 原始 C 实现
- [RFC 7914](https://datatracker.ietf.org/doc/html/rfc7914) — PBKDF2-HMAC-SHA256 定义及测试向量
- [微信小程序 WebAssembly 文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/bytecode.html)