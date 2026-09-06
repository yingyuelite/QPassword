export default definePageConfig({
  navigationBarTitleText: '更改口令',
  // RN 需要配置 disableScroll，禁用 taro 中的隐式 ScrollView，
  // 同时防止手势绘制图案时触发页面滚动。
  disableScroll: process.env.TARO_ENV === 'rn',
})
