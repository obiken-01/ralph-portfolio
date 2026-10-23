// Display formatting for the camera details a photo carries. Kept apart from
// exif.js so the public pages never pull in the EXIF parser.

/** 0.004 -> "1/250s", 2 -> "2s", 0.5 -> "0.5s" — as a camera would show it. */
export function formatShutter(seconds) {
  if (!(seconds > 0)) return null
  if (seconds >= 0.3) return `${+seconds.toFixed(1)}s`
  return `1/${Math.round(1 / seconds)}s`
}

export function formatAperture(fNumber) {
  return fNumber > 0 ? `f/${+fNumber.toFixed(1)}` : null
}

export function formatFocal(mm) {
  return mm > 0 ? `${Math.round(mm)}mm` : null
}

export function formatIso(iso) {
  return iso > 0 ? `ISO ${iso}` : null
}

/** "35mm · f/1.8 · 1/250s · ISO 200", or null when nothing is known. */
export function exposureLine(photo) {
  const parts = [
    formatFocal(photo?.focalLength),
    formatAperture(photo?.fNumber),
    formatShutter(photo?.exposureTime),
    formatIso(photo?.iso),
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : null
}

/** "Sony ILCE-7M4 · FE 35mm F1.8", or null. */
export function gearLine(photo) {
  const parts = [photo?.camera, photo?.lens].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/**
 * Reads a shutter speed the way it is written: "1/250", "1/250s", "0.5", "2s".
 * Returns seconds, null for an empty field, or NaN for something unreadable.
 */
export function parseShutter(text) {
  const value = String(text ?? '').trim().replace(/s$/i, '').trim()
  if (!value) return null

  const fraction = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  const seconds = fraction
    ? Number(fraction[1]) / Number(fraction[2])
    : Number(value)

  return Number.isFinite(seconds) && seconds > 0 ? seconds : NaN
}
