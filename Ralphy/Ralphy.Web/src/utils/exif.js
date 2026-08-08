// EXIF extraction, run *before* compression touches the file.
//
// browser-image-compression sets `preserveExif`, but it re-encodes through a
// <canvas> and canvas strips metadata by default — so the flag is not something
// to bet a geotag on. Reading here, independently, means the pin and the
// capture date survive regardless of what the encoder does with them.

import exifr from 'exifr'

/**
 * A photo without EXIF is the ordinary case, not an error — screenshots,
 * exports, anything that has been through an editor. Every field is nullable
 * and nothing here throws.
 *
 * @param {File} file
 * @returns {Promise<{takenAt: string|null, latitude: number|null, longitude: number|null}>}
 */
export async function readPhotoMeta(file) {
  const empty = { takenAt: null, latitude: null, longitude: null }

  try {
    // Only the two blocks we need. Pulling the whole parser in would cost
    // ~40 KB for tags nothing reads.
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
      gps: true,
    })

    if (!data) return empty

    return {
      takenAt: normalizeDate(data.DateTimeOriginal ?? data.CreateDate),
      latitude: normalizeCoord(data.latitude ?? data.GPSLatitude, 90),
      longitude: normalizeCoord(data.longitude ?? data.GPSLongitude, 180),
    }
  } catch {
    // A malformed or truncated EXIF block must not cost the user the upload.
    return empty
  }
}

/**
 * EXIF timestamps carry no timezone, so exifr hands back a Date built in the
 * browser's local zone. Sending the ISO string keeps that instant intact; the
 * API stores it as UTC.
 */
function normalizeDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  // A camera with a dead clock reports 1970 or 1980; the API rejects the
  // future, and this catches the other end.
  if (date.getUTCFullYear() < 1990) return null

  return date.toISOString()
}

/**
 * exifr already converts GPS from degrees/minutes/seconds when `gps: true`,
 * but a corrupt tag can still yield NaN or an out-of-range value. Drop those
 * rather than pass them on — the API rejects them anyway, and losing one
 * photo's geotag beats losing the upload.
 */
function normalizeCoord(value, limit) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  if (Math.abs(value) > limit) return null

  // 0,0 is Null Island — the signature of a GPS chip that never got a fix.
  if (value === 0) return null

  return value
}

/** Degrees/minutes/seconds to decimal degrees. Exported for testing. */
export function dmsToDecimal([degrees, minutes, seconds], ref) {
  const decimal = degrees + minutes / 60 + seconds / 3600
  return ref === 'S' || ref === 'W' ? -decimal : decimal
}
