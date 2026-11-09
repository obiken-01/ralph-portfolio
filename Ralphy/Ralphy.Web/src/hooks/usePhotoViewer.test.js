import { describe, it, expect } from 'vitest'
import { readPhotoParam, withPhotoParam } from './usePhotoViewer'

describe('readPhotoParam', () => {
  it('turns the 1-based URL number into a 0-based index', () => {
    expect(readPhotoParam('?photo=3')).toBe(2)
  })

  it.each(['', '?photo=', '?photo=0', '?photo=-1', '?photo=2.5', '?photo=abc'])(
    'ignores %s', (search) => {
      expect(readPhotoParam(search)).toBeNull()
    })
})

describe('withPhotoParam', () => {
  const base = 'https://ralphy.example/posts/7'

  it('sets the 1-based photo number', () => {
    expect(withPhotoParam(base, 0)).toBe(`${base}?photo=1`)
  })

  it('replaces an existing value and keeps other params', () => {
    expect(withPhotoParam(`${base}?ref=ig&photo=2`, 4)).toBe(`${base}?ref=ig&photo=5`)
  })

  it('removes the param when the viewer closes', () => {
    expect(withPhotoParam(`${base}?photo=2`, null)).toBe(base)
  })
})
