import { describe, it, expect } from 'vitest'
import { groupByMonth, postDate, readingTime, stripHtml, truncateText } from './helpers'

describe('readingTime', () => {
  it('returns 0 for a post with no words', () => {
    // Content is optional since v2.0. The old version returned 1, so a
    // wordless photo post advertised "1 min read".
    expect(readingTime(null)).toBe(0)
    expect(readingTime('')).toBe(0)
    expect(readingTime('<p></p>')).toBe(0)
  })

  it('rounds up to at least a minute for anything with words', () => {
    expect(readingTime('<p>Just a few words here.</p>')).toBe(1)
  })

  it('scales with length', () => {
    const words = Array(600).fill('word').join(' ')
    expect(readingTime(`<p>${words}</p>`)).toBe(3)
  })
})

describe('stripHtml / truncateText', () => {
  it('survives a null body', () => {
    expect(stripHtml(null)).toBe('')
    expect(truncateText(null, 10)).toBe('')
  })

  it('collapses tags and whitespace', () => {
    expect(stripHtml('<p>Hello   <em>there</em></p>')).toBe('Hello there')
  })
})

describe('postDate', () => {
  it('prefers when the shutter fired over when the post shipped', () => {
    const post = {
      takenAt: '2025-03-14T06:30:00Z',
      publishedAt: '2025-08-01T00:00:00Z',
      createdAt: '2025-08-01T00:00:00Z',
    }

    expect(postDate(post)).toBe('2025-03-14T06:30:00Z')
  })

  it('falls back through published then created', () => {
    expect(postDate({ publishedAt: 'p', createdAt: 'c' })).toBe('p')
    expect(postDate({ createdAt: 'c' })).toBe('c')
    expect(postDate({})).toBeNull()
  })
})

describe('groupByMonth', () => {
  it('buckets posts by month, newest first', () => {
    const groups = groupByMonth([
      { id: 1, takenAt: '2025-03-14T06:30:00Z' },
      { id: 2, takenAt: '2025-05-02T09:00:00Z' },
      { id: 3, takenAt: '2025-03-28T17:00:00Z' },
    ])

    expect(groups.map((g) => g.key)).toEqual(['2025-05', '2025-03'])
    expect(groups[1].posts.map((p) => p.id)).toEqual([1, 3])
  })

  it('labels a bucket the way a person would say it', () => {
    const groups = groupByMonth([{ id: 1, takenAt: '2025-03-14T06:30:00Z' }])

    expect(groups[0].label).toBe('March 2025')
  })

  it('sinks undated posts to the bottom instead of sorting them as year zero', () => {
    const groups = groupByMonth([
      { id: 1 },
      { id: 2, takenAt: '2025-05-02T09:00:00Z' },
    ])

    expect(groups.map((g) => g.key)).toEqual(['2025-05', 'undated'])
  })

  it('treats an unparseable date as undated rather than crashing', () => {
    const groups = groupByMonth([{ id: 1, takenAt: 'not a date' }])

    expect(groups[0].key).toBe('undated')
  })

  it('returns nothing for an empty feed', () => {
    expect(groupByMonth([])).toEqual([])
  })
})
