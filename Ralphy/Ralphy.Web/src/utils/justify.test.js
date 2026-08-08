import { describe, it, expect } from 'vitest'
import { packRows, postAspect, bucketWidth } from './justify'

const opts = { containerWidth: 1000, targetHeight: 250, gap: 4 }

/** Total width a row occupies, gaps included. */
const rowWidth = (row, gap = 4) =>
  row.items.reduce((sum, i) => sum + i.width, 0) + gap * (row.items.length - 1)

describe('packRows', () => {
  it('returns nothing for an empty feed', () => {
    expect(packRows([], opts)).toEqual([])
  })

  it('returns nothing before the container has been measured', () => {
    // First paint, ResizeObserver hasn't fired yet.
    expect(packRows([1.5, 1.5], { ...opts, containerWidth: 0 })).toEqual([])
  })

  it('fills each full row exactly to the container width', () => {
    const rows = packRows([1.5, 1.5, 1.5, 0.67, 1.78, 1.33, 1.5, 1.78], opts)
    const full = rows.slice(0, -1)

    expect(full.length).toBeGreaterThan(0)
    for (const row of full) {
      // This is the whole point — edges flush, no ragged right.
      expect(rowWidth(row)).toBeCloseTo(1000, 4)
    }
  })

  it('gives every item in a row the same height', () => {
    const rows = packRows([1.5, 0.67, 1.78, 1.33, 1.5, 1.78], opts)

    for (const row of rows) {
      for (const item of row.items) {
        expect(item.height).toBeCloseTo(row.height, 6)
      }
    }
  })

  it('preserves each aspect ratio exactly — nothing is cropped', () => {
    const aspects = [1.5, 0.67, 1.78, 1.33, 1.5, 1.78, 0.75]
    const rows = packRows(aspects, opts)

    for (const row of rows) {
      for (const item of row.items) {
        expect(item.width / item.height).toBeCloseTo(aspects[item.index], 6)
      }
    }
  })

  it('keeps items in feed order', () => {
    const rows = packRows([1.5, 0.67, 1.78, 1.33, 1.5, 1.78], opts)
    const order = rows.flatMap((r) => r.items.map((i) => i.index))

    // Chronology has to survive the layout — this is the bug the old
    // CSS-columns feed had, where reading across gave 1, 4, 7.
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('loses no items', () => {
    const aspects = Array.from({ length: 17 }, (_, i) => 0.6 + (i % 5) * 0.3)
    const rows = packRows(aspects, opts)

    expect(rows.flatMap((r) => r.items)).toHaveLength(17)
  })

  it('leaves a trailing row at the target height instead of stretching it', () => {
    // One leftover photo blown up to full width looks like a mistake.
    const rows = packRows([1.5, 1.5, 1.5, 1.5], opts)
    const last = rows.at(-1)

    expect(last.height).toBeLessThanOrEqual(250)
    expect(rowWidth(last)).toBeLessThan(1000)
  })

  it('accounts for gaps rather than overflowing by them', () => {
    const wide = packRows([1.5, 1.5, 1.5, 1.5, 1.5, 1.5], { ...opts, gap: 0 })
    const tight = packRows([1.5, 1.5, 1.5, 1.5, 1.5, 1.5], { ...opts, gap: 40 })

    // With gaps eating width, photos must get smaller, not overflow.
    expect(tight[0].height).toBeLessThan(wide[0].height)
    expect(rowWidth(tight[0], 40)).toBeCloseTo(1000, 4)
  })

  it('scales a single over-wide panorama down instead of overflowing', () => {
    const rows = packRows([5], { ...opts, containerWidth: 600 })

    expect(rows).toHaveLength(1)
    expect(rows[0].items[0].width).toBeLessThanOrEqual(600)
  })

  it('treats a missing or nonsense aspect as 3:2', () => {
    const rows = packRows([undefined, null, 0, -2, NaN], opts)
    const item = rows[0].items[0]

    expect(item.aspect).toBe(1.5)
    expect(item.width / item.height).toBeCloseTo(1.5, 6)
  })

  it('narrows to roughly one photo per row on a phone', () => {
    const rows = packRows([1.5, 1.5, 1.5], {
      containerWidth: 360,
      targetHeight: 240,
      gap: 4,
    })

    expect(rows.every((r) => r.items.length === 1)).toBe(true)
  })
})

describe('postAspect', () => {
  it('uses the thumbnail dimensions the API sends', () => {
    expect(postAspect({ thumbnailWidth: 4000, thumbnailHeight: 3000 }))
      .toBeCloseTo(1.333, 3)
  })

  it('falls back to a loaded photo when the thumbnail fields are absent', () => {
    expect(postAspect({ photos: [{ width: 1080, height: 1350 }] }))
      .toBeCloseTo(0.8, 3)
  })

  it('falls back to 3:2 for a post whose photos predate the metadata', () => {
    // Anything uploaded before v2.0 has null Width/Height.
    expect(postAspect({ thumbnailWidth: null, thumbnailHeight: null })).toBe(1.5)
    expect(postAspect({})).toBe(1.5)
    expect(postAspect(null)).toBe(1.5)
  })
})

describe('bucketWidth', () => {
  it('snaps up to the next bucket', () => {
    expect(bucketWidth(410)).toBe(480)
    expect(bucketWidth(640)).toBe(640)
  })

  it('accounts for retina without minting a variant per pixel', () => {
    expect(bucketWidth(400, 2)).toBe(800)
  })

  it('ignores absurd pixel densities', () => {
    // Some Android browsers report 3-4x; capping keeps the payload sane.
    expect(bucketWidth(500, 4)).toBe(1000)
  })

  it('never exceeds the largest bucket', () => {
    expect(bucketWidth(9000, 2)).toBe(2000)
  })
})
