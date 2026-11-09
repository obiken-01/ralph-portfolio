import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import api from '../../api/axios'
import { fetchCached, peekCache } from '../../api/cache'
import { usePhotoViewer } from '../../hooks/usePhotoViewer'
import BlurImage from '../../components/common/BlurImage'
import { formatDate, formatShortDate, stripHtml, truncateText } from '../../utils/helpers'
import { cldImage, cldVideo, cldVideoPoster } from '../../utils/cloudinary'
import Seo, { SITE_URL, AUTHOR_LD } from '../../components/common/Seo'
import Lightbox from '../../components/public/Lightbox'
import TagChips from '../../components/public/TagChips'

// ── Breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ postTitle, onDark = false }) {
  // Over a photograph the links need to be near-white with a shadow; over the
  // page ground they need to be grey. Same markup, two grounds.
  const base = onDark ? 'text-white/70' : 'text-slate-400'
  const link = onDark
    ? 'text-white/85 hover:text-white drop-shadow'
    : 'text-slate-500 hover:text-teal-700'
  const current = onDark ? 'text-white/70 drop-shadow' : 'text-slate-600'

  return (
    <nav aria-label="Breadcrumb"
         className={`flex flex-wrap items-center gap-1.5 text-xs ${base}`}>
      <Link viewTransition to="/" className={`transition-colors ${link}`}>Home</Link>
      <span aria-hidden="true">/</span>
      <Link viewTransition to="/posts" className={`transition-colors ${link}`}>Photos</Link>
      <span aria-hidden="true">/</span>
      <span className={`max-w-[180px] truncate ${current}`}>{postTitle}</span>
    </nav>
  )
}

// ── Photo Gallery ───────────────────────────────────────────────
/**
 * Full bleed, one photograph per band, edge to edge.
 *
 * Nothing is cropped: the wrapper is given the photo's real aspect ratio so
 * the browser reserves exactly the right box before the image decodes, and a
 * tall portrait is capped at the viewport height rather than running off the
 * bottom of the screen.
 */
function PhotoGallery({ photos, lead, viewer }) {
  if (!photos?.length) return null

  const rest = lead ? photos.slice(1) : photos
  const offset = lead ? 1 : 0

  return (
    <section aria-labelledby="gallery-heading" className="flex flex-col gap-1">
      <h2 id="gallery-heading" className="sr-only">Photo gallery</h2>

      {rest.map((photo, i) => {
        const index = i + offset
        const aspect = photo.width > 0 && photo.height > 0
          ? photo.width / photo.height
          : null

        return (
          <figure key={photo.id} className="reveal m-0">
            <button
              ref={viewer.sourceRef(index)}
              onClick={() => viewer.open(index)}
              className="group relative block w-full cursor-zoom-in overflow-hidden
                         bg-slate-100 focus:outline-none focus-visible:ring-2
                         focus-visible:ring-inset focus-visible:ring-teal-500"
              aria-label={photo.caption || `Open photo ${index + 1} full screen`}
              // Portraits would otherwise be taller than the screen at full
              // width, so nothing but the middle of the photo is ever visible.
              style={aspect ? { aspectRatio: aspect, maxHeight: '88vh' } : undefined}
            >
              <BlurImage
                url={photo.url}
                src={cldImage(photo.url, 2000)}
                alt={photo.caption || ''}
                loading={index < 2 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                width={photo.width || undefined}
                height={photo.height || undefined}
                className="h-full w-full"
                imgClassName="object-contain"
              />
            </button>

            {photo.caption && (
              <figcaption className="mx-auto max-w-3xl px-4 pb-2 pt-3 text-sm
                                     text-slate-500 sm:px-6">
                {photo.caption}
              </figcaption>
            )}
          </figure>
        )
      })}
    </section>
  )
}

// ── Full-bleed hero ─────────────────────────────────────────────
/**
 * The lead photograph with the title set over it.
 *
 * Takes plain fields rather than the post, so it can be drawn from the
 * preview a grid tile hands over (see PostCard) before the post has loaded.
 * That's what lets the tile's photo morph straight into this one.
 *
 * Clicking the photo opens it full screen.
 */
function Hero({
  title, locationName, date, photoUrl, aspect = 3 / 2, previewSrc,
  photoCount, onOpen, sourceRef,
}) {
  if (!photoUrl) {
    return (
      <header className="mx-auto max-w-3xl px-4 pb-8 pt-14 text-center sm:px-6">
        {locationName && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]
                        text-teal-700">
            {locationName}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold leading-tight
                       text-slate-900 sm:text-5xl">
          {title}
        </h1>
        {date && (
          <p className="mt-5 text-sm text-slate-400">
            <time dateTime={date}>{formatDate(date)}</time>
          </p>
        )}
      </header>
    )
  }

  const photo = (
    <BlurImage
      url={photoUrl}
      src={cldImage(photoUrl, 2000)}
      placeholder={previewSrc}
      alt=""
      fetchPriority="high"
      decoding="async"
      className="vt-post-photo h-full w-full"
      imgClassName="object-cover"
    />
  )

  return (
    <header className="relative bg-slate-950">
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: aspect, maxHeight: '80vh' }}
      >
        {/* `drift`: the photo scrolls a little slower than the page.
            Always this same button, disabled until the post has loaded, so
            the photo element is never swapped out: a page transition that's
            still morphing into it would be cancelled if it were. */}
        <button
          ref={sourceRef}
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          aria-label={`Open “${title}” photo full screen`}
          className="drift absolute inset-0 block h-full w-full
                     enabled:cursor-zoom-in focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-inset
                     focus-visible:ring-white"
        >
          {photo}
        </button>

        {/* The scrim is anchored to the text, not the whole frame, so a bright
            photo keeps its brightness everywhere the title isn't. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0
                        bg-gradient-to-t from-slate-950/85 via-slate-950/35
                        to-transparent px-4 pb-8 pt-24 sm:px-6 sm:pb-12">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 flex flex-wrap items-center gap-x-2 text-xs
                          font-semibold uppercase tracking-[0.18em]
                          text-white/75">
              {locationName && <span>{locationName}</span>}
              {locationName && date && <span aria-hidden="true">·</span>}
              {date && <time dateTime={date}>{formatDate(date)}</time>}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight
                           text-white drop-shadow-sm sm:text-5xl">
              {title}
            </h1>
            {photoCount > 0 && (
              <p className="mt-3 text-xs text-white/60">
                {photoCount} {photoCount === 1 ? 'photograph' : 'photographs'}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

/** Placeholder for the rest of the page while a previewed post loads. */
function BodySkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6"
         aria-hidden="true">
      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

// ── Video Gallery ───────────────────────────────────────────────
function VideoGallery({ videos }) {
  if (!videos?.length) return null

  return (
    <section aria-labelledby="videos-heading" className="mt-12">
      <h2 id="videos-heading"
          className="mb-6 font-display text-2xl font-semibold text-slate-900">
        Videos
        <span className="ml-2 align-middle text-sm font-normal text-slate-400">
          ({videos.length})
        </span>
      </h2>

      <div className="space-y-8">
        {videos.map((video) => (
          <figure key={video.id}
                  className="overflow-hidden rounded-2xl bg-white ring-1
                             ring-slate-900/5">
            <video
              src={cldVideo(video.url)}
              poster={cldVideoPoster(video.url) ?? undefined}
              controls
              preload="none"
              playsInline
              className="aspect-video w-full bg-slate-950 object-contain"
            />
            {video.caption && (
              <figcaption className="px-5 py-4 text-sm text-slate-600">
                {video.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}

// ── Location card ───────────────────────────────────────────────
function LocationCard({ post }) {
  // A post still sitting on the placeholder is mid-cleanup — showing
  // "West Philippine Sea" to a reader would be worse than showing nothing.
  if (!post.locationName || post.locationIsPlaceholder) return null

  return (
    <Link viewTransition
      to="/map"
      className="group mt-12 flex items-center gap-4 rounded-2xl bg-white p-5
                 ring-1 ring-slate-900/5 transition-shadow hover:shadow-lg"
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center
                       rounded-xl bg-teal-50 text-xl" aria-hidden="true">
        📍
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest
                      text-teal-700">
          Shot at
        </p>
        <p className="mt-0.5 truncate font-display text-lg font-semibold
                      text-slate-900 transition-colors group-hover:text-teal-700">
          {post.locationName}
        </p>
        {post.latitude != null && post.longitude != null && (
          <p className="font-mono text-xs text-slate-400">
            {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
          </p>
        )}
      </div>
      <span className="text-teal-700 transition-transform
                       group-hover:translate-x-1" aria-hidden="true">→</span>
    </Link>
  )
}

// ── Comments ────────────────────────────────────────────────────
function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    authorName: '', authorEmail: '', content: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get(`/comments/post/${postId}`)
      .then((res) => setComments(res.data.data ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [postId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/comments/post/${postId}`, form)
      setSubmitted(true)
      setForm({ authorName: '', authorEmail: '', content: '' })
      const res = await api.get(`/comments/post/${postId}`)
      setComments(res.data.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    `rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base
     sm:text-sm text-slate-700 placeholder-slate-400 transition
     focus:border-transparent focus:outline-none focus:ring-2
     focus:ring-teal-500`

  return (
    <section aria-labelledby="comments-heading" className="mt-14">
      <h2 id="comments-heading"
          className="mb-6 font-display text-2xl font-semibold text-slate-900">
        Comments
        <span className="ml-2 align-middle text-sm font-normal text-slate-400">
          ({comments.length})
        </span>
      </h2>

      {loading ? (
        <div className="mb-8 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex animate-pulse gap-3">
              <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="mb-8 text-sm text-slate-400">
          No comments yet — be the first!
        </p>
      ) : (
        <ul className="mb-10 space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}
                className="flex gap-3 border-b border-slate-100 pb-5
                           last:border-0 last:pb-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center
                               justify-center rounded-full bg-teal-50 text-sm
                               font-semibold text-teal-700 ring-1
                               ring-teal-100">
                {comment.authorName?.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatShortDate(comment.createdAt)}
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {submitted ? (
        <div className="rounded-2xl bg-emerald-50 p-5 text-center ring-1
                        ring-emerald-100">
          <p className="text-sm font-semibold text-emerald-700">
            ✅ Comment submitted — thank you!
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-1 text-xs text-emerald-600 hover:underline"
          >
            Leave another comment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}
              className="rounded-2xl bg-white p-6 ring-1 ring-slate-900/5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">
            Leave a comment
          </h3>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Your name"
              aria-label="Your name"
              value={form.authorName}
              onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              required
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Your email"
              aria-label="Your email"
              value={form.authorEmail}
              onChange={(e) => setForm({ ...form, authorEmail: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Write a comment..."
            aria-label="Comment"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={3}
            maxLength={1000}
            className={`${inputClass} w-full resize-none`}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {form.content.length}/1000
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-full bg-teal-600
                         px-6 py-2.5 text-sm font-semibold text-white
                         transition-colors hover:bg-teal-500
                         disabled:bg-teal-400"
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full
                                   border-2 border-white border-t-transparent" />
                  Posting...
                </>
              ) : 'Post comment'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// ── Main Page ───────────────────────────────────────────────────
export default function PostDetailPage() {
  const { id } = useParams()
  // Keyed so moving from one post to another starts from fresh state.
  return <PostDetail key={id} id={id} />
}

function PostDetail({ id }) {
  // Handed over by the grid tile that was clicked; absent on a direct visit.
  const preview = useLocation().state?.preview
  const cacheKey = `post:${id}`
  const cached = peekCache(cacheKey)

  const [post, setPost] = useState(cached?.post ?? null)
  const [photos, setPhotos] = useState(cached?.photos ?? [])
  const [videos, setVideos] = useState(cached?.videos ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)
  const viewer = usePhotoViewer({ syncUrl: true })

  useEffect(() => {
    let cancelled = false

    fetchCached(cacheKey, async () => {
      const [postRes, photosRes, videosRes] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/photos/post/${id}`),
        api.get(`/videos/post/${id}`),
      ])
      return {
        post: postRes.data.data,
        photos: photosRes.data.data ?? [],
        videos: videosRes.data.data ?? [],
      }
    })
      .then((data) => {
        if (cancelled) return
        setPost(data.post)
        setPhotos(data.photos)
        setVideos(data.videos)
      })
      .catch(() => { if (!cancelled) setError('Post not found.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id, cacheKey])

  // With a preview from the clicked tile, the page renders straight away
  // (below) and fills in as the data arrives.
  const showPreview = loading && !!preview

  if (loading && !showPreview) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4
                        border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (!showPreview && (error || !post)) {
    return (
      <div className="flex min-h-screen flex-col items-center
                      justify-center gap-4">
        <span className="text-5xl" aria-hidden="true">📷</span>
        <h1 className="font-display text-xl font-bold text-slate-700">
          Post not found
        </h1>
        <Link viewTransition to="/posts" className="text-sm text-teal-700 hover:underline">
          ← Back to Photos
        </Link>
      </div>
    )
  }

  const cover = photos[0]
  const date = post ? post.takenAt ?? post.publishedAt : preview.date

  // With content optional, fall back to the place and the date rather than
  // shipping an empty meta description.
  const description = !post ? ''
    : post.content
      ? truncateText(stripHtml(post.content), 160)
      : [post.locationName, date && formatDate(date)].filter(Boolean).join(' · ')
        || post.title

  const hero = post
    ? {
        title: post.title,
        locationName: post.locationIsPlaceholder ? null : post.locationName,
        photoUrl: cover?.url,
        aspect: cover?.width > 0 && cover?.height > 0
          ? cover.width / cover.height
          : preview?.aspect,
        // Only when it's the same photo the tile showed.
        previewSrc: preview?.photoUrl === cover?.url ? preview?.previewSrc : undefined,
        photoCount: photos.length,
      }
    : {
        title: preview.title,
        locationName: preview.locationIsPlaceholder ? null : preview.locationName,
        photoUrl: preview.photoUrl,
        aspect: preview.aspect,
        previewSrc: preview.previewSrc,
        photoCount: preview.photoCount,
      }

  return (
    <div className="relative min-h-screen">
      {post && (
          <Seo
            title={post.title}
            description={description}
            image={cover?.url}
            type="article"
            path={`/posts/${post.id}`}
            jsonLd={{
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description,
              datePublished: post.publishedAt,
              author: AUTHOR_LD,
              image: photos.slice(0, 3).map((p) => p.url),
              mainEntityOfPage: `${SITE_URL}/posts/${post.id}`,
            }}
          />
      )}

      {/* Breadcrumb floats over the hero so the photograph starts at the very
          top of the page rather than below a bar of chrome. */}
      <div className="absolute inset-x-0 top-0 z-10 mx-auto max-w-5xl px-4
                      pt-4 sm:px-6">
        <Breadcrumb postTitle={hero.title} onDark={!!hero.photoUrl} />
      </div>

      <article>
        <Hero
          {...hero}
          date={date}
          onOpen={post && cover ? () => viewer.open(0) : undefined}
          sourceRef={viewer.sourceRef(0)}
        />

        {!post && <BodySkeleton />}

        {/* Photos lead. Words, if there are any, come after. */}
        <PhotoGallery photos={photos} lead={!!cover} viewer={viewer} />

        {viewer.index !== null && photos[viewer.index] && (
          <Lightbox
            photos={photos}
            index={viewer.index}
            onClose={viewer.close}
            onNavigate={viewer.navigate}
            previewSrc={viewer.previewSrc}
          />
        )}

        {post && (
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            {post.content && (
              <div
                className="reveal prose prose-slate prose-lg mt-12
                           prose-headings:font-display
                           prose-headings:font-semibold
                           prose-a:text-teal-700 prose-img:rounded-2xl"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            )}

            <div className="mt-12 flex flex-wrap items-center justify-between
                            gap-4 border-t border-slate-200 pt-6">
              {post.tags?.length > 0
                ? <TagChips tags={post.tags} />
                : <span />}
              {post.viewCount > 0 && (
                <span className="text-xs text-slate-400">
                  {post.viewCount} views
                </span>
              )}
            </div>
          </div>
        )}
      </article>

      {post && (
        <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
          <VideoGallery videos={videos} />

          <LocationCard post={post} />

          <div className="mt-10 flex items-center justify-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest
                             text-slate-400">
              Share
            </span>
            <a
              href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-slate-900 px-5 py-2 text-xs
                         font-semibold text-white transition-opacity
                         hover:opacity-85"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
              target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-slate-200 px-5 py-2 text-xs
                         font-semibold text-slate-700 transition-colors
                         hover:border-teal-600 hover:text-teal-700"
            >
              X / Twitter
            </a>
          </div>

          <Comments postId={id} />
        </div>
      )}
    </div>
  )
}
