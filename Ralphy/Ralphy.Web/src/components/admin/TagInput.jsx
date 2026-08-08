import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../api/axios'

/** Stored lowercase and trimmed, so the chip shown matches what gets saved. */
const normalizeTag = (value) =>
  value.toLowerCase().trim().replace(/^#/, '').replace(/\s+/g, '-')

/**
 * Chip input for post tags. Tags are v2.0's replacement for Trip as the
 * grouping mechanism, so this is the only place they get created — the API's
 * assign endpoint already does get-or-create, which means no separate
 * "create tag" call.
 */
export default function TagInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('')
  const [known, setKnown] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // The admin list, not the public one — an unused tag is still worth
    // offering while drafting.
    api.get('/tags/all')
      .then((res) => setKnown((res.data.data ?? []).map((t) => t.name)))
      .catch(() => setKnown([]))
  }, [])

  const suggestions = useMemo(() => {
    const needle = normalizeTag(draft)
    if (!needle) return []
    return known
      .filter((name) => name.includes(needle) && !value.includes(name))
      .slice(0, 6)
  }, [draft, known, value])

  const add = (raw) => {
    const tag = normalizeTag(raw)
    if (!tag || value.includes(tag)) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
    setOpen(false)
  }

  const removeAt = (index) =>
    onChange(value.filter((_, i) => i !== index))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
      return
    }
    // Backspace on an empty input pulls back the last chip — the behaviour
    // every other chip input has, and its absence is immediately annoying.
    if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeAt(value.length - 1)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg
                   border border-slate-700 bg-slate-800 px-2 py-1.5
                   focus-within:ring-2 focus-within:ring-blue-500"
      >
        {value.map((tag, index) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-slate-700 px-2
                       py-0.5 text-xs text-white"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeAt(index) }}
              className="text-slate-400 hover:text-red-400"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onBlur={() => { add(draft); setTimeout(() => setOpen(false), 120) }}
          placeholder={value.length === 0 ? 'paluan, bugtong-bato…' : ''}
          className="min-w-[8ch] flex-1 bg-transparent text-sm text-white
                     placeholder-slate-500 focus:outline-none"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden
                        rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(name) }}
              className="block w-full px-3 py-2 text-left text-xs text-slate-300
                         hover:bg-slate-700 hover:text-white"
            >
              #{name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs text-slate-500">
        Enter or comma to add. Tags are how posts group now.
      </p>
    </div>
  )
}
