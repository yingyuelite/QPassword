// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      // 微信小程序必须开启
      compiler: 'webpack5',
    }],
  ],
  plugins: [
    [
      'import',
      {
        libraryName: 'taro-hooks',
        camel2DashComponentName: false
      },
      'taro-hooks',
    ],
    [
      'transform-define',
      {
        TARO_ENV: process.env.TARO_ENV,
        // 请注意：value 必须是 string
        __TARO_HOOKS_VUE__: JSON.stringify(false),
        __TARO_HOOKS_REACT__: JSON.stringify(true),
      }
    ],
  ],
}
