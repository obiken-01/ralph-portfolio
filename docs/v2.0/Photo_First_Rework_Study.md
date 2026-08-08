<!-- Committed alongside the code it produced. Do not edit as a live spec. -->

> ## Status: implemented in v2.0 — read the corrections first
>
> This is the original Claude-chat study, kept verbatim as the record of how the
> rework was scoped. It was **verified against the codebase on 2026-08-08** and
> is accurate on every load-bearing claim: Trip really is the ownership root
> (the check count is 14, not 12 — `VideoService` and `LocationService` each
> have one more than the study counted), `Location.TripId` really is a required
> FK, `Post.TripId` really was non-nullable with cascade delete, and the 10 MB
> limit really is our own guard in `ValidateImageFile`.
>
> Six things it either got wrong or left out, all corrected in the shipped work:
>
> 1. **"Tags: backend work roughly zero"** — true of *writing* tags, false of
>    *reading* them. There was no way to ask "which posts have this tag?".
>    `GET /tags/{name}/posts`, `GET /posts?tag=`, and `TagDto.PostCount` are all
>    new (RAL-211).
> 2. **`GET /posts/all` never included `Photos`** — `PostRepository` doesn't
>    override `GetAllAsync`, so it fell through to `BaseRepository`'s bare
>    `ToListAsync()` and every admin row had a null thumbnail. On a photo-first
>    admin list that is the whole point of the row.
> 3. **Cloudinary already returns `Width`/`Height`** on the upload result and
>    `PhotoService` was discarding them. No new API call was needed for the
>    masonry grid — just stop throwing the numbers away.
> 4. **HEIC is worse than the study suggests.** The filename/extension issue is
>    only half of it: `browser-image-compression` decodes via `<canvas>`, and
>    desktop Chrome and Firefox cannot decode HEIC *at all*. Detection now
>    includes an `ftyp` byte sniff, because a `.heic` renamed to `.jpg` fails
>    identically.
> 5. **301 redirects need nginx, not React.** `<Navigate replace>` is a
>    client-side rewrite; Google reads it as a soft redirect. The rules live in
>    `Ralphy.Web/nginx.conf`.
> 6. **`Location.TripId` cannot survive Phase 1.** The study's phasing implies
>    `LocationService.GetByTripIdAsync` lives until Phase 3, but dropping the
>    column in Phase 1 kills it immediately. It went in Phase 1.
>
> Also added beyond the study's scope: the repo had **zero tests**, and v2.0
> rewrote 14 authorization checks. `Ralphy.Tests` (xUnit over in-memory SQLite)
> and Vitest now exist, and CI no longer swallows failures.
>
> Deferred, not cancelled: AI-assisted description drafting.
> `AnthropicService` already exists, so the plumbing is in place.
>
> Tickets: RAL-208 … RAL-220 under milestone *v2.0 — Photo-First Blog Rework*.

---

# Ralphy — Photo-First Blog Rework: Code Study

**Repo:** `obiken-01/ralph-portfolio` @ `main`
**Scope studied:** `Ralphy.Web` (React frontend), `Ralphy.Api`, `Ralphy.Application`, `Ralphy.Domain`, `Ralphy.Infrastructure`
**Goal:** photo-first posts · remove Trip · multi-image upload · client-side compression under the 10 MB limit

> **Out of scope — the portfolio side stays exactly as it is.**
> `AboutProfile`, `WorkExperience`, `Skill`, `ContactMessage`, `AboutService`, `AboutController`, `ContactController`, `AboutPage.jsx`, `AdminAboutPage.jsx`, and CV/profile-image upload are **fully isolated** — verified: zero references to `Trip` or `Post` in any of them. Do not modify these files. The one shared surface is `CloudinaryService`, used by both; changes there (e.g. the 10 MB guard) must not break CV or profile-image upload.

---

## 1. Stack as it stands

| Layer | What's there |
|---|---|
| Frontend | React 19, Vite 8, Tailwind 4, react-router-dom 7, axios, TipTap 3 (rich text), Leaflet + react-leaflet, react-hot-toast |
| Backend | .NET Clean Architecture — Api / Application / Domain / Infrastructure, AutoMapper, FluentValidation |
| DB | PostgreSQL (`UseNpgsql`), EF Core, 8 migrations |
| Media | Cloudinary via `CloudinaryDotNet` |

**Not installed:** any image-compression library, any EXIF reader. Both will need adding.

---

## 2. The headline finding

> **Removing Trip is not a frontend rework. Trip is the ownership root and the location root of the entire domain.**

Three hard couplings:

**a) Authorization runs through Trip.** There are **12 ownership checks** across the services, and every one of them resolves the current user by walking `post → trip → trip.UserId`:

```csharp
// PhotoService.UploadPhotoAsync
var trip = await _unitOfWork.Trips.GetByIdAsync(post.TripId);
if (trip == null || trip.UserId != userId)
    throw new UnauthorizedAccessException(...);
```

Same pattern in `PostService` (×5), `PhotoService` (×2), `VideoService`, `CommentService`, `TagService` (×2), `LocationService` (×3). Delete Trip and **every one of these breaks**. `Post` has no `UserId` of its own.

**b) Location belongs to Trip, not Post.** `Location.TripId` is a required FK. `MapPage.jsx` fetches `/locations` and `/trips` separately, then joins with `trips.find(t => t.id === location.tripId)`. Kill Trip and the map has nothing to pin to — unless Location is re-pointed at Post first.

**c) `Post.TripId` is non-nullable with cascade delete.**

```csharp
modelBuilder.Entity<Trip>()
    .HasMany(t => t.Posts).WithOne(p => p.Trip)
    .HasForeignKey(p => p.TripId)
    .OnDelete(DeleteBehavior.Cascade);
```

A careless `DROP TABLE Trips` takes every post and every location with it. The migration must repoint before it drops.

**Blast radius:** ~20 backend files (7 services, 4 controllers, 6 DTO folders, entities, DbContext, repositories, validators) + ~14 frontend files + 1 migration.

---

## 3. Upload flow today

`PostEditorPage.jsx` → `MediaUpload` component (lines ~120–410):

- **Single file only** — `const file = e.target.files[0]`, and the `<input>` has no `multiple` attribute.
- **Post must exist first** — renders *"Save the post first to upload media."* when `postId` is null. Two-step flow.
- Posts to `POST /api/photos/upload/{postId}` — one `IFormFile` per request.
- Has a working per-file progress bar via `onUploadProgress` (reusable for the queue).
- Carries a Drone/Phone `source` toggle and an optional per-file caption.

**For multi-upload you need:** the `multiple` attribute, a client-side queue that fires N sequential (or capped-concurrency) requests, per-file progress rows, and per-file retry. The existing single-file endpoint works fine for this — a batch endpoint is optional, not required.

---

## 4. The 10 MB limit — where it actually lives

It is **not** a Cloudinary-side rejection. It's your own server-side guard:

```csharp
// CloudinaryService.cs, ValidateImageFile(), line ~265
if (file.Length > 10 * 1024 * 1024)
    throw new ArgumentException("File size cannot exceed 10MB");
```

Consequences worth knowing:

1. The request 400s **before** Cloudinary is ever called. Client compression has to land under 10 MB or nothing changes.
2. Allowed extensions are `.jpg .jpeg .png .webp`. If you compress to WebP client-side, that's fine — but if you compress a HEIC from an iPhone, the output filename/extension must be one of those four.
3. Kestrel is configured for **100 MB** bodies (`Program.cs` lines 31, 36), so there's plenty of headroom for a batch endpoint later.

### Delivery is already optimized — don't over-compress

Cloudinary is doing `q_auto` + `f_auto` **on upload** (`CloudinaryService.UploadPhotoAsync`), *and* `cldImage()` appends `f_auto,q_auto,w_{N},c_limit` **on delivery**. Your grid already serves right-sized WebP/AVIF.

**So client compression has exactly one job: get the file under the 10 MB gate.** It is not a page-speed measure. That reframes the target — you can compress *gently* and lose nothing visible.

### Recommended approach

`browser-image-compression` (~15 KB, web-worker based, well-maintained):

```js
import imageCompression from 'browser-image-compression'

const LIMIT = 10 * 1024 * 1024

async function prepare(file) {
  if (file.size <= LIMIT * 0.95) return file   // already fine — don't touch it

  return imageCompression(file, {
    maxSizeMB: 9,              // safety margin under the server guard
    maxWidthOrHeight: 5000,    // generous — most phone/drone shots stay full-res
    initialQuality: 0.92,
    useWebWorker: true,
    preserveExif: true,        // ← critical, see below
    fileType: 'image/jpeg',
  })
}
```

Two details that matter:

- **Skip files already under the limit.** Recompressing a 3 MB photo only degrades it. Most of your shots will pass through untouched.
- **`preserveExif: true`.** Canvas-based compression strips EXIF by default — GPS coordinates and `DateTimeOriginal` included. Even with the flag set, read EXIF into React state *before* compressing, so the pin and date survive regardless of what the encoder does.

A 45 MB drone RAW-ish JPEG at q0.92 and 5000px still looks identical at any size you'd display. You're not compromising quality here.

---

## 5. Schema gaps for photo-first posts

`Photo` currently holds only `Url`, `PublicId`, `Caption`, `Type`, `Source`, `PostId`. Missing for a proper gallery:

| Field | Why |
|---|---|
| `SortOrder` | Multi-image posts need a stable, reorderable order |
| `Width` / `Height` | Masonry / aspect-ratio-correct grid without layout shift |
| `TakenAt` | EXIF `DateTimeOriginal` — sorts old photos by when shot, not uploaded |
| `Latitude` / `Longitude` | Per-photo geotag from EXIF |

`Post` gaps: no `UserId` (needed once Trip is gone), no `LocationId`, no `TakenAt`.

---

## 6. Tags: already built, zero UI

`Tag`, `PostTag`, `TagService`, `TagsController` all exist. `PostWithDetailsDto.Tags` is populated and returned. But **grep finds no tag UI anywhere in `Ralphy.Web/src`** — no chips, no input, no filter.

This is the cheapest win in the whole rework. It's also the natural replacement for Trip as the grouping mechanism, and it's what the original photo-feed spec called for. Backend work: roughly zero.

---

## 7. What Trip currently provides that must be replaced

| Trip provides | Replacement |
|---|---|
| Ownership (`Trip.UserId`) | Add `Post.UserId`, rewrite 12 checks |
| Location grouping | Repoint `Location.PostId`, or `Post.LocationId` |
| Timeline grouping | Group by `TakenAt` month/year |
| Map pin → detail link | Link to `/posts/:id` |
| Post grouping / albums | Tags (`#BugtongBato`, `#Paluan`) |
| URL structure `/trips/:tripId/posts/:postId` | `/posts/:id` — **needs 301 redirects**, `SitemapController` emits trip URLs today |

---

## 8. Suggested phasing

**Phase 1 — Decouple (backend, no UI change)**
Add `Post.UserId`, `Post.LocationId`, `Post.TakenAt`; add `Photo.SortOrder/Width/Height/TakenAt/Lat/Lng`. Make `Post.TripId` nullable. Migration backfills `Post.UserId` from `Trip.UserId` and copies each trip's first location onto its posts. Rewrite the 12 ownership checks to use `post.UserId`. **Trip still exists and still works** — nothing breaks yet.

**Phase 2 — Photo-first frontend**
Multi-select upload with client compression + EXIF read. Tag chips UI. Rework `PostCard` to be image-led (drop `readingTime`/excerpt). Gallery grid + reorder in the editor. Make Title optional or auto-derive from location + date. Add `/posts/:id` route with redirects from the old nested URL.

**Phase 3 — Drop Trip**
Delete Trip entity, service, controller, DTOs, validators, `AdminTripsPage`, `TripsPage`, `TripDetailPage`, `TripCard`. Rework Timeline and Map to read from Post directly. Final migration drops the table. Update `SitemapController` and Navbar.

Doing it in this order means the site is deployable and working after every phase. Trying to do it in one pass means a broken build until the last file is touched.

---

## 9. Decisions (settled)

| # | Decision | Impact |
|---|---|---|
| 1 | **Location:** `Post.LocationId`, **required**. Many posts → one Location. `Location.TripId` dropped; Location becomes a reusable place record. | New FK + 3-step migration (see 9.1) |
| 2 | **Title:** stays required, max 200 chars | No change — `CreatePostValidator` already enforces it |
| 3 | **Content / description:** optional. TipTap editor kept, collapsed by default. AI-assisted drafting deferred. | Drop `.NotEmpty()` on Content; make column nullable |
| 4 | **Old trip descriptions:** discarded, not merged | No merge logic in Phase 3 — `Trip` just drops |
| 5 | **Drone/Phone toggle:** removed entirely, photos **and** videos | See 9.2 for the full footprint |

### 9.1 The required-FK migration

You cannot add a `NOT NULL` FK to a table with existing rows. Three steps, in this order:

1. Add `Post.LocationId` as **nullable**
2. Drop `Location.TripId` — **must happen before the seed insert**, since the column is currently non-nullable and the placeholder row has no trip to point at
3. Seed the placeholder and backfill **every** post:

```sql
INSERT INTO "Locations" ("PlaceName", "Latitude", "Longitude", "Description", "CreatedAt")
VALUES ('West Philippine Sea', 13.2, 120.3, 'Placeholder — needs a real location', NOW());

UPDATE "Posts"
SET "LocationId" = (SELECT "Id" FROM "Locations" WHERE "PlaceName" = 'West Philippine Sea');
```

4. `AlterColumn` → `nullable: false`

**Coordinates:** 13.2000°N, 120.3000°E — roughly 30 km west of Mamburao in the Mindoro Strait. Round numbers on purpose, so placeholders are obvious at a glance. Clear of Apo Reef (12.67°N, 120.45°E) to avoid confusion with a real dive site.

**Blanket backfill was chosen over inherit-when-unambiguous.** Simpler migration; the tradeoff is that trips with correct existing locations lose them and get re-entered by hand.

Two guards this requires:

- **`AdminPostsPage`** — a "needs location" filter/badge keyed on the placeholder location id, so the cleanup list is workable.
- **`MapPage`** — exclude posts at the placeholder location from the public map, or the live site shows a pin cluster floating in the ocean until cleanup finishes.

### 9.2 Drone/Phone removal footprint

- `Ralphy.Domain/Enums/MediaSource.cs` — delete
- `Photo.Source` column + migration to drop it
- `PhotoDto.Source`, `UploadPhotoDto.Source`
- `IPhotoService.GetBySourceAsync`, `IVideoService.GetBySourceAsync` + both implementations
- Endpoints: `GET /photos/post/{id}/phone`, `/photos/post/{id}/drone`, and the two video equivalents in `VideosController`
- `PhotosController.Upload` / `VideosController.Upload` — drop the `source` form field and its `Enum.TryParse` guard
- `PostEditorPage.jsx` — the toggle UI (`mediaSource` state) and the colored source dot in the photo grid

Videos share the same enum, so both go together.

### Still open

**AI description assist** — deferred, not cancelled. Worth noting `Ralphy.Infrastructure/Services/AnthropicService.cs` already exists, so the plumbing is in place when you want it.

---

## Automation note

Phases 1 and 3 are mostly mechanical — repeated find-and-replace of the ownership pattern across 7 service files, plus DTO/mapping updates. That's exactly what Claude Code is good at, given this doc as the brief. If you end up doing more .NET Clean Architecture entity refactors on this codebase, the "add field → DTO → mapping profile → validator → migration" chain is a strong candidate for a Claude Skill.

**Existing docs go stale.** `docs/API_REFERENCE.md` (10 trip references) and `docs/ARCHITECTURE.md` (9) both document the Trip-centric model. Update them in Phase 3 alongside the entity removal. `docs/DEPLOYMENT.md` is unaffected.
