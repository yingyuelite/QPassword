/** WebDAV 服务器配置 */
export interface WebDAVConfig {
  /** 唯一标识 */
  id: string
  /** 服务器名称（用户自定义） */
  name: string
  /** WebDAV 服务器地址 */
  url: string
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}
