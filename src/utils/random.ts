import Taro from '@tarojs/taro'

/** 生成 size 字节长度的安全随机数 */
export async function randomBytes(size: number): Promise<Uint8Array> {
  const res = await Taro.getRandomValues({ length: size })
  return new Uint8Array(res.randomValues)
}