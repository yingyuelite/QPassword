type CloseFn = () => void

let uid = 0
const registry = new Map<number, CloseFn>()

export function nextDropdownId(): number {
  return ++uid
}

export function subscribeDropdownClose(id: number, close: CloseFn): () => void {
  registry.set(id, close)
  return () => {
    registry.delete(id)
  }
}

export function closeOtherDropdowns(exceptId: number): void {
  registry.forEach((close, id) => {
    if (id !== exceptId) close()
  })
}

export function closeAllDropdowns(): void {
  registry.forEach((close) => close())
}
