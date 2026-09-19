import { BackupV1, PasswordV1 } from '@/types/backup_v1'
import { Password, normalizePassword } from '@/types/password'

/**
 * 解析 v1 版本导出的备份文件（.qpwd，JSON），并把数据转换为 v2 的 Password 结构。
 *
 * 说明：
 * - 仅支持 v1 的「明文」导出（encrypted === false）；加密导出无法在 v2 中解密，直接报错提示。
 * - 字段映射：top→isTop、groupName→tags（作为单个标签），其余同名字段直接沿用；
 *   v2 新增字段（loginMethod/phone/weixin/website/icon）使用默认值。
 */
export function parseV1ImportFile(content: string): Password[] {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('文件格式不正确')
  }

  const data = raw as Partial<BackupV1> | null
  if (!data || typeof data !== 'object' || typeof data.encrypted !== 'boolean') {
    throw new Error('文件格式不正确，请确认是 v1 版本导出的 .qpwd 文件')
  }

  if (data.encrypted) {
    throw new Error('仅支持导入 v1 版本导出的明文密码，加密文件不支持')
  }

  if (!Array.isArray(data.passwords)) {
    throw new Error('文件格式不正确，请确认是 v1 版本导出的 .qpwd 文件')
  }

  return data.passwords.map((item) => convertV1Password(item))
}

/** 把单条 v1 密码转换为 v2 密码结构 */
function convertV1Password(v1: PasswordV1): Password {
  return normalizePassword({
    id: v1?.id,
    createDate: v1?.createDate,
    title: v1?.title,
    username: v1?.username,
    password: v1?.password,
    email: v1?.email,
    isTop: !!v1?.top,
    note: v1?.note,
    // v1 的「分组」在 v2 中以「标签」形式保存
    tags: v1?.groupName ? [v1.groupName] : [],
  })
}
