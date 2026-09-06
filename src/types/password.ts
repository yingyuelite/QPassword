import { DEFAULT_ICON } from "@/constants/passwordIcons"
import { isEqualArrays } from "@/utils/arrayutil"

/** 密码数据结构 */
export interface Password {
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
  /** 登录方式（如：手机验证码登录、微信登录、QQ登录 等，用户自由填写） */
  loginMethod: string
  /** 关联邮箱 */
  email: string
  /** 关联手机号 */
  phone: string
  /** 关联微信 */
  weixin: string
  /** 是否置顶 */
  isTop: boolean
  /** 备注 */
  note: string
  /** 网址 */
  website: string
  /** 标签 */
  tags: string[]
  /** 图标 */
  icon: string
}

/** 密码默认值 */
export const defaultPassword: Password = {
  id: 0,
  createDate: 0,
  title: '',
  username: '',
  password: '',
  loginMethod: '',
  email: '',
  phone: '',
  weixin: '',
  isTop: false,
  note: '',
  website: '',
  tags: [],
  icon: DEFAULT_ICON,
}

/** 比较两个密码是否完全相同 */
export function isEqualPassword(a: Password, b: Password): boolean {
  return a.id === b.id &&
  a.createDate === b.createDate &&
  a.title === b.title &&
  a.username === b.username &&
  a.password === b.password &&
  a.loginMethod === b.loginMethod &&
  a.email === b.email &&
  a.phone === b.phone &&
  a.weixin === b.weixin &&
  a.isTop === b.isTop &&
  a.note === b.note &&
  a.website === b.website &&
  isEqualArrays(a.tags, b.tags) &&
  a.icon === b.icon
}

/**
 * 补齐单条密码的缺失字段，避免后续读取到 undefined / null 报错。
 * 字符串字段缺省为空字符串，isTop 与 tags 分别缺省为 false 与 []，id 等数字字段缺省为 0。
 */
export function normalizePassword(raw: Partial<Password>): Password {
  const d = defaultPassword
  return {
    id: typeof raw.id === 'number' ? raw.id : d.id,
    createDate: typeof raw.createDate === 'number' ? raw.createDate : d.createDate,
    title: typeof raw.title === 'string' ? raw.title : d.title,
    username: typeof raw.username === 'string' ? raw.username : d.username,
    password: typeof raw.password === 'string' ? raw.password : d.password,
    loginMethod: typeof raw.loginMethod === 'string' ? raw.loginMethod : d.loginMethod,
    email: typeof raw.email === 'string' ? raw.email : d.email,
    phone: typeof raw.phone === 'string' ? raw.phone : d.phone,
    weixin: typeof raw.weixin === 'string' ? raw.weixin : d.weixin,
    isTop: typeof raw.isTop === 'boolean' ? raw.isTop : d.isTop,
    note: typeof raw.note === 'string' ? raw.note : d.note,
    website: typeof raw.website === 'string' ? raw.website : d.website,
    tags: Array.isArray(raw.tags) ? raw.tags : d.tags,
    icon: typeof raw.icon === 'string' ? raw.icon : d.icon,
  }
}
