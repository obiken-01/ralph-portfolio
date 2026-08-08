# Ralphy — Architecture

Ralphy is a two-part application in one repository:

1. **Ralphy API** — .NET 9 Web API, clean architecture, PostgreSQL, Cloudinary media storage.
2. **Ralphy Web** — React 19 SPA (Vite + Tailwind CSS 4) with a public travel-blog site and a JWT-protected admin area.

The backend also serves **external consumers** — currently the [php-currency-converter-app](https://github.com/obiken-01/php-currency-converter-app) (Netlify) uses the API-key-protected shopping-list endpoint.

---

## Backend (`Ralphy/`)

### Project layers

| Project | Responsibility |
|---|---|
| `Ralphy.Domain` | Entities, enums, repository + service interfaces. No dependencies. |
| `Ralphy.Application` | Business services, DTOs, FluentValidation validators, mapping extensions, `ApiResponse<T>` envelope. |
| `Ralphy.Infrastructure` | `AppDbContext` (EF Core + Npgsql), repositories, migrations, Cloudinary service, Anthropic (Claude) service, JWT token + password services, settings classes. |
| `Ralphy.Api` | Controllers, `ExceptionMiddleware`, `ShoppingListApiKey` attribute, Serilog config, `Program.cs`. |

### Domain entities

| Entity | Notes |
|---|---|
| `Post` | Title, **optional** rich-text HTML `Content` (TipTap output), optional `VideoUrl`, `Status`, `ViewCount`, `PublishedAt`, `TakenAt`. Belongs to `User` and to `Location`. Has many `Photo`s, `Comment`s, `PostTag`s. |
| `Photo` | Cloudinary `Url` + `PublicId`, caption, `MediaType` (Image/Video — **videos are stored as `Photo` rows with `Type = Video`**), `SortOrder`, `Width`/`Height`, and EXIF `TakenAt` / `Latitude` / `Longitude`. |
| `Location` | Place name, description, latitude/longitude, `IsPlaceholder`. A **reusable place record** — many posts point at one. Drives the Leaflet map. |
| `Comment` | Public visitor comments on posts (name, email, content). |
| `Tag` / `PostTag` | Many-to-many post tagging. Tags are the grouping mechanism for the photo feed. |
| `AboutProfile`, `WorkExperience`, `Skill` | Portfolio/About-page content (bio, headline, socials, CV url, profile/cover images, skill bars by `SkillCategory`). |
| `ContactMessage` | Messages from the About-page contact form (read/unread). |
| `User`, `RefreshToken` | Admin auth (JWT access + refresh tokens). |
| `TimekeepingUser`, `TimeLog` | Separate lightweight timekeeping system with its own auth (`/api/timekeeping/*`), user management and CSV export. |

### Entity relationships

```
User ──1:N──▶ Post ──1:N──▶ Photo
                │
                ├──N:1──▶ Location
                ├──1:N──▶ Comment
                └──N:M──▶ Tag  (via PostTag)
```

Delete behaviour is deliberate:

| Relationship | On delete | Why |
|---|---|---|
| `User → Post` | `Restrict` | Deleting a user must not silently take their posts. |
| `Location → Post` | `Restrict` | Many posts share one place; deleting a place must never cascade-delete everything pinned to it. `LocationService.DeleteAsync` checks first and throws a readable message rather than letting the constraint surface as `DbUpdateException`. |
| `Post → Photo` | `Cascade` | Photos have no meaning without their post; Cloudinary assets are deleted explicitly first. |
| `Post → Comment` | `Cascade` | Same. |

### Authorization

Every write on the blog side resolves the caller through **`post.UserId`**:

```csharp
if (post.UserId != userId)
    throw new UnauthorizedAccessException("...");
```

`PostService.CreateAsync` is the exception: there is nothing to authorize
against on create, so being authenticated *is* the authorization, and ownership
is taken from the JWT — never from the request body.

`Location` has no per-row owner. It is shared reference data, so the
controller's `[Authorize]` is the whole story there.

> **Before v2.0** this walked `post → trip → trip.UserId` in 14 places, because
> `Post` had no owner of its own. That is why removing `Trip` was a domain
> refactor rather than a frontend one.

### Migration history worth knowing

| Migration | What it did |
|---|---|
| `PhotoFirstSchema` | Added `Post.UserId` / `Post.LocationId` (both required) and `Post.TakenAt`; added the six `Photo` gallery columns; dropped `Location.TripId`; made `Post.TripId` nullable and `Post.Content` optional. Columns were added nullable, backfilled, then tightened — you cannot add a `NOT NULL` FK to a populated table. Every pre-existing post was backfilled onto one seeded placeholder `Location` ("West Philippine Sea", 13.2°N 120.3°E), which the admin "needs location" list exists to clean up. |
| `RemoveMediaSource` | Dropped `Photo.Source` and the Drone/Phone enum. |
| `DropTrip` | Dropped `Post.TripId` and the `Trips` table — the FK first, so the table drop could not cascade through `Post` into `Photo`. Irreversible: trip descriptions were discarded, not merged. |

### Cross-cutting behavior (`Program.cs`)

- **Response envelope**: all endpoints return `ApiResponse<T>` → `{ statusCode, message, data }` (frontend reads `res.data.data`).
- **CORS**: allowlist from `Cors:AllowedOrigins` config; explicit OPTIONS-preflight middleware (adds `X-Api-Key` to allowed headers for external consumers).
- **Rate limiting**: fixed-window `shopping-list` policy — 10 requests/hour → 429.
- **Auto-migration**: `db.Database.Migrate()` on startup with 5 retries (5 s apart) — no manual migration step on deploy.
- **Uploads**: request body limit raised to 100 MB for video uploads.
- **Logging**: Serilog to console + Seq (`http://seq:5341` in compose).
- **Swagger**: Development only, at `/swagger`.
- **Errors**: `ExceptionMiddleware` converts unhandled exceptions into the `ApiResponse` envelope.

### External integrations

- **Cloudinary** (`CloudinaryService`) — all photo/video uploads; entities store the delivery URL + public id (used for deletion).
- **Anthropic Claude** (`AnthropicService`) — vision prompt that OCRs handwritten Filipino shopping lists into structured JSON (`name`, `quantity`, `unit`, `notes`). Exposed via `POST /api/shopping-list/parse`, protected by `X-Api-Key` header (`ShoppingListSettings.ApiKey`) + rate limit.

---

## Frontend (`Ralphy/Ralphy.Web/`)

- **Stack**: React 19, Vite, Tailwind CSS 4 (`@tailwindcss/vite` plugin, `@tailwindcss/typography`), React Router 7, Axios, react-hot-toast, Leaflet/react-leaflet (map), TipTap (admin rich-text editor). `@tanstack/react-query` is installed but data fetching is currently plain `useEffect` + Axios.
- **Serving**: built to `dist/`, served by nginx (SPA fallback `try_files ... /index.html`, 1-year immutable cache for static assets, no-cache for `index.html`).
- **Chunking**: manual vendor chunks for leaflet, tiptap, react-dom/router.

### Routes

| Route | Page | Notes |
|---|---|---|
| `/` | `HomePage` | Hero + stats, recent photos with a tag bar, map banner, timeline preview |
| `/posts` | `PostsFeedPage` | Masonry photo feed, grouped by the month the shutter fired |
| `/posts/:id` | `PostDetailPage` | Gallery-first; prose renders only when present; location, tags, comments |
| `/tags/:name` | `PostsFeedPage` | Same feed, filtered by tag |
| `/map` | `MapPage` | Leaflet map of public `Location`s; a pin opens the posts shot there |
| `/timeline` | `TimelinePage` | Posts in chronological order, grouped by year |
| `/about` | `AboutPage` | Profile, work experience, skill bars, contact form |
| `/login` | `LoginPage` | Admin login |
| `/admin/**` | Admin pages | Protected by `ProtectedRoute` (dashboard, posts + photo uploader, about profile, timekeeping users) |

**Legacy URLs.** `/trips`, `/trips/:id` and `/trips/:tripId/posts/:postId` are
301'd to their `/posts` equivalents by nginx (`nginx.conf`). The sitemap
published the nested post URL from v1, so a client-side `<Navigate>` would read
as a soft redirect and lose the link equity — `App.jsx` keeps matching
`<Navigate>` routes anyway, for in-app links that never reach nginx.

### Photo upload pipeline

1. **EXIF first.** `utils/exif.js` reads `DateTimeOriginal` and GPS off the
   original before anything touches it. Canvas re-encoding strips metadata, and
   `browser-image-compression`'s `preserveExif` is not worth betting a geotag on.
2. **Compress only if needed.** `utils/imagePipeline.js` returns files already
   under ~9.5 MB untouched — recompressing a 3 MB photo only degrades it. Over
   the limit it compresses gently (q0.92, longest edge 5000px). Its single job
   is clearing the API's 10 MB guard; Cloudinary already handles delivery
   optimisation with `q_auto`/`f_auto` on both upload and delivery.
3. **HEIC is rejected up front**, detected by extension, mime type *and* an
   `ftyp` byte sniff — desktop Chrome and Firefox cannot decode it at all, and a
   `.heic` renamed to `.jpg` fails the same way.
4. **Queue.** `hooks/useUploadQueue.js` runs N single-file uploads at up to 3
   concurrent, with per-file progress, per-file failure and per-file retry.

### Auth flow (admin)

`AuthProvider` + `useAuth` hook; access/refresh tokens in `localStorage`; Axios response interceptor performs queued token refresh on 401 (`/auth/refresh`) and redirects to `/login` on failure.

> ⚠️ Known trade-off: refresh token in `localStorage` is XSS-readable. An httpOnly-cookie refresh flow is a candidate hardening item.

### v2.0 public-site redesign (this branch)

v2.0 rebuilds the public pages with an SEO layer and a new visual design. Key additions:

- `src/components/common/Seo.jsx` — per-page `<title>`, meta description, canonical, Open Graph/Twitter tags (React 19 hoists these to `<head>` natively) + JSON-LD structured data (`WebSite`, `BlogPosting`, `Person`, `BreadcrumbList`).
- `index.html` — real default metadata, preconnects to the API and Cloudinary origins.
- `public/robots.txt` — crawler rules + sitemap pointer; `/sitemap.xml` is generated by the API (`SitemapController`) and proxied same-origin by nginx.
- Cloudinary delivery optimization — `optimizeImage()`/`videoPoster()` helpers inject `f_auto,q_auto,w_*` transformations so images ship as WebP/AVIF at the right size.
- Semantic HTML (`article`, `section`, `figure`, real heading hierarchy), `loading="lazy"` images, improved galleries (justified photo grid, lightbox with keyboard navigation, poster-image video cards).

> ⚠️ Remaining SEO limitation: the site is a client-rendered SPA. Google renders it fine, but social-media scrapers (Facebook/Twitter link previews) do not execute JS, so per-page OG tags are invisible to them — they fall back to the defaults in `index.html`. Full fix = prerendering or SSR (e.g. migrating to Next/Astro or adding vite-plugin prerender) — out of scope for v2.0.
