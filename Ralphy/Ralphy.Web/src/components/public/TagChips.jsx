import { Link } from 'react-router-dom'

/**
 * Tags display with a leading #, and are stored without one. Each links to the
 * filtered feed — this is what replaces "browse by trip".
 */
export default function TagChips({ tags = [], className = '' }) {
  if (tags.length === 0) return null

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            to={`/tags/${encodeURIComponent(tag)}`}
            className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs
                       font-medium text-teal-700 ring-1 ring-teal-100
                       transition-colors hover:bg-teal-100"
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Filter bar for the feed. Counts come from the API; a tag with nothing
 * published behind it never reaches here, but guard anyway rather than render
 * a dead link.
 */
export function TagFilterBar({ tags = [], active = null, limit = 12 }) {
  const usable = tags.filter((tag) => (tag.postCount ?? 0) > 0).slice(0, limit)
  if (usable.length === 0) return null

  const pill = (isActive) =>
    `rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-teal-500'
    }`

  return (
    <div className="flex flex-wrap gap-2">
      <Link to="/posts" className={pill(!active)}>All</Link>

      {usable.map((tag) => (
        <Link
          key={tag.id ?? tag.name}
          to={`/tags/${encodeURIComponent(tag.name)}`}
          className={pill(active === tag.name)}
        >
          #{tag.name}
          <span className="ml-1.5 opacity-60">{tag.postCount}</span>
        </Link>
      ))}
    </div>
  )
}
