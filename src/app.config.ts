export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/edit/index",
    "pages/about/index",
    "pages/settings/index",
  ],
  // 开启小程序暗色模式，使 WXSS 中的 @media (prefers-color-scheme: dark) 生效
  darkmode: true,
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "WeChat",
    navigationBarTextStyle: "black",
  },
})
