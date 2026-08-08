export const APP_VERSION = '2.0.0'

export const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatShortDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatDateRange = (start, end) => {
  if (!start) return ''
  if (!end) return formatShortDate(start)
  const s = new Date(start)
  const e = new Date(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const startStr = s.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `${startStr} – ${formatShortDate(end)}`
}

export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Approximate reading time in minutes for rich-text HTML content.
 * Returns 0 for an empty body — content is optional since v2.0, and claiming
 * "1 min read" for a post with no words is worse than saying nothing.
 */
export const readingTime = (html) => {
  const words = stripHtml(html).split(' ').filter(Boolean).length
  if (words === 0) return 0
  return Math.max(1, Math.round(words / 200))
}

/** The date a post should be filed under: when it was shot, else when it shipped. */
export const postDate = (post) =>
  post?.takenAt ?? post?.publishedAt ?? post?.createdAt ?? null

/**
 * Groups posts into "March 2025" buckets, newest first. This is what replaces
 * Trip as the timeline's organising principle.
 */
export const groupByMonth = (posts) => {
  const buckets = new Map()

  for (const post of posts) {
    const raw = postDate(post)
    const date = raw ? new Date(raw) : null
    const valid = date && !Number.isNaN(date.getTime())

    const key = valid
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'undated'

    const label = valid
      ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Undated'

    if (!buckets.has(key)) buckets.set(key, { key, label, posts: [] })
    buckets.get(key).posts.push(post)
  }

  return [...buckets.values()].sort((a, b) => {
    // Anything without a usable date sinks to the bottom rather than
    // sorting as year zero.
    if (a.key === 'undated') return 1
    if (b.key === 'undated') return -1
    return b.key.localeCompare(a.key)
  })
}
