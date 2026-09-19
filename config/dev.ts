import type { UserConfigExport } from "@tarojs/cli";
export default {
   logger: {
    quiet: false,
    stats: true
  },
  mini: {
    // 强制使用生产版（压缩后）React，避免 watch 模式默认引入体积巨大的开发版 React，
    // 使代码包接近/超过微信小程序主包 2MB 上限，预览/上传时报 80051。
    debugReact: false,
  },
  h5: {}
} satisfies UserConfigExport<'webpack5'>
