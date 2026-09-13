#!/usr/bin/env bash
# 编译 wasm/src/*.c 为小程序可用的 pbkdf2.wasm。
#
# 前置要求（任选其一）：
#   1. zig（推荐）：https://ziglang.org/ 下载对应平台单文件二进制即可，无需 root、无需 libc
#   2. clang + wasm32 支持（通常一并自带 lld，如 Homebrew llvm、apt llvm）
#   3. emcc（Emscripten）备用，见 README.md
#
# 产物约束（供小程序端 WXWebAssembly 使用）：
#   - 运行时零依赖：不得 import 任何外部函数（imports 为空）
#   - 必须导出 memory 和 pbkdf2_sha256 两个符号
#   - freestanding 编译（-nostdlib -nostdinc），stdint/stddef 取自编译器自带头，
#     string.h 使用本目录 shim/string.h 的声明（memcpy/memset 自实现）
#
# 用法：
#   ./wasm/build.sh            # 自动探测编译器并输出到 wasm/pbkdf2.wasm
#   CC=zig   ./wasm/build.sh   # 指定编译器
#   CC=clang ./wasm/build.sh
#   CC=emcc  ./wasm/build.sh
set -euo pipefail

cd "$(dirname "$0")"           # 脚本所在目录（wasm/）

SYSTEM_SRC=(src/pbkdf2_sha256.c src/memcpy.c src/memset.c src/main.c)
OUT=pbkdf2.wasm

SRCFLAGS="-O3 -nostdlib -nostdinc -I shim"

detect_compiler() {
  if [ -n "${CC:-}" ]; then
    echo "$CC"
    return
  fi
  if command -v zig >/dev/null 2>&1; then
    echo "zig"
  elif command -v clang >/dev/null 2>&1; then
    echo "clang"
  else
    echo ""
  fi
}

build_with_zig() {
  local zig="${CC:-zig}"
  "$zig" cc --target=wasm32-freestanding $SRCFLAGS -flto \
    -Wl,--no-entry -Wl,--export-memory \
    -o "$OUT" "${SYSTEM_SRC[@]}"
}

build_with_clang() {
  local clang="${CC:-clang}"
  "$clang" --target=wasm32-unknown-unknown $SRCFLAGS -flto \
    -Wl,--no-entry -Wl,--export-memory -fuse-ld=lld \
    -o "$OUT" "${SYSTEM_SRC[@]}"
}

build_with_emcc() {
  local emcc="${CC:-emcc}"
  # 生成无 JS 胶水、无多余导入的裸 wasm。
  # 注意：若最终产物出现 env.* 导入或缺少 memory 导出，加载时需相应调整
  # （小程序端 WXWebAssembly.instantiate 传空的 imports，见 src/utils/pbkdf2.ts）。
  "$emcc" $SRCFLAGS -sSTANDALONE_WASM -sEXPORTED_FUNCTIONS=_pbkdf2_sha256 \
    -o "$OUT" "${SYSTEM_SRC[@]}"
}

COMPILER="$(detect_compiler)"
if [ -z "$COMPILER" ]; then
  echo "错误：未找到 zig / clang。请安装任一编译器后重试（或 export CC=... 指定）。" >&2
  exit 1
fi

case "$COMPILER" in
  zig)   build_with_zig ;;
  clang) build_with_clang ;;
  emcc)  build_with_emcc ;;
  *)
    echo "错误：不支持的编译器 '$COMPILER'（可选 zig / clang / emcc）" >&2
    exit 1
    ;;
esac

# 编译后做一次冒烟检查：确认无 import、导出正确、结果与 Node 内置 crypto 一致
echo "编译完成: $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, compiler=$COMPILER)"

# 编译后做一次冒烟检查：确认无 import、导出正确、结果与 Node 内置 crypto 一致
if command -v node >/dev/null 2>&1 && [ -f test/pbkdf2.test.mjs ]; then
  echo
  echo "运行交叉验证测试..."
  node test/pbkdf2.test.mjs
fi