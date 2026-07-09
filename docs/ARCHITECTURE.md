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
| `Trip` | Title, description, country, city, start/end dates, cover image, `PostStatus` (Draft/Published). Has many `Post`s and `Location`s. Belongs to `User`. |
| `Post` | Title, rich-text HTML `Content` (TipTap output), optional `VideoUrl`, `Status`, `ViewCount`, `PublishedAt`. Belongs to `Trip`. Has many `Photo`s, `Comment`s, `PostTag`s. |
| `Photo` | Cloudinary `Url` + `PublicId`, caption, `MediaType` (Image/Video — **videos are stored as `Photo` rows with `Type = Video`**), `MediaSource` (Phone=0 / Drone=1). |
| `Location` | Place name, description, latitude/longitude. Belongs to `Trip`. Drives the Leaflet map. |
| `Comment` | Public visitor comments on posts (name, email, content). |
| `Tag` / `PostTag` | Many-to-many post tagging. |
| `AboutProfile`, `WorkExperience`, `Skill` | Portfolio/About-page content (bio, headline, socials, CV url, profile/cover images, skill bars by `SkillCategory`). |
| `ContactMessage` | Messages from the About-page contact form (read/unread). |
| `User`, `RefreshToken` | Admin auth (JWT access + refresh tokens). |
| `TimekeepingUser`, `TimeLog` | Separate lightweight timekeeping system with its own auth (`/api/timekeeping/*`), user management and CSV export. |

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
| `/` | `HomePage` | Hero, stats bar, latest trips, map preview, recent posts |
| `/trips` | `TripsPage` | Search + country filter + sort |
| `/trips/:id` | `TripDetailPage` | Hero, posts grid, locations list, info sidebar |
| `/trips/:tripId/posts/:postId` | `PostDetailPage` | Rich-text article, photo gallery (drone/phone tabs + lightbox), video gallery, comments, sidebar |
| `/map` | `MapPage` | Leaflet map of all `Location`s + searchable sidebar list |
| `/timeline` | `TimelinePage` | Trips + posts merged chronologically, grouped by year |
| `/about` | `AboutPage` | Profile, work experience, skill bars, contact form |
| `/login` | `LoginPage` | Admin login |
| `/admin/**` | Admin pages | Protected by `ProtectedRoute` (dashboard, trips, posts + TipTap editor, about profile, timekeeping users) |

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
