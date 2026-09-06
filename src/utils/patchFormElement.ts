import { FormElement, TaroElement } from '@tarojs/runtime'

// 微信小程序端（Taro weapp 运行时）在每次 input 事件里都会在
// FormElement.dispatchEvent 中无条件执行 this.value = val（@tarojs/runtime/dist/dom/form.js），
// 对输入框的 value 路径发起一次 setData 回写，与 React 受控渲染的 value setData 一起，
// 构成"每次按键一次异步 value 回写"。当输入/删除速度快于该 setData 往返时，
// 旧值回写会覆盖更新敲入的字，表现为"极快输入丢字、按住删除时被删的字回弹"。
//
// 这里移除该强制回写：输入过程中不再有任何 value 的 setData，输入框展示完全交给
// 原生输入框自身维护（非受控），提交值在失焦/确认/保存时通过事件 detail 读取。
// 受控输入框（value + onInput + setState）的展示仍由 React 渲染负责，不受影响。
//
// 通过 document.createElement 拿到运行时真实的 FormElement 原型进行覆盖，
// 避免因打包重复实例导致补丁失效。
const PATCH_FLAG = '__qpassword_form_element_value_patched__'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formProto: any = (FormElement as any)?.prototype
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const taroProto: any = (TaroElement as any)?.prototype

if (formProto && taroProto && !formProto[PATCH_FLAG]) {
  const originalDispatchEvent: any = formProto.dispatchEvent
  formProto.dispatchEvent = function (this: any, event: any) {
    // input 事件：跳过 this.value = val 的 setData 回写，仅派发给事件监听器
    if (event && event.mpEvent && event.type === 'input') {
      return taroProto.dispatchEvent.call(this, event)
    }
    // 其余事件（change/focus/blur/confirm 等）保持原行为
    return originalDispatchEvent.call(this, event)
  }
  formProto[PATCH_FLAG] = true
}

export default {}
