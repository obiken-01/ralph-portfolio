import { describe, it, expect, beforeEach } from 'vitest'
import { peekCache, fetchCached, clearCache } from './cache'

describe('page data cache', () => {
  beforeEach(() => clearCache())

  it('is empty until something is fetched', () => {
    expect(peekCache('/posts')).toBeUndefined()
  })

  it('stores what the loader resolves and returns it', async () => {
    const value = await fetchCached('/posts', async () => ({ posts: [1, 2] }))
    expect(value).toEqual({ posts: [1, 2] })
    expect(peekCache('/posts')).toEqual({ posts: [1, 2] })
  })

  it('keeps the previous value when a refresh fails', async () => {
    await fetchCached('/posts', async () => 'first')
    await expect(fetchCached('/posts', async () => { throw new Error('offline') }))
      .rejects.toThrow('offline')
    expect(peekCache('/posts')).toBe('first')
  })
})
