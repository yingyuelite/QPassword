import { Passcode } from './passcode'
import { Password } from './password'

export const CURRENT_VERSION = 2

/** 数据备份/导出结构 */
export interface Backup {
  /** 数据备份版本 */
  version: number
  /** 数据更新时间戳（毫秒） */
  time: number
  /** 口令，null 表示以明文形式导出 */
  passcode: Passcode | null
  /** 密码列表 */
  passwords: Password[] | string
}

/** 数据备份结构默认值 */
export const defaultBackup: Backup = {
  version: CURRENT_VERSION,
  time: Date.now(),
  passcode: null,
  passwords: [],
}

/** 备份元数据（同步写入 WebDAV 服务器） */
export interface BackupMeta {
  /** 备份时间戳（毫秒） */
  time: number
  /** 备份的密码条数 */
  count: number
}
