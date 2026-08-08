// Getting a photo past the API's 10 MB gate, and no further.
//
// The limit is ours, not Cloudinary's — CloudinaryService.ValidateImageFile()
// throws before Cloudinary is ever called, so the request 400s server-side.
// Kestrel itself accepts 100 MB bodies; the guard is the only thing in the way.
//
// And compression is *not* a page-speed measure here. Cloudinary already
// applies q_auto + f_auto on upload, and cldImage() appends
// f_auto,q_auto,w_{N},c_limit on delivery, so the grid is already serving
// right-sized WebP/AVIF. Compression has exactly one job: get under 10 MB.
// That means compress gently and lose nothing visible.

import imageCompression from 'browser-image-compression'

export const SIZE_LIMIT = 10 * 1024 * 1024

// Leave headroom rather than racing the limit exactly — the multipart envelope
// and the filename both add bytes the client cannot see.
const SKIP_THRESHOLD = SIZE_LIMIT * 0.95

// The four the API accepts. Anything else 400s at ValidateImageFile.
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const COMPRESSION_OPTIONS = {
  maxSizeMB: 9,
  // Generous on purpose: most phone and drone shots stay full-resolution.
  // A 45 MB drone frame at q0.92 and 5000px looks identical at any size the
  // site actually displays.
  maxWidthOrHeight: 5000,
  initialQuality: 0.92,
  useWebWorker: true,
  preserveExif: true,
  fileType: 'image/jpeg',
}

export class UnsupportedImageError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnsupportedImageError'
  }
}

const HEIC_MESSAGE =
  'HEIC photos can’t be uploaded from this browser. On iPhone, set ' +
  'Settings → Camera → Formats to “Most Compatible”, or export the photo ' +
  'as JPEG first.'

/**
 * Reads the ISO base-media `ftyp` box to spot HEIC/HEIF regardless of what the
 * file is called. A `.heic` renamed to `.jpg` still fails to decode, so the
 * extension alone is not enough.
 *
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function isHeic(file) {
  const byName = /\.(heic|heif)$/i.test(file.name)
  const byType = /^image\/hei[cf]/i.test(file.type || '')
  if (byName || byType) return true

  try {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (header.length < 12) return false

    // Bytes 4..8 are the literal string "ftyp"; 8..12 is the brand.
    const box = String.fromCharCode(...header.subarray(4, 8))
    if (box !== 'ftyp') return false

    const brand = String.fromCharCode(...header.subarray(8, 12)).toLowerCase()
    return ['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'mif1', 'msf1']
      .includes(brand)
  } catch {
    return false
  }
}

/**
 * Throws UnsupportedImageError for anything the API would reject anyway, so
 * the failure arrives before the upload instead of as a 400 halfway through
 * a 40-file batch.
 *
 * Deliberately no heic2any: it is over 1 MB, and it would ship to every
 * visitor to fix an upload path only the admin ever uses.
 */
export async function assertSupported(file) {
  if (await isHeic(file)) {
    throw new UnsupportedImageError(HEIC_MESSAGE)
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new UnsupportedImageError(
      `${extension || 'That file type'} isn’t supported. Use JPG, PNG or WebP.`
    )
  }
}

/**
 * Returns the file to upload — possibly the original, untouched.
 *
 * @param {File} file
 * @param {(percent: number) => void} [onProgress] compression progress, 0–100
 * @returns {Promise<File>}
 */
export async function prepareForUpload(file, onProgress) {
  await assertSupported(file)

  // Most shots pass straight through. Recompressing a 3 MB photo only
  // degrades it — there is nothing to gain when it already fits.
  if (file.size <= SKIP_THRESHOLD) {
    onProgress?.(100)
    return file
  }

  const compressed = await imageCompression(file, {
    ...COMPRESSION_OPTIONS,
    onProgress,
  })

  // Compression emits image/jpeg, so the name has to agree or the server's
  // extension check rejects a file it just accepted the bytes of.
  return renameToJpeg(compressed, file.name)
}

function renameToJpeg(blob, originalName) {
  const base = originalName.replace(/\.[^.]+$/, '')
  const name = `${base}.jpg`

  if (blob.name === name) return blob

  return new File([blob], name, {
    type: 'image/jpeg',
    lastModified: blob.lastModified ?? Date.now(),
  })
}
