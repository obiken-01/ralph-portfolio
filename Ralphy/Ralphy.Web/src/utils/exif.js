// EXIF extraction, run *before* compression touches the file.
//
// browser-image-compression sets `preserveExif`, but it re-encodes through a
// <canvas> and canvas strips metadata by default — so the flag is not something
// to bet a geotag on. Reading here, independently, means the pin and the
// capture date survive regardless of what the encoder does with them.

import exifr from 'exifr'

const NO_CAMERA = {
  camera: null,
  lens: null,
  fNumber: null,
  exposureTime: null,
  iso: null,
  focalLength: null,
  editedWith: null,
}

/**
 * A photo without EXIF is the ordinary case, not an error — screenshots,
 * social-media downloads, exports with metadata switched off. Every field is
 * nullable and nothing here throws.
 *
 * An edited photo usually still has it: Lightroom, Photoshop and Snapseed carry
 * the camera's own tags through to the export unless told not to.
 *
 * @param {File} file
 * @returns {Promise<{takenAt: string|null, latitude: number|null,
 *   longitude: number|null, camera: typeof NO_CAMERA}>}
 */
export async function readPhotoMeta(file) {
  const empty = { takenAt: null, latitude: null, longitude: null, camera: NO_CAMERA }

  try {
    // Only the tags we use. Parsing every block would cost ~40 KB of
    // dictionaries for tags nothing reads.
    const data = await exifr.parse(file, {
      pick: [
        'DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude',
        'Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO',
        'FocalLength', 'FocalLengthIn35mmFormat', 'Software',
      ],
      gps: true,
    })

    if (!data) return empty

    return {
      takenAt: normalizeDate(data.DateTimeOriginal ?? data.CreateDate),
      latitude: normalizeCoord(data.latitude ?? data.GPSLatitude, 90),
      longitude: normalizeCoord(data.longitude ?? data.GPSLongitude, 180),
      camera: readCamera(data),
    }
  } catch {
    // A malformed or truncated EXIF block must not cost the user the upload.
    return empty
  }
}

function readCamera(data) {
  return {
    camera: cameraName(cleanText(data.Make), cleanText(data.Model)),
    lens: cleanText(data.LensModel),
    fNumber: positive(data.FNumber),
    exposureTime: positive(data.ExposureTime),
    iso: isoValue(Array.isArray(data.ISO) ? data.ISO[0] : data.ISO),
    focalLength: focalLength(data),
    editedWith: editorName(data.Software),
  }
}

/**
 * Make and Model are separate tags, and makers disagree on whether Model
 * repeats the brand: Canon writes "Canon EOS R5", Sony writes "ILCE-7M4".
 */
function cameraName(make, model) {
  if (!model) return make
  if (!make) return model

  const brand = make.split(/\s+/)[0]
  if (model.toLowerCase().startsWith(brand.toLowerCase())) return model

  // SONY -> Sony, but DJI and LG stay as written.
  const shown = brand.length > 3 && brand === brand.toUpperCase()
    ? brand[0] + brand.slice(1).toLowerCase()
    : brand
  return `${shown} ${model}`
}

/**
 * A phone lens is a few millimetres, which means nothing to anyone; the 35mm
 * equivalent is the number people quote. A camera lens is quoted as marked,
 * so a 23mm on APS-C stays 23mm.
 */
function focalLength(data) {
  const real = positive(data.FocalLength)
  const equivalent = positive(data.FocalLengthIn35mmFormat)
  if (real != null && real < 10 && equivalent != null) return equivalent
  return real ?? equivalent
}

// Order matters: Lightroom identifies itself as "Adobe Photoshop Lightroom".
const EDITORS = [
  [/lightroom/i, 'Lightroom'],
  [/photoshop/i, 'Photoshop'],
  [/capture one/i, 'Capture One'],
  [/snapseed/i, 'Snapseed'],
  [/vsco/i, 'VSCO'],
  [/darktable/i, 'darktable'],
  [/luminar/i, 'Luminar'],
  [/affinity/i, 'Affinity Photo'],
  [/gimp/i, 'GIMP'],
]

/**
 * Software is also where cameras and phones write their firmware version
 * ("17.4.1", "ILCE-7M4 v2.01"), so only a recognised editor counts.
 */
function editorName(software) {
  if (typeof software !== 'string') return null
  const match = EDITORS.find(([pattern]) => pattern.test(software))
  return match ? match[1] : null
}

/**
 * The API binds ISO to an int, so a corrupt tag past that range would fail
 * the whole upload rather than just this field.
 */
function isoValue(value) {
  const iso = positive(value)
  return iso != null && iso <= 10_000_000 ? Math.round(iso) : null
}

/** EXIF strings are often NUL-padded to a fixed width. */
function cleanText(value) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\0/g, '').trim()
  return text || null
}

/** Cameras write 0 for "not recorded"; treat it, and junk, as absent. */
function positive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
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
