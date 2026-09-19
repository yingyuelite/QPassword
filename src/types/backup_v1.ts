export interface PasswordV1 {
  /** ID */
  id: number
  /** 创建时间 */
  createDate: number
  /** 标题 */
  title: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 关联邮箱 */
  email: string
  /** 是否置顶 */
  top: boolean
  /** 备注 */
  note: string
  /** 分组名称 */
  groupName: string
}

export interface BackupV1 {
  /** 是否加密 */
  encrypted: boolean
  /** 主密码的 SHA1 值 */
  key: string
  /** 是否图案密码 */
  pattern: boolean
  /** 密码列表 */
  passwords: PasswordV1[]
}
