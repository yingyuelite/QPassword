// @taro-hooks/core is an alias that @taro-hooks/plugin-react sets up for
// webpack/vite but NOT for metro (RN). This physical package bridges the gap.
module.exports = require('@taro-hooks/plugin-react/dist/runtime');
