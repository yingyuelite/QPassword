/** 搜索状态（关键词 + 标签），持久化到本地以便再次进入时恢复 */
export interface SearchState {
  keyword: string
  tags: string[]
}

export const EMPTY_SEARCH_STATE: SearchState = { keyword: '', tags: [] }
