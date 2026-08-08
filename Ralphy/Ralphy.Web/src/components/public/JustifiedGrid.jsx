import { useMemo } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth'
import { packRows } from '../../utils/justify'

/**
 * Rows of equal height, every item at its true aspect ratio, each full row
 * flush to both edges.
 *
 * Row height is computed rather than declared, so it responds to the mix of
 * shapes on screen: a row of three panoramas sits shorter than a row of two
 * portraits, and both span the container exactly.
 */
export default function JustifiedGrid({
  items,
  aspectOf,
  renderItem,
  keyOf = (item, index) => item?.id ?? index,
  gap = 6,
  targetHeight = 260,
  // On a phone the row height is derived from the width instead of being
  // fixed. At 0.7 × width, any photo wider than about 1.4:1 already overflows
  // the row on its own, so landscape shots land one per row at a size worth
  // looking at — rather than two 115px-tall thumbnails side by side.
  mobileHeightRatio = 0.7,
  mobileBreakpoint = 640,
  className = '',
}) {
  const [ref, width] = useElementWidth()

  const rows = useMemo(() => {
    const height = width > 0 && width < mobileBreakpoint
      ? Math.round(width * mobileHeightRatio)
      : targetHeight

    return packRows(items.map(aspectOf), {
      containerWidth: width,
      targetHeight: height,
      gap,
    })
  }, [items, aspectOf, width, gap, targetHeight, mobileHeightRatio, mobileBreakpoint])

  return (
    <div ref={ref} className={className}>
      {/* Before the first measurement `rows` is empty. Reserving roughly one
          row's height keeps the page from lurching when it fills in. */}
      {rows.length === 0 && items.length > 0 && (
        <div style={{ height: targetHeight }} aria-hidden="true" />
      )}

      <div className="flex flex-col" style={{ gap }}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex" style={{ gap }}>
            {row.items.map(({ index, width: w, height: h }) => (
              <div key={keyOf(items[index], index)} style={{ width: w, height: h }}>
                {renderItem(items[index], { width: w, height: h })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
