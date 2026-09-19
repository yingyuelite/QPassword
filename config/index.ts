import path from 'path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'QPassword',
    date: '2026-7-5',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: `dist/${process.env.TARO_ENV}-${mode}`,
    plugins: [
       '@taro-hooks/plugin-react'
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: {
        // watch/开发模式默认开启预打包（prebundle），会把 react-dom 等依赖作为未压缩的
        // 独立 chunk 产出（约 1MB），叠加后使主包超过微信 2MB 上限。关闭后依赖会并入
        // 主构建并被压缩，体积显著减小（代价是 watch 首次/增量构建略慢）。
        enable: false,
        exclude: ['react-native'],
      },
    },
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    mini: {
      compile: {
        // 将 @noble/* 等现代 crypto 库纳入 babel 转译。
        // 这些库发布于 ES2022(含 class fields 等语法)，小程序端 JS 引擎无法直接解析，
        // 而 Taro 默认只转译 src 与 taro 相关依赖，因此需要显式包含以避免上传报
        // "invalid file: vendors.js Unexpected token ="
        include: [
          path.resolve(__dirname, '../node_modules/@noble'),
          path.resolve(__dirname, '../node_modules/@scure'),
        ],
      },
      // 不同页面组件引入 Button/PatternLock 等 .scss 的先后顺序不同，
      // 且 .scss 之间无同名选择器覆盖，顺序不影响最终样式。
      // 与 h5 端一致，忽略该警告以保持构建输出干净。
      miniCssExtractPluginOption: {
        ignoreOrder: true,
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
        // watch/开发构建默认不压缩且 nodeEnv=development，会把 React 开发版并保留大量
        // 未压缩代码打进主包，导致超过微信 2MB 上限。强制 production + 开启压缩，显著减小体积。
        // chain.optimization.nodeEnv('production')
        chain.optimization.minimize(true)
        // 小程序端不使用 react-native，将其指向空模块以避免 Flow 语法报错
        chain.resolve.alias.set('react-native', path.resolve(__dirname, 'empty-module.js'))
        // 将 wasm/pbkdf2.wasm 复制到小程序代码包（输出根目录）的 wasm/ 下，
        // 供 WXWebAssembly.instantiate 按代码包路径加载（见 src/utils/pbkdf2.ts）。
        // copy 配置的 to 会被 Taro 解析为相对于项目根目录的绝对路径，无法落到随 mode 变化的输出根目录，
        // 因此这里用 webpackChain 直接加 CopyPlugin，to 用相对路径会以编译器的 output.path（输出根）为基准。
        // filter 确保只复制 .wasm 产物，wasm/src 源码、测试、文档不会进入代码包。
        const CopyWebpackPlugin = require('copy-webpack-plugin')
        chain.plugin('copy-qp-wasm').use(CopyWebpackPlugin, [{
          patterns: [{
            from: path.resolve(__dirname, '../wasm'),
            to: 'wasm',
            filter: (resourcePath: string) => resourcePath.endsWith('pbkdf2.wasm'),
          }],
        }])
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
        // H5 端不使用 react-native，将其指向空模块以避免 Flow 语法报错
        chain.resolve.alias.set('react-native', path.resolve(__dirname, 'empty-module.js'))
      }
    },
    rn: {
      appName: 'QPassword',
      entry: 'app',
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      output: {
        ios: './ios/main.jsbundle',
        iosAssetsDest: './ios',
        android: './android/app/src/main/assets/index.android.bundle',
        androidAssetsDest: './android/app/src/main/res',
        // iosSourceMapUrl: '',
        iosSourcemapOutput: './ios/main.map',
        // iosSourcemapSourcesRoot: '',
        // androidSourceMapUrl: '',
        androidSourcemapOutput: './android/app/src/main/assets/index.android.map',
        // androidSourcemapSourcesRoot: '',
      },
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }
  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
