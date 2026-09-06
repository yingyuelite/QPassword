import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { isEqualPassword, Password } from '@/types/password'
import { loadPasswords, savePasswords } from '@/utils/storage'

/** 密码数据发生变更的事件名（如清空密码、导入密码后通知首页刷新） */
export const EVENT_PASSWORDS_CHANGED = 'passwords_changed'

function sortPasswords(list: Password[]): Password[] {
  return [...list].sort((a, b) => {
    if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
    return b.createDate - a.createDate
  })
}

export function usePasswords(ready = true) {
  const [passwords, setPasswords] = useState<Password[]>([])
  const [loading, setLoading] = useState(true)

  const persist = useCallback(async (next: Password[]): Promise<boolean> => {
    return await savePasswords(next)
  }, [])

  useEffect(() => {
    if (!ready) return
    loadPasswords().then((list) => {
      setPasswords(sortPasswords(list))
      setLoading(false)
    })
  }, [ready])

  // 乐观更新：先同步更新内存状态让界面立即响应，再后台异步落盘，避免大列表加解密阻塞 UI
  const add = useCallback(async (pwd: Password): Promise<boolean> => {
    const next = sortPasswords([...passwords, pwd])
    setPasswords(next)
    return persist(next)
  }, [passwords, persist])

  const update = useCallback(async (pwd: Password): Promise<boolean> => {
    const next = sortPasswords(passwords.map((p) => (p.id === pwd.id ? pwd : p)))
    setPasswords(next)
    return persist(next)
  }, [passwords, persist])

  const remove = useCallback(async (id: number): Promise<boolean> => {
    const next = sortPasswords(passwords.filter((p) => p.id !== id))
    setPasswords(next)
    return persist(next)
  }, [passwords, persist])

  const importMany = useCallback(async (imported: Password[]): Promise<{ added: number; updated: number }> => {
    const existingMap = new Map(passwords.map((p) => [p.id, p]))
    let added = 0
    let updated = 0

    for (const pwd of imported) {
      const existing = existingMap.get(pwd.id)
      if (existing) {
        // 字段内容全部相同则跳过，否则覆盖更新
        if (!isEqualPassword(existing, pwd)) {
          existingMap.set(pwd.id, pwd)
          updated++
        }
      } else {
        existingMap.set(pwd.id, pwd)
        added++
      }
    }

    const next = sortPasswords(Array.from(existingMap.values()))
    setPasswords(next)
    const ok = await persist(next)
    // 导入成功后通知首页（及其他监听者）刷新密码列表，
    // 确保导入的密码立即显示出来，而无需等下次进入页面
    if (ok) {
      Taro.eventCenter.trigger(EVENT_PASSWORDS_CHANGED)
    }
    return ok ? { added, updated } : { added: 0, updated: 0 }
  }, [passwords, persist])

  const reload = useCallback(async () => {
    const list = await loadPasswords()
    setPasswords(sortPasswords(list))
  }, [])

  return { passwords, loading, add, update, remove, importMany, reload }
}
