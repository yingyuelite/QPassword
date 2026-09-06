export default definePageConfig({
  navigationBarTitleText: '设置',
  // RN 需要配置 disableScroll，禁用 taro 中的隐式 ScrollView
  disableScroll: process.env.TARO_ENV === 'rn',
})