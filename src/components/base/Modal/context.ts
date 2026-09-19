import { createContext } from 'react'

/**
 * 由 base Modal 提供：Modal 内部的输入框在聚焦 / 失焦 / 键盘高度变化时，
 * 通过它上报键盘高度（px），供弹窗避让输入法。
 *
 * 值为 null 表示当前输入框不在 Modal 内（如普通页面），无需上报。
 *
 * 之所以由输入框主动上报，而不只监听全局 Taro/wx.onKeyboardHeightChange：
 * 全局 API 依赖 Taro 启动时从 wx 代理生成，存在不可用的情况；而 input 自身的
 * focus / keyboardheightchange 事件会稳定携带键盘高度，最可靠。
 */
export type KeyboardHeightSource = 'global' | 'focus' | 'keyboardchange'

export type ReportKeyboardHeight = (height: number, source?: KeyboardHeightSource) => void

export const ModalKeyboardContext = createContext<ReportKeyboardHeight | null>(null)

/**
 * 由 base Modal 提供：Modal 内的输入框聚焦时上报自身 id。
 * Modal 会在键盘弹出、弹窗高度收缩后把该输入框滚动到可视区域，
 * 避免位于表单底部、被收缩后的 body 裁掉的输入框不可见。
 */
export type ReportInputFocus = (id: string) => void

export const ModalInputFocusContext = createContext<ReportInputFocus | null>(null)
