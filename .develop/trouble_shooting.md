## 案例1

### 报错信息

```
<TypeError: MiniProgramError
taroModuleMap[module] is not a function>
TypeError: taroModuleMap[module] is not a function
```

### 问题分析与修复总结

* 根因

错误 `TypeError: taroModuleMap[module] is not a function` 是由于 `node_modules/.taro` **目录中的预构建缓存文件过期** 导致的。

Taro 框架在构建微信小程序时，会将共享模块预构建到 `node_modules/.taro/weapp/` 目录下，其中包含两个关键文件：

- `remoteEntry.js` — 定义 `taroModuleMap`，存储模块名到加载函数的映射
- `runtime.js` — 定义 `idToExternalAndNameMapping`，存储外部模块 ID 到 `taroModuleMap` 键名的映射

当 `runtime.js` 中的代码执行 `taroGet(mappedName)` 时，`mappedName` 通过 `idToExternalAndNameMapping` 获取，如果这个映射与 `taroModuleMap` 中的键名不一致，就会导致 `taroModuleMap[module]` 返回 `undefined`，进而抛出 "is not a function" 错误。

* 修复操作

清理了过期的 `.taro` 缓存目录：删除了 `node_modules/.taro` 目录。

## 案例2

### 报错信息

```
ERROR  The action 'PUSH' with payload {"name":"pagesAboutIndex","params":{}} was not handled by any navigator.

Do you have a screen '/pages/about/index'?
```

### 问题分析与修复总结

根因：Taro RN 的入口 `node_modules/@tarojs/rn-supporter/entry-file.js` 是恒为空文件，`generateEntry` 是在 Metro transform 时实时读取 `app.config` 生成 `pageList` 的。Metro 的 transform 缓存以文件内容为 key，空文件内容从未变化，导致缓存命中了旧 transform（只有 index 一个页面）。所以即使代码里 `app.config` 已包含 about 页（该模块内容变了、缓存失效、配置显示正常），生成的 `pageList` 仍是旧的。

修复：清空 Metro 缓存重建 — npm run build:rn -- --reset-cache。

验证：index.android.bundle 已包含 pagesAboutIndex 与 ic_launcher_round。

注意：以后每次新增页面，RN 端都需用 --reset-cache 重新构建，否则会命中这个陈旧缓存。

## 案例3

### 报错信息

```
TypeError: e.stopPropagation is not a function (it is undefined), js engine: hermes
```

### 问题分析与修复总结

根因：RN 端 Taro 通过 `getWxAppEvent` 合成点击事件对象（`node_modules/@tarojs/components-rn/dist/components/hooks/useClickable.js`），该对象**没有** `stopPropagation` 方法，调用即抛 `TypeError`。且 RN 的 responder 机制只会触发最内层视图的 `onClick`（不会冒泡到父级），所以 RN 端其实不需要阻止冒泡。
修复：新增跨端工具 `src/utils/event.ts`，用可选调用保护，微信/H5 端保持原行为，RN 端安全空操作：

```typescript
export function stopPropagation(e?: { stopPropagation?: () => void }): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation()
  }
}
```

替换全部调用 `e.stopPropagation()` 的组件：`stopPropagation(e)` 。
