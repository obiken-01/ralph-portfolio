/**
 * Helpers for the browser's View Transitions API.
 *
 * Route changes go through React Router's own `viewTransition` support; this
 * is for transitions the router doesn't drive, such as opening the photo
 * viewer. Browsers without the API, and visitors who prefer reduced motion,
 * get the same update applied instantly.
 */

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function canViewTransition() {
  return typeof document !== 'undefined'
    && typeof document.startViewTransition === 'function'
    && !prefersReducedMotion()
}

/**
 * Run `update` inside a view transition. `update` must apply its DOM change
 * synchronously (wrap React state updates in flushSync).
 *
 * `kind` is written to <html data-vt="…"> for the duration, so CSS can switch
 * off shared-element names that would otherwise join this transition (the
 * sticky header, the post hero) and float above the photo viewer.
 *
 * Returns the ViewTransition, or null when the update ran without one.
 */
export function withViewTransition(update, { kind } = {}) {
  if (!canViewTransition()) {
    update()
    return null
  }

  const root = document.documentElement
  if (kind) root.dataset.vt = kind

  const transition = document.startViewTransition(update)
  transition.finished
    .catch(() => {})
    .finally(() => { if (kind && root.dataset.vt === kind) delete root.dataset.vt })
  return transition
}
