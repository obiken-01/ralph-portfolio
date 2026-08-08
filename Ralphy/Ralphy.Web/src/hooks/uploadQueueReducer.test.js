import { describe, it, expect } from 'vitest'
import {
  ItemStatus,
  activeCount,
  failedCount,
  initialQueue,
  isSettled,
  nextPending,
  queueReducer,
} from './uploadQueueReducer'

const enqueue = (state, count, startingSortOrder = 0) =>
  queueReducer(state, {
    type: 'enqueue',
    startingSortOrder,
    items: Array.from({ length: count }, (_, i) => ({
      id: `u${i}`,
      file: { name: `shot${i}.jpg` },
      previewUrl: `blob:${i}`,
    })),
  })

describe('enqueue', () => {
  it('numbers sort order by queue position', () => {
    const state = enqueue(initialQueue, 3)

    expect(state.items.map((i) => i.sortOrder)).toEqual([0, 1, 2])
  })

  it('continues from the photos already on the post', () => {
    // Otherwise a second batch would collide with the first at 0.
    const state = enqueue(initialQueue, 2, 5)

    expect(state.items.map((i) => i.sortOrder)).toEqual([5, 6])
  })

  it('appends to an in-flight queue without renumbering it', () => {
    let state = enqueue(initialQueue, 2)
    state = queueReducer(state, {
      type: 'enqueue',
      startingSortOrder: 0,
      items: [{ id: 'u9', file: {}, previewUrl: 'blob:9' }],
    })

    expect(state.items).toHaveLength(3)
    expect(state.items[2].sortOrder).toBe(2)
  })

  it('starts every item pending', () => {
    const state = enqueue(initialQueue, 4)

    expect(state.items.every((i) => i.status === ItemStatus.Pending)).toBe(true)
  })
})

describe('failure isolation', () => {
  it('scopes a failure to one item', () => {
    let state = enqueue(initialQueue, 3)
    state = queueReducer(state, { type: 'done', id: 'u0' })
    state = queueReducer(state, { type: 'fail', id: 'u1', error: 'Network' })

    // The one that already landed stays landed; the third is untouched.
    expect(state.items[0].status).toBe(ItemStatus.Done)
    expect(state.items[1].status).toBe(ItemStatus.Failed)
    expect(state.items[1].error).toBe('Network')
    expect(state.items[2].status).toBe(ItemStatus.Pending)
  })

  it('retry resets only the failed item', () => {
    let state = enqueue(initialQueue, 3)
    state = queueReducer(state, { type: 'done', id: 'u0' })
    state = queueReducer(state, { type: 'fail', id: 'u1', error: 'Network' })
    state = queueReducer(state, { type: 'fail', id: 'u2', error: 'Network' })

    state = queueReducer(state, { type: 'retry', id: 'u1' })

    expect(state.items[0].status).toBe(ItemStatus.Done)
    expect(state.items[1].status).toBe(ItemStatus.Pending)
    expect(state.items[1].error).toBeNull()
    // The other failure is not silently swept up with it.
    expect(state.items[2].status).toBe(ItemStatus.Failed)
  })

  it('retry clears the stale progress bar', () => {
    let state = enqueue(initialQueue, 1)
    state = queueReducer(state, { type: 'progress', id: 'u0', progress: 62 })
    state = queueReducer(state, { type: 'fail', id: 'u0', error: 'Network' })
    state = queueReducer(state, { type: 'retry', id: 'u0' })

    expect(state.items[0].progress).toBe(0)
  })

  it('retry preserves the caption already typed', () => {
    let state = enqueue(initialQueue, 1)
    state = queueReducer(state, {
      type: 'caption', id: 'u0', caption: 'Bugtong Bato at dawn',
    })
    state = queueReducer(state, { type: 'fail', id: 'u0', error: 'Network' })
    state = queueReducer(state, { type: 'retry', id: 'u0' })

    expect(state.items[0].caption).toBe('Bugtong Bato at dawn')
  })
})

describe('progress', () => {
  it('tracks per item, not for the batch', () => {
    let state = enqueue(initialQueue, 2)
    state = queueReducer(state, { type: 'progress', id: 'u0', progress: 30 })
    state = queueReducer(state, { type: 'progress', id: 'u1', progress: 80 })

    expect(state.items.map((i) => i.progress)).toEqual([30, 80])
  })

  it('resets progress when an item starts uploading', () => {
    let state = enqueue(initialQueue, 1)
    state = queueReducer(state, { type: 'progress', id: 'u0', progress: 40 })
    state = queueReducer(state, {
      type: 'status', id: 'u0', status: ItemStatus.Uploading,
    })

    expect(state.items[0].progress).toBe(0)
  })

  it('leaves progress alone for non-upload phases', () => {
    let state = enqueue(initialQueue, 1)
    state = queueReducer(state, { type: 'progress', id: 'u0', progress: 40 })
    state = queueReducer(state, {
      type: 'status', id: 'u0', status: ItemStatus.Compressing,
    })

    expect(state.items[0].progress).toBe(40)
  })
})

describe('selectors', () => {
  it('counts only items holding a pool slot', () => {
    let state = enqueue(initialQueue, 5)
    state = queueReducer(state, {
      type: 'status', id: 'u0', status: ItemStatus.Reading,
    })
    state = queueReducer(state, {
      type: 'status', id: 'u1', status: ItemStatus.Uploading,
    })
    state = queueReducer(state, { type: 'done', id: 'u2' })
    state = queueReducer(state, { type: 'fail', id: 'u3', error: 'x' })

    // Pending, done and failed are not occupying a slot.
    expect(activeCount(state.items)).toBe(2)
  })

  it('hands out the first pending item', () => {
    let state = enqueue(initialQueue, 3)
    state = queueReducer(state, { type: 'done', id: 'u0' })

    expect(nextPending(state.items).id).toBe('u1')
  })

  it('returns null when nothing is waiting', () => {
    let state = enqueue(initialQueue, 1)
    state = queueReducer(state, { type: 'done', id: 'u0' })

    expect(nextPending(state.items)).toBeNull()
  })

  it('is not settled while anything is still pending', () => {
    let state = enqueue(initialQueue, 2)
    state = queueReducer(state, { type: 'done', id: 'u0' })

    expect(isSettled(state.items)).toBe(false)
  })

  it('is settled once everything succeeded or failed', () => {
    let state = enqueue(initialQueue, 2)
    state = queueReducer(state, { type: 'done', id: 'u0' })
    state = queueReducer(state, { type: 'fail', id: 'u1', error: 'x' })

    expect(isSettled(state.items)).toBe(true)
    expect(failedCount(state.items)).toBe(1)
  })

  it('an empty queue is not settled', () => {
    expect(isSettled([])).toBe(false)
  })
})

describe('housekeeping', () => {
  it('clearFinished keeps failures on screen to be retried', () => {
    let state = enqueue(initialQueue, 3)
    state = queueReducer(state, { type: 'done', id: 'u0' })
    state = queueReducer(state, { type: 'fail', id: 'u1', error: 'x' })
    state = queueReducer(state, { type: 'clearFinished' })

    expect(state.items.map((i) => i.id)).toEqual(['u1', 'u2'])
  })

  it('remove drops a single item', () => {
    let state = enqueue(initialQueue, 3)
    state = queueReducer(state, { type: 'remove', id: 'u1' })

    expect(state.items.map((i) => i.id)).toEqual(['u0', 'u2'])
  })
})
