const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const path = require('path')

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = (async function () {
  const defaultConfig = getDefaultConfig(__dirname)
  const taroConfig = await getMetroConfig()

  // 保留 rn-supporter 的 resolveRequest（处理 .rn.ts 后缀、entry-file 等）
  const taroResolveRequest = taroConfig.resolver && taroConfig.resolver.resolveRequest

  const aliasConfig = {
    resolver: {
      resolveRequest(context, moduleName, platform) {
        // 处理 @/ 别名 → src/，转为绝对路径后交给 rn-supporter 解析扩展名
        if (moduleName.startsWith('@/')) {
          const absPath = path.resolve(__dirname, 'src', moduleName.slice(2))
          if (taroResolveRequest) {
            return taroResolveRequest(context, absPath, platform)
          }
          return context.resolveRequest(context, absPath, platform)
        }
        // 其余交给 rn-supporter 的 resolver
        if (taroResolveRequest) {
          return taroResolveRequest(context, moduleName, platform)
        }
        return context.resolveRequest(context, moduleName, platform)
      },
    },
  }

  return mergeConfig(defaultConfig, taroConfig, aliasConfig)
})()
