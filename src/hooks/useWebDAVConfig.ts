import { useState, useEffect, useCallback } from 'react'
import { WebDAVConfig } from '@/types/webdav'
import { loadWebDAVConfigs, saveWebDAVConfigs } from '@/utils/storage'

export function useWebDAVConfig(ready = true) {
  const [configs, setConfigs] = useState<WebDAVConfig[]>([])

  useEffect(() => {
    if (!ready) return
    loadWebDAVConfigs().then(setConfigs)
  }, [ready])

  const add = useCallback(async (config: WebDAVConfig): Promise<boolean> => {
    const next = [...configs, config]
    try {
      await saveWebDAVConfigs(next)
      setConfigs(next)
      return true
    } catch {
      return false
    }
  }, [configs])

  const update = useCallback(async (config: WebDAVConfig): Promise<boolean> => {
    const next = configs.map((c) => (c.id === config.id ? config : c))
    try {
      await saveWebDAVConfigs(next)
      setConfigs(next)
      return true
    } catch {
      return false
    }
  }, [configs])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const next = configs.filter((c) => c.id !== id)
    try {
      await saveWebDAVConfigs(next)
      setConfigs(next)
      return true
    } catch {
      return false
    }
  }, [configs])

  return { configs, add, update, remove }
}
