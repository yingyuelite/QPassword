export default definePageConfig({
  navigationBarTitleText: '关于',
  // RN 需要配置 disableScroll，禁用 taro 中的隐式 ScrollView
  disableScroll: process.env.TARO_ENV === 'rn',
})
