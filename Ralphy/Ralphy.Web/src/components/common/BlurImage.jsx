import { useState } from 'react'
import { cldPlaceholder } from '../../utils/cloudinary'

/**
 * A photograph that starts as a tiny blurred preview and fades into the full
 * image once it has downloaded.
 *
 * Renders a positioned wrapper holding two images: the placeholder, and the
 * real one on top at opacity 0 until it loads. An image that is already in the
 * browser cache is detected on mount and shown at once, with no fade, so
 * revisiting a page doesn't replay the effect.
 *
 * @param url          the photo's original (Cloudinary) URL, used for the placeholder
 * @param src          the URL to actually display
 * @param placeholder  overrides the blurred placeholder, e.g. with a smaller
 *                     copy of the same photo that is already cached
 * @param className    wrapper classes (size it here)
 * @param imgClassName classes for the real <img> (object-fit, hover effects)
 * @param style        wrapper style; also where view-transition-name goes
 */
export default function BlurImage({
  url,
  src,
  placeholder,
  alt = '',
  className = '',
  imgClassName = '',
  style,
  ...imgProps
}) {
  const [loadedSrc, setLoadedSrc] = useState(null)
  const loaded = loadedSrc === src
  const preview = placeholder ?? cldPlaceholder(url)

  // A cached image can finish before React attaches onLoad, so check
  // `complete` when the element mounts as well as listening for the event.
  const checkComplete = (img) => {
    if (img?.complete && img.naturalWidth > 0) setLoadedSrc(img.getAttribute('src'))
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}
         data-photo-frame="">
      {/* Stays mounted under the real image so the fade-in never shows the
          page background through it. */}
      {preview && (
        <img
          src={preview}
          alt=""
          aria-hidden="true"
          decoding="sync"
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
      )}
      <img
        key={src}
        ref={checkComplete}
        src={src}
        alt={alt}
        onLoad={() => setLoadedSrc(src)}
        // Opacity for the fade-in; transform so callers can add a hover zoom
        // without fighting over transition-property.
        className={`relative h-full w-full transition-[opacity,transform]
                    duration-700 ease-out motion-reduce:transition-none ${
          loaded || !preview ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        data-main-image=""
        {...imgProps}
      />
    </div>
  )
}
