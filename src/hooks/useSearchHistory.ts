import { useState, useEffect, useCallback } from 'react'
import { loadSearchHistory, addSearchHistory, clearSearchHistory } from '@/utils/storage'

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  const load = useCallback(async () => {
    const list = await loadSearchHistory()
    setHistory(list)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(async (keyword: string) => {
    const next = await addSearchHistory(keyword)
    setHistory(next)
  }, [])

  const clear = useCallback(async () => {
    await clearSearchHistory()
    setHistory([])
  }, [])

  return { history, add, clear, reload: load }
}
