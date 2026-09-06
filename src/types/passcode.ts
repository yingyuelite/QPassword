/** 口令类型 */
export type PasscodeType = 'pattern' | 'text'

export interface Passcode {
  /** 口令类型 */
  type: PasscodeType
  /** 盐值 */
  salt: string
  /** 迭代次数 */
  iterations: number
  /** 加密的数据密钥 */
  edk: string
}
