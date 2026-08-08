# Ralphy — API Reference

Base URL (production): `https://ralph-portfolio-production.up.railway.app/api`
(Note: `ralph-portfolio-production.up.railway.app` is the **API**; `ralphy-production.up.railway.app` serves the **web app**.)
Base URL (local): `http://localhost:5000/api`

All responses use the envelope:

```json
{ "statusCode": 200, "message": "OK", "data": { ... } }
```

Validation failures return `{ "statusCode": 400, "message": "Validation failed", "errors": [ ... ] }`.

**Auth legend**: 🌐 public · 🔒 JWT bearer (admin) · 🔑 `X-Api-Key` header · ⏱ rate-limited

## Auth — `/api/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | Register admin user |
| POST | `/auth/login` | 🌐 | Login → access + refresh tokens |
| POST | `/auth/refresh` | 🌐 | Exchange refresh token |
| POST | `/auth/revoke` | 🔒 | Revoke refresh token |
| GET | `/auth/me` | 🔒 | Current user |

> **v2.0 — `Trip` is gone.** Ownership and location moved onto `Post`, and the
> `MediaSource` (Drone/Phone) enum was removed. `/api/trips/*`,
> `/api/posts/trip/{tripId}`, `/api/locations/trip/{tripId}` and the four
> `/phone` · `/drone` media routes no longer exist. Old page URLs
> (`/trips`, `/trips/{id}`, `/trips/{tripId}/posts/{postId}`) are 301'd to
> their `/posts` equivalents by the web container's nginx.

## Posts — `/api/posts`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/posts` | 🌐 | Published feed (photos, tags, location) |
| GET | `/posts?tag={name}` | 🌐 | Same feed, filtered by tag (case-insensitive) |
| GET | `/posts/{id}` | 🌐 | Post detail (increments view count) |
| GET | `/posts/location/{locationId}` | 🌐 | Published posts at a place |
| GET | `/posts/all` | 🔒 | All posts incl. drafts |
| POST/PUT/DELETE | `/posts`, `/posts/{id}` | 🔒 | CRUD |
| PUT | `/posts/{id}/publish` · `/unpublish` | 🔒 | Status toggle |

`locationId` is **required** on create and update. `content` is **optional** —
a photo-first post needs no prose. Ownership is taken from the JWT; a `userId`
in the request body is ignored.

Post payload adds: `userId`, `takenAt` (earliest EXIF timestamp across its
photos), `locationId`, `locationName`, `locationIsPlaceholder`, `tags[]`,
`thumbnailWidth`, `thumbnailHeight`.

## Photos — `/api/photos` · Videos — `/api/videos`

Same shape for both (videos are `Photo` rows with `MediaType.Video`):

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/photos/post/{postId}` | 🌐 | Media for a post, in `sortOrder` |
| POST | `/photos/upload/{postId}` | 🔒 | Multipart upload → Cloudinary |
| PATCH | `/photos/{id}` | 🔒 | Edit caption (≤ 300 chars) |
| PUT | `/photos/post/{postId}/order` | 🔒 | Reorder — body `{ "photoIds": [12, 9, 31] }` |
| DELETE | `/photos/{id}` | 🔒 | Delete (also removes from Cloudinary) |

**Upload form fields.** `file` is required; `caption`, `sortOrder`, `takenAt`
(ISO-8601), `latitude` and `longitude` are optional. The browser reads EXIF off
the original *before* compressing — canvas re-encoding strips it — and posts the
values alongside the file. Out-of-range coordinates and future timestamps are
rejected rather than clamped. An absent `sortOrder` means "next", not "first".

**The 10 MB image limit is ours, not Cloudinary's.** `CloudinaryService.
ValidateImageFile()` throws before Cloudinary is ever called, so the request
400s server-side. Kestrel accepts 100 MB bodies (`Program.cs`); the guard is the
only thing in the way, and it is shared with CV and profile-image upload, so do
not raise it for the gallery's sake. Allowed extensions: `.jpg .jpeg .png
.webp`. Videos: `.mp4 .mov .avi .mkv`, 100 MB.

Reorder returns **400** unless `photoIds` is exactly the post's photos, each
listed once — a partial list would leave the sequence half-rewritten.

Photo payload adds: `sortOrder`, `width`, `height`, `takenAt`, `latitude`,
`longitude`. Width and height come free off the Cloudinary upload result and
are what let the grid reserve the right box before an image decodes.

## Locations — `/api/locations`

A `Location` is a reusable place record: many posts point at one, and it no
longer belongs to a trip or to a single user. Any authenticated admin may
manage them.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/locations` | 🌐 | Places with ≥1 published post, placeholder excluded |
| GET | `/locations/all` | 🔒 | Every place, for the admin picker |
| GET | `/locations/{id}` | 🌐 | One place |
| POST / PUT `/{id}` / DELETE `/{id}` | 🔒 | CRUD |

`DELETE` returns **400** while any post still references the place —
`Post.LocationId` is a `Restrict` FK, and this turns an opaque
`DbUpdateException` into a sentence.

`isPlaceholder` flags the "West Philippine Sea" row seeded by the v2.0
migration, which every pre-existing post was backfilled onto. It is excluded
from the public map and drives the admin "needs location" cleanup list.

## Comments — `/api/comments`

| Method | Route | Auth |
|---|---|---|
| GET | `/comments/post/{postId}` | 🌐 |
| POST | `/comments/post/{postId}` (`authorName`, `authorEmail`, `content` ≤ 1000 chars) | 🌐 |
| DELETE | `/comments/{id}` | 🔒 |

## Tags — `/api/tags`

Tags replace `Trip` as the grouping mechanism.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/tags` | 🌐 | Tags with ≥1 published post, most-used first, with `postCount` |
| GET | `/tags/all` | 🔒 | Every tag incl. unused, for the admin picker |
| GET | `/tags/{name}/posts` | 🌐 | Published posts carrying a tag — **404** on an unknown tag |
| POST | `/tags`, `/tags/assign/{postId}` | 🔒 | Assign **replaces** the post's whole tag set |
| DELETE | `/tags/remove/{postId}`, `/tags/{id}` | 🔒 | |

Names are stored lowercase and trimmed, and matched case-insensitively — so
`/tags/Paluan/posts` and `/tags/paluan/posts` reach the same rows.

## About / Portfolio — `/api/about`

| Method | Route | Auth |
|---|---|---|
| GET | `/about` (profile + experiences + skills) | 🌐 |
| PUT | `/about` | 🔒 |
| POST/PUT/DELETE | `/about/experience[/{id}]`, `/about/skills[/{id}]` | 🔒 |
| POST/DELETE | `/about/cv` · POST `/about/profile-image`, `/about/cover-image` | 🔒 |

## Contact — `/api/contact`

| Method | Route | Auth |
|---|---|---|
| POST | `/contact` (send message) | 🌐 |
| GET | `/contact/messages`, `/contact/messages/unread-count` | 🔒 |
| PATCH | `/contact/messages/{id}/read` · DELETE `/contact/messages/{id}` | 🔒 |

## Shopping List — `/api/shopping-list` (external consumer endpoint)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/shopping-list/parse` | 🔑 ⏱ 10/hour | Multipart `image` (≤ 10 MB) → Claude vision OCR → JSON array of `{ name, quantity, unit, notes }`. Consumed by the [php-currency-converter-app](https://github.com/obiken-01/php-currency-converter-app) on Netlify. |

## Timekeeping — `/api/timekeeping` (separate mini-app)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/timekeeping/auth/login` · `/refresh` · `/revoke`; GET `/me` | 🌐/🔒 | Timekeeping-user auth (separate from admin) |
| GET/POST/PUT/DELETE | `/timekeeping/logs[/{id}]` | 🔒 (timekeeping JWT) | Time-log CRUD, `DateOnly` filters |
| GET | `/timekeeping/logs/export` | 🔒 | CSV export |
| CRUD | `/timekeeping/admin/users...` (+ reset-password, activate/deactivate) | 🔒 (admin) | Manage timekeeping users |

## Sitemap (v2.0)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/sitemap.xml` | 🌐 | XML sitemap of public pages + published posts + tag pages. Proxied same-origin by the web container's nginx at `https://<web-domain>/sitemap.xml`. |
