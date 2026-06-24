import { describe, it, expect, beforeEach } from 'vitest'
import { saveReachBox, loadReachBox } from '../src/engine/calibration'
import type { ReachBox } from '../src/types'

const DEFAULT_BOX: ReachBox = { minX: 0, minY: 0, maxX: 1, maxY: 1 }

function installMockStorage(): void {
  const store = new Map<string, string>()
  ;(globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  } as Storage
}

describe('reach box persistence', () => {
  beforeEach(() => {
    installMockStorage()
  })

  it('round-trips a valid saved box through save -> load', () => {
    const box: ReachBox = { minX: 0.1, minY: 0.15, maxX: 0.9, maxY: 0.95 }
    saveReachBox(box)
    expect(loadReachBox()).toEqual(box)
  })

  it('returns the default box when stored value has a non-numeric field', () => {
    localStorage.setItem('fruitFury.reachBox', '{"minX":"x","minY":0.2,"maxX":0.8,"maxY":0.8}')
    expect(loadReachBox()).toEqual(DEFAULT_BOX)
  })

  it('returns the default box when stored value is not valid JSON', () => {
    localStorage.setItem('fruitFury.reachBox', 'not json')
    expect(loadReachBox()).toEqual(DEFAULT_BOX)
  })
})
