/**
 * A tiny in-memory cache for public page data.
 *
 * Pages render from the cache instantly on a revisit (the Back button most of
 * all) and refresh in the background. Two things depend on that first render
 * already having content:
 *   - scroll restoration, which can only return to a position the page is
 *     tall enough to reach; and
 *   - the photo morph between a grid tile and a post, which needs the tile to
 *     exist when the transition takes its snapshot.
 *
 * Lives for the page session only; a reload starts empty.
 */
const store = new Map()

export function peekCache(key) {
  return store.get(key)
}

export async function fetchCached(key, load) {
  const value = await load()
  store.set(key, value)
  return value
}

/** For tests. */
export function clearCache() {
  store.clear()
}
