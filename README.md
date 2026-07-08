# Ralphy 🌏

A personal travel blog / vlog and portfolio by **Ralph Alcaide** ([@lakbayOksi](https://www.instagram.com/lakbayOksi)) — a Filipino traveler and developer from Occidental Mindoro, documenting journeys through drone and phone footage.

| | |
|---|---|
| **Backend** | .NET 9 Web API (clean architecture: Domain / Application / Infrastructure / Api) |
| **Frontend** | React 19 + Vite + Tailwind CSS 4 (SPA served by nginx) |
| **Database** | PostgreSQL 16 (EF Core, auto-migrated on startup) |
| **Media storage** | Cloudinary (photos + videos) |
| **Logging** | Serilog → Seq |
| **AI** | Anthropic Claude (shopping-list image parsing) |
| **Deployment** | Railway (api + web + db), Docker Compose for local dev |

## Repository layout

```
ralph-portfolio/
├── docker-compose.yml            # api + web + postgres + seq (local dev / self-host)
├── docker-compose.override.yml
├── .env.example                  # required environment variables
├── .github/workflows/ci.yml     # CI: build backend + frontend on every push
├── docs/                         # 📚 full documentation (see below)
└── Ralphy/
    ├── Ralphy.Domain/            # Entities, enums, repository interfaces
    ├── Ralphy.Application/       # Services, DTOs, validators, mappings
    ├── Ralphy.Infrastructure/    # EF Core, repositories, Cloudinary, Anthropic, JWT
    ├── Ralphy.Api/               # Controllers, middleware, Program.cs
    └── Ralphy.Web/               # React SPA (public site + admin)
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — layers, entities, frontend structure, cross-cutting concerns
- [API Reference](docs/API_REFERENCE.md) — every endpoint, auth requirements, external consumers
- [Deployment & Operations](docs/DEPLOYMENT.md) — Railway setup, env vars, local dev, CI

## Quick start (local)

```bash
# 1. Copy env template and fill in values
cp .env.example .env

# 2. Run everything with Docker
docker compose up --build
# API      → http://localhost:5000  (Swagger at /swagger in Development)
# Web      → http://localhost:3000
# Postgres → localhost:5432
# Seq logs → http://localhost:5441

# — or run the frontend against the API directly —
cd Ralphy/Ralphy.Web
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000, uses VITE_API_URL or http://localhost:5000/api
```

## Related projects

- **[php-currency-converter-app](https://github.com/obiken-01/php-currency-converter-app)** (deployed on Netlify) — a separate frontend-only app that consumes this backend's `POST /api/shopping-list/parse` endpoint (API-key protected, Claude-powered OCR of handwritten Filipino shopping lists).

## Links

- Instagram: [@lakbayOksi](https://www.instagram.com/lakbayOksi)
- YouTube: [@Lakbay_Oksi](https://www.youtube.com/@Lakbay_Oksi)
