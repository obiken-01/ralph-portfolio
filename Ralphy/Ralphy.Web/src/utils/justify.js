// Justified-row packing — the Flickr / Google Photos arrangement.
//
// Rows share a height, every photo keeps its true proportions, and each row
// fills the container edge to edge. CSS alone cannot do this: flexbox can grow
// items to fill a row, but it grows width without growing height, so the aspect
// ratio breaks and you end up cropping. The row height has to be *computed*
// from the aspect ratios in the row, which is what this does.
//
// Because Photo.Width and Photo.Height come down with the API response, the
// ratios are known before a single image loads — no measuring in the browser,
// no layout shift.

/** 3:2 — the shape most cameras hand you, and a safe stand-in. */
const DEFAULT_ASPECT = 1.5

function normalizeAspect(aspect) {
  return Number.isFinite(aspect) && aspect > 0 ? aspect : DEFAULT_ASPECT
}

/**
 * @param {number[]} aspects  width / height for each item, in display order
 * @param {object}   opts
 * @param {number}   opts.containerWidth  available width in px
 * @param {number}   opts.targetHeight    the height rows aim for before fitting
 * @param {number}   [opts.gap]           px between items and between rows
 * @returns {{height: number, items: {index: number, aspect: number, width: number, height: number}[]}[]}
 */
export function packRows(aspects, { containerWidth, targetHeight, gap = 4 }) {
  if (!Array.isArray(aspects) || aspects.length === 0) return []
  if (!(containerWidth > 0) || !(targetHeight > 0)) return []

  const rows = []
  let current = []
  let aspectSum = 0

  const finalize = (items, sum, stretchToFill) => {
    const available = containerWidth - gap * (items.length - 1)
    // The height at which this row exactly spans the container.
    const fitted = available / sum

    // A full row stretches to fill. A trailing row does not — one leftover
    // photo blown up to the full width reads as a mistake, not a finale.
    const height = stretchToFill ? fitted : Math.min(targetHeight, fitted)

    return {
      height,
      items: items.map((item) => ({
        ...item,
        width: item.aspect * height,
        height,
      })),
    }
  }

  aspects.forEach((rawAspect, index) => {
    const aspect = normalizeAspect(rawAspect)
    current.push({ index, aspect })
    aspectSum += aspect

    const widthAtTarget = aspectSum * targetHeight + gap * (current.length - 1)

    if (widthAtTarget >= containerWidth) {
      rows.push(finalize(current, aspectSum, true))
      current = []
      aspectSum = 0
    }
  })

  if (current.length > 0) {
    rows.push(finalize(current, aspectSum, false))
  }

  return rows
}

/** Aspect ratio of a post's lead photo, falling back when dimensions are absent. */
export function postAspect(post) {
  const width = post?.thumbnailWidth ?? post?.photos?.[0]?.width
  const height = post?.thumbnailHeight ?? post?.photos?.[0]?.height

  return width > 0 && height > 0 ? width / height : DEFAULT_ASPECT
}

// Cloudinary mints (and bills for) a derived asset per distinct width. Snapping
// to buckets means a window resize reuses a variant instead of generating a new
// one on every pixel.
const WIDTH_BUCKETS = [320, 480, 640, 800, 1000, 1280, 1600, 2000]

/** Smallest bucket that still covers the rendered width at this pixel density. */
export function bucketWidth(renderedWidth, dpr = 1) {
  const needed = renderedWidth * Math.min(dpr, 2)
  return WIDTH_BUCKETS.find((w) => w >= needed) ?? WIDTH_BUCKETS.at(-1)
}
