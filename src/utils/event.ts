/**
 * 阻止事件冒泡。
 * 微信小程序 / H5 端事件对象带有 stopPropagation 方法；
 * RN 端合成的事件对象没有该方法，但 RN 的 responder 机制本身只会触发最内层视图的
 * onClick（不会冒泡到父级），因此 RN 端此处为空操作即可。
 */
export function stopPropagation(e?: { stopPropagation?: () => void }): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation()
  }
}