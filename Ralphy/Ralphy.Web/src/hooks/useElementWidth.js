import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Tracks an element's content width.
 *
 * The justified layout needs a real pixel width to compute row heights from,
 * and it has to re-run on resize — a CSS media query can't express "how tall
 * should this row be given these seven aspect ratios".
 *
 * Measured synchronously on mount rather than waiting for ResizeObserver.
 * ResizeObserver notifications are delivered as part of the frame lifecycle, so
 * a document that isn't rendering — a background tab, a hidden pane, a headless
 * screenshot — may never receive the initial callback. Waiting on it would mean
 * the grid renders nothing at all in those cases. The observer still runs; it
 * just refines a width we already have instead of being the only source of one.
 */
// Last width measured per cache key. See `cacheKey` below.
const lastWidths = new Map()

/**
 * @param cacheKey optional. When given, the first render starts from the width
 *   last measured under that key instead of 0. A justified grid renders no rows
 *   at width 0, so on a revisit (the Back button) the page would be a row short
 *   for one pass — exactly when scroll restoration needs it at full height.
 */
export function useElementWidth(cacheKey) {
  const ref = useRef(null)
  const [width, setWidth] = useState(() => (cacheKey && lastWidths.get(cacheKey)) || 0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const apply = (value) => {
      const next = Math.round(value)
      // Guard against NaN from an exotic ResizeObserver entry shape; a NaN
      // width would silently pack zero rows.
      if (!Number.isFinite(next) || next <= 0) return
      if (cacheKey) lastWidths.set(cacheKey, next)
      setWidth((previous) => (previous === next ? previous : next))
    }

    // Layout is already committed at this point, so this is the real width.
    apply(element.getBoundingClientRect().width)

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(([entry]) => {
      // contentBoxSize is an array in the spec, but shipped as a bare object in
      // early implementations — fall back to contentRect either way.
      const box = Array.isArray(entry.contentBoxSize)
        ? entry.contentBoxSize[0]
        : entry.contentBoxSize

      apply(box?.inlineSize ?? entry.contentRect.width)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [cacheKey])

  return [ref, width]
}
