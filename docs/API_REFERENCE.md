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

## Trips — `/api/trips`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/trips` | 🌐 | Published trips |
| GET | `/trips/{id}` | 🌐 | Trip detail (includes locations) |
| GET | `/trips/{id}/posts` | 🌐 | Posts of a trip |
| GET | `/trips/all` | 🔒 | All trips incl. drafts (admin) |
| POST/PUT/DELETE | `/trips`, `/trips/{id}` | 🔒 | CRUD |
| PUT | `/trips/{id}/publish` · `/unpublish` | 🔒 | Status toggle |

## Posts — `/api/posts`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/posts` | 🌐 | Published posts (includes photos) |
| GET | `/posts/{id}` | 🌐 | Post detail (increments view count) |
| GET | `/posts/trip/{tripId}` | 🌐 | Published posts for a trip |
| GET | `/posts/all` | 🔒 | All posts incl. drafts |
| POST/PUT/DELETE | `/posts`, `/posts/{id}` | 🔒 | CRUD |
| PUT | `/posts/{id}/publish` · `/unpublish` | 🔒 | Status toggle |

## Photos — `/api/photos` · Videos — `/api/videos`

Same shape for both (videos are `Photo` rows with `MediaType.Video`):

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/photos/post/{postId}` | 🌐 | All media for a post |
| GET | `/photos/post/{postId}/phone` · `/drone` | 🌐 | Filtered by `MediaSource` |
| POST | `/photos/upload/{postId}` | 🔒 | Multipart upload → Cloudinary (videos ≤ 100 MB) |
| DELETE | `/photos/{id}` | 🔒 | Delete (also removes from Cloudinary) |

## Locations — `/api/locations`

| Method | Route | Auth |
|---|---|---|
| GET | `/locations` (all) · `/locations/trip/{tripId}` | 🌐 |
| POST / PUT `/{id}` / DELETE `/{id}` | 🔒 |

## Comments — `/api/comments`

| Method | Route | Auth |
|---|---|---|
| GET | `/comments/post/{postId}` | 🌐 |
| POST | `/comments/post/{postId}` (`authorName`, `authorEmail`, `content` ≤ 1000 chars) | 🌐 |
| DELETE | `/comments/{id}` | 🔒 |

## Tags — `/api/tags`

| Method | Route | Auth |
|---|---|---|
| GET | `/tags` | 🌐 |
| POST `/tags`, `/tags/assign/{postId}`; DELETE `/tags/remove/{postId}`, `/tags/{id}` | 🔒 |

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
| GET | `/sitemap.xml` | 🌐 | XML sitemap of public pages + published trips/posts. Proxied same-origin by the web container's nginx at `https://<web-domain>/sitemap.xml`. |
