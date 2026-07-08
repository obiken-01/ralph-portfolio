// Cloudinary delivery-URL helpers.
// Inserting transformations after `/upload/` lets Cloudinary serve
// right-sized WebP/AVIF instead of the full-resolution original.

const UPLOAD_SEGMENT = '/upload/'

const isCloudinary = (url) =>
  typeof url === 'string' && url.includes(UPLOAD_SEGMENT)

/**
 * Optimized image URL: auto format + quality, capped width.
 * Non-Cloudinary URLs pass through untouched.
 */
export function cldImage(url, width = 800) {
  if (!isCloudinary(url)) return url
  return url.replace(
    UPLOAD_SEGMENT,
    `${UPLOAD_SEGMENT}f_auto,q_auto,w_${width},c_limit/`
  )
}

/**
 * Poster/thumbnail JPEG for a Cloudinary-hosted video
 * (first frame). Returns null for non-Cloudinary URLs.
 */
export function cldVideoPoster(url, width = 800) {
  if (!isCloudinary(url)) return null
  return url
    .replace(
      UPLOAD_SEGMENT,
      `${UPLOAD_SEGMENT}so_0,f_jpg,q_auto,w_${width},c_limit/`
    )
    .replace(/\.\w+(\?.*)?$/, '.jpg')
}

/** Auto-quality video delivery URL. */
export function cldVideo(url) {
  if (!isCloudinary(url)) return url
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}q_auto/`)
}
