# Ralphy — Deployment & Operations

## Production topology

| Piece | Where | Notes |
|---|---|---|
| Ralphy API | **Railway** ([project](https://railway.com/project/58762467-92f4-4a74-bb35-eb3904391b1c)) | `Ralphy/Ralphy.Api/Dockerfile`; public URL `https://ralph-portfolio-production.up.railway.app` |
| Ralphy Web | **Railway** (same project) | `Ralphy/Ralphy.Web/Dockerfile` — Vite build baked with build-arg `VITE_API_URL`, served by nginx; public URL `https://ralphy-production.up.railway.app` |
| PostgreSQL 16 | Railway | Connection string via `ConnectionStrings__Default` |
| Media | Cloudinary | Account credentials via env |
| php-currency-converter-app | **Netlify** ([site](https://app.netlify.com/projects/zippy-mousse-7dfbd1/overview)) | Separate repo/frontend; calls `POST /api/shopping-list/parse` with `X-Api-Key`. Its Netlify origin must be present in `Cors:AllowedOrigins`. |

**Migrations are automatic** — the API runs `Database.Migrate()` on startup (5 retries). No manual EF step on deploy.

## Environment variables (API)

From `.env.example` / Railway service variables (double-underscore = .NET config section):

| Variable | Purpose |
|---|---|
| `ConnectionStrings__Default` | PostgreSQL connection string |
| `Jwt__SecretKey`, `Jwt__Issuer`, `Jwt__Audience` | Admin + timekeeping JWT signing |
| `Cloudinary__CloudName`, `Cloudinary__ApiKey`, `Cloudinary__ApiSecret` | Media uploads |
| `Cors__AllowedOrigins__0..n` | CORS allowlist (web app origin, Netlify converter origin, localhost dev) |
| `Anthropic__ApiKey` (+ model settings) | Claude shopping-list parsing |
| `ShoppingList__ApiKey` | Shared secret for the external `X-Api-Key` consumer |
| `Seq__ServerUrl` | Structured log sink (compose: `http://seq:5341`) |

**Web build-time variable**: `VITE_API_URL` (e.g. `https://ralphy-production.up.railway.app/api`). Baked into the bundle at `npm run build` — changing it requires a rebuild. v2.0 also uses `VITE_SITE_URL` (canonical public origin for SEO tags; falls back to `window.location.origin`).

## Local development

```bash
cp .env.example .env       # fill values
docker compose up --build  # api :5000, web :3000, db :5432, seq UI :5441
```

Frontend-only iteration: `cd Ralphy/Ralphy.Web && npm install --legacy-peer-deps && npm run dev` (Vite dev server on :3000, proxying nothing — it calls `VITE_API_URL` or `http://localhost:5000/api` directly).

Swagger is available at `/swagger` only when `ASPNETCORE_ENVIRONMENT=Development`.

## CI

`.github/workflows/ci.yml` runs on **every push** (all branches) and PRs to `main`:

- **Backend**: `dotnet restore/build/test` (.NET 9, Release; tests are `continue-on-error` until a real test project exists).
- **Frontend**: `npm ci --legacy-peer-deps && npm run build` (Node 20) with the production `VITE_API_URL`.

Deployment itself is done by Railway (builds the Dockerfiles from the connected repo).

## Branching

- `main` — production.
- `feature/v1.x-*` — historical feature branches (about/contact, shopping list, timekeeping).
- `v2.0` — public-site redesign: SEO layer + new UI/UX (this branch).

## Operational notes

- **Logs**: Serilog request logging; Seq at `:5441` locally. On Railway, console logs are visible in the service log view (the Seq sink will fail silently if no Seq host exists — bootstrap logger points at `http://seq:5341`).
- **Rate limits**: shopping-list parse = 10/hour per instance (in-memory fixed window).
- **Upload limits**: 100 MB request body (videos), 10 MB shopping-list images.
- **nginx (web)**: SPA fallback to `index.html`; static assets cached 1 year immutable; `index.html` never cached. v2.0 adds a same-origin proxy of `/sitemap.xml` → API.
