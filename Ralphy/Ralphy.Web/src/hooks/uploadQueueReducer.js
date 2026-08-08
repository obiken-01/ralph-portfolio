// State machine for the multi-file upload queue.
//
// Split out from the hook so the transitions can be tested without a network,
// a DOM, or a fake File. The invariant that matters: a failure is scoped to one
// item. One rejected photo must never abandon the other thirty-nine.

export const ItemStatus = {
  Pending: 'pending',
  Reading: 'reading',      // pulling EXIF off the original
  Compressing: 'compressing',
  Uploading: 'uploading',
  Done: 'done',
  Failed: 'failed',
}

/** Statuses that mean the item is holding a slot in the concurrency pool. */
const ACTIVE = [ItemStatus.Reading, ItemStatus.Compressing, ItemStatus.Uploading]

export const initialQueue = { items: [] }

export function queueReducer(state, action) {
  switch (action.type) {
    case 'enqueue':
      return {
        items: [
          ...state.items,
          ...action.items.map((item, index) => ({
            id: item.id,
            file: item.file,
            previewUrl: item.previewUrl,
            // Position in the gallery, continuing from whatever is already
            // on the post rather than restarting at zero.
            sortOrder: action.startingSortOrder + state.items.length + index,
            caption: '',
            status: ItemStatus.Pending,
            progress: 0,
            error: null,
          })),
        ],
      }

    case 'status':
      return patch(state, action.id, {
        status: action.status,
        progress: action.status === ItemStatus.Uploading ? 0 : undefined,
        error: null,
      })

    case 'progress':
      return patch(state, action.id, { progress: action.progress })

    case 'caption':
      return patch(state, action.id, { caption: action.caption })

    case 'done':
      return patch(state, action.id, {
        status: ItemStatus.Done,
        progress: 100,
        error: null,
      })

    case 'fail':
      return patch(state, action.id, {
        status: ItemStatus.Failed,
        error: action.error,
        progress: 0,
      })

    case 'retry':
      // Only this item goes back to pending. Anything already uploaded stays
      // uploaded; anything in flight keeps its slot.
      return patch(state, action.id, {
        status: ItemStatus.Pending,
        error: null,
        progress: 0,
      })

    case 'remove':
      return { items: state.items.filter((item) => item.id !== action.id) }

    case 'clearFinished':
      return {
        items: state.items.filter((item) => item.status !== ItemStatus.Done),
      }

    case 'reset':
      return initialQueue

    default:
      return state
  }
}

function patch(state, id, changes) {
  return {
    items: state.items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...Object.fromEntries(
              Object.entries(changes).filter(([, v]) => v !== undefined)
            ),
          }
        : item
    ),
  }
}

// ── Selectors ────────────────────────────────────────────────────

export const activeCount = (items) =>
  items.filter((item) => ACTIVE.includes(item.status)).length

export const nextPending = (items) =>
  items.find((item) => item.status === ItemStatus.Pending) ?? null

export const isSettled = (items) =>
  items.length > 0 &&
  items.every((item) =>
    item.status === ItemStatus.Done || item.status === ItemStatus.Failed
  )

export const failedCount = (items) =>
  items.filter((item) => item.status === ItemStatus.Failed).length
