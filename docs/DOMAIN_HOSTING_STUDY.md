# Domain & Hosting Study

**Date:** 2026-10-10 · **Scope:** `ralph-portfolio` (blog/portfolio + API) and `php-currency-converter-app` ("Ralphy Tools" PWA)

**Constraints given:** personal-name domain · domain-only budget (~$10–20/yr) · no custom email · for the tools app: **fewer platforms** and **lowest cost**.

---

## TL;DR

| Decision | Recommendation |
|---|---|
| Domain | **`ralphalcaide.com`** (or `.dev` if `.com` is taken) |
| Registrar + DNS | **Cloudflare Registrar** (sold at cost, free WHOIS privacy, free DNS with apex-CNAME flattening, which Railway needs) |
| Portfolio | Stays on **Railway** → `ralphalcaide.com` (apex) + `www` → 301 to apex |
| API | Stays on **Railway** → `api.ralphalcaide.com` |
| Tools app | **Move from Netlify to Cloudflare (Pages / Workers static assets)** → `tools.ralphalcaide.com`. Keep it as a separate repo. |
| Total cost | **≈ $10–14/yr** (domain only). Hosting stays at what you pay now. |

Final platform count: **Cloudflare + Railway** (down from Netlify + Railway + a registrar).

---

## 1. Getting the domain

### 1.1 Which name

| Option | Pros | Cons |
|---|---|---|
| **`ralphalcaide.com`** ✅ | Most trusted/recognised TLD, no explanation needed, cheapest renewal | May already be taken |
| `ralphalcaide.dev` | Signals "developer"; HTTPS forced by browsers (HSTS preload), which you already have | Slightly more expensive; less familiar to non-tech travel audience |
| `ralphalcaide.me` | Personal-brand feel | Renewals often well above first-year price |
| `.ph` / `.com.ph` | Local identity | ~2–4× the cost, which goes over your budget |

> Note: `appsettings.json` lists `ralphy.com` / `www.ralphy.com` in CORS. That's a placeholder: `ralphy.com` is a short, generic name that's almost certainly registered by someone else. Replace it with the real domain once you buy one.

Your travel brand (`lakbayoksi`) stays on Instagram/YouTube. If you ever want `lakbayoksi.com` too, buy it later and 301-redirect it to a `/travel` section. You don't need it now.

### 1.2 Where to buy

**Cloudflare Registrar** (recommended). Prices are wholesale with no markup: roughly $10–11/yr for `.com` and ~$12–15/yr for `.dev`. The renewal price equals the first-year price, and WHOIS privacy, DNSSEC and DNS are all free.
Alternative: **Porkbun** (also cheap and honest about renewals).
**Avoid:** registrars with $0.99 first-year promos (GoDaddy and similar). Their renewals are 2–3× higher and they upsell privacy.

> Cloudflare Registrar requires you to create a Cloudflare account and use Cloudflare DNS for the domain. That's what we want anyway (see §2.3).

### 1.3 Checklist

1. Search availability at `dash.cloudflare.com` → *Domain Registration → Register Domains*.
2. Buy for **1 year with auto-renew ON**. Multi-year adds no SEO benefit.
3. Turn on **2FA** on the Cloudflare account. Whoever controls this account controls your whole site.
4. Leave **registrar lock** and **DNSSEC** on (both are defaults).
5. **No email planned, so lock it down against spoofing.** Add these DNS records so nobody can send mail "from" your domain:
   - `TXT @  "v=spf1 -all"`
   - `TXT _dmarc  "v=DMARC1; p=reject;"`
   - (optional) `MX @ 0 .` (a "null MX" record that says this domain receives no mail)
6. Verify the domain in **Google Search Console** (DNS TXT record) once the site is live, and submit `https://ralphalcaide.com/sitemap.xml`.

---

## 2. Hosting the portfolio + API on the domain

### 2.1 Target layout

```
ralphalcaide.com          → Railway  "web"  (nginx SPA)        [canonical]
www.ralphalcaide.com      → 301 → ralphalcaide.com
api.ralphalcaide.com      → Railway  "api"  (.NET)
tools.ralphalcaide.com    → Cloudflare Pages (Ralphy Tools PWA)
```

Why `api.` instead of keeping `ralph-portfolio-production.up.railway.app`:

- Moving off Railway later becomes a DNS change instead of a code change in two repos.
- The custom domain *adds to* the Railway URL; it doesn't replace it. The old `*.up.railway.app` URLs keep working, so nothing breaks during the switch.

### 2.2 Railway steps

1. Railway → **web** service → *Settings → Networking → Custom Domain* → add `ralphalcaide.com` and `www.ralphalcaide.com`. Railway shows a CNAME target for each.
2. Railway → **api** service → add `api.ralphalcaide.com`.
3. In Cloudflare DNS, create those CNAMEs. Cloudflare flattens the apex CNAME automatically, which is the main reason to use Cloudflare DNS here.
4. Start with the records set to **DNS only (grey cloud)**. Railway issues the TLS certificate itself. If you later switch to proxied (orange cloud), set Cloudflare SSL/TLS mode to **Full**. With "Flexible" you get redirect loops.
5. Do the `www → apex` redirect with a Cloudflare *Redirect Rule* (free), or have Railway/nginx handle both hosts and redirect.

> Custom domains need a paid Railway plan (Hobby or above). Since you already run api + web + Postgres there, you're very likely on Hobby already, so this adds no cost.

### 2.3 Code/config changes in `ralph-portfolio`

These are the places that hard-code the Railway URLs today:

| File | Change |
|---|---|
| `Ralphy/Ralphy.Api/appsettings.json` → `Cors:AllowedOrigins` | Add `https://ralphalcaide.com`, `https://www.ralphalcaide.com`, `https://tools.ralphalcaide.com`; remove the `ralphy.com` placeholders. Keep the old Railway/Netlify origins until the switch is finished. (Better: set these as Railway env vars `Cors__AllowedOrigins__N`.) |
| `appsettings.json` → `Seo:SiteUrl` | `https://ralphalcaide.com` (or the Railway env var `Seo__SiteUrl`) |
| `Controllers/SitemapController.cs:39` | Fallback URL. Optionally update it, since config wins anyway. |
| `Ralphy.Web/public/robots.txt` | `Sitemap: https://ralphalcaide.com/sitemap.xml` |
| `Ralphy.Web/index.html` (lines ~39–100) | `og:url`, `og:image`, JSON-LD `url`s, `preconnect` → new domain / `api.` |
| `Ralphy.Web/nginx.conf` | Sitemap `proxy_pass` + `Host` header → `api.ralphalcaide.com`. Add a server block that **301-redirects `ralphy-production.up.railway.app` → `ralphalcaide.com`**, so Google doesn't index two copies of the site. |
| `Ralphy.Web/Dockerfile` | Add `ARG VITE_SITE_URL` / `ENV VITE_SITE_URL` (it's documented but not passed in today, so canonical URLs fall back to `window.location.origin`). |
| Railway web service build args | `VITE_API_URL=https://api.ralphalcaide.com/api`, `VITE_SITE_URL=https://ralphalcaide.com` |
| `.github/workflows/ci.yml:62` | `VITE_API_URL` → new API URL |
| `docs/DEPLOYMENT.md` | Update the topology table |
| `Jwt:Issuer` / `Jwt:Audience` | Leave as they are. Changing them logs everyone out and gains nothing. |

---

## 3. Where should the tools app live?

### 3.1 Options compared

| | A. Keep on Netlify + subdomain | B. Move to Railway + subdomain | C. Merge into portfolio repo/site | **D. Cloudflare Pages + subdomain** ✅ |
|---|---|---|---|---|
| Hosting cost | Free | **Uses Railway credits** (an always-on nginx container; small, but not $0) | Free if served by the existing web container | Free (unlimited static bandwidth) |
| Platforms | Netlify + Railway + Cloudflare = **3** | Railway + Cloudflare = 2 | 2 | Railway + Cloudflare = **2** |
| Migration effort | ~10 min (CNAME) | Medium: need Dockerfile + nginx config translating `_headers`/`_redirects` | **High:** two React apps with different stacks (MUI vs Tailwind), PWA `scope: "/"` and routes like `/work/*` collide with the portfolio, and two service workers would fight over one origin | **Low:** Cloudflare reads the same `_headers` and `_redirects` files. No code changes for hosting. |
| Static performance | CDN | Single region container, no CDN | Single region | Global CDN |
| Preview deploys per branch | Yes | Manual | Shared with portfolio | Yes |
| Isolation | Good | Good | Poor: a tools deploy rebuilds the portfolio | Good |

### 3.2 Recommendation: **D. Cloudflare Pages at `tools.ralphalcaide.com`**

It gives you both things you asked for:

- **Fewer platforms:** Cloudflare is already your registrar and DNS, so Netlify goes away entirely. You end up with two dashboards (Cloudflare + Railway).
- **Lowest cost:** static hosting is free. Moving it to Railway (option B) would put a static site on a paid always-on container for no benefit.

**Why not merge it into the portfolio (C)?**
The tools app is a standalone PWA with offline IndexedDB, its own service worker, and `scope: "/"`. If it shared an origin with the portfolio, both apps' service workers and caches would interfere with each other. Serving it from a subdomain gives it its own origin and solves that cleanly. If you want one repo later for convenience, you can make it a monorepo folder. The hosting answer (subdomain on Cloudflare) stays the same.

**If you don't want to move it at all:** option A (keep Netlify, add `tools.ralphalcaide.com` as a CNAME) is a perfectly fine fallback. It costs nothing; you just keep a third platform.

> Cloudflare is now steering new static sites toward **Workers with static assets** rather than classic Pages. Either one works and both honour `_headers`/`_redirects`. Pick whichever the dashboard offers when you "Import a Git repository".

### 3.3 Things that change in `php-currency-converter-app`

| File | Change |
|---|---|
| `vite.config.js` (Workbox `runtimeCaching`) | Hostname `ralph-portfolio-production.up.railway.app` → `api.ralphalcaide.com` (2 places). **Must be a literal string.** The existing comment explains why. |
| `src/work/api/workApi.js:6`, `src/work/pages/TokensPage.jsx:28` | Fallback API URL → `https://api.ralphalcaide.com/api` (or just set `VITE_API_URL` in the Cloudflare build env) |
| `src/components/shopping/ShoppingListPage.jsx:21` | Hard-coded parse URL → derive from `VITE_API_URL` |
| Cloudflare build settings | Build `npm run build`, output `dist`, env `VITE_API_URL`, `VITE_SHOPPING_API_KEY`, `NODE_VERSION` |
| `public/_headers`, `public/_redirects` | Works unchanged on Cloudflare |

### 3.4 ⚠️ PWA migration gotcha (important)

Moving from `zippy-mousse-7dfbd1.netlify.app` to `tools.ralphalcaide.com` is a **new origin**. The browser treats it as a different app, so:

- The installed home-screen app **does not move**. You'll need to reinstall it from the new URL.
- **IndexedDB offline data and the `localStorage` login session do not carry over.** Any offline time logs or edits that haven't synced yet would be **stranded on the old origin**.

**Safe cut-over order:**
1. On the old app, go online and **make sure the offline queue has fully synced**.
2. Deploy to the new subdomain and add its origin to the API's CORS list.
3. Install the PWA from `tools.ralphalcaide.com`, log in, and check that the data is there.
4. Keep the Netlify site up for ~2 weeks. Optionally ship one last Netlify build with a "This app has moved → tools.ralphalcaide.com" banner.
5. Then delete the Netlify site and remove its origin from CORS.

---

## 4. Rollout plan (in order)

| # | Step | Risk |
|---|---|---|
| 1 | Buy domain on Cloudflare; 2FA; anti-spoofing records (§1.3) | None |
| 2 | Add `api.` custom domain on Railway; verify `https://api.ralphalcaide.com/api/...` responds | None (old URL still works) |
| 3 | Update API config: CORS + `Seo:SiteUrl` (env vars) | Low |
| 4 | Add apex + `www` to the Railway web service; update portfolio code (§2.3); redeploy | Low |
| 5 | Add the nginx 301 from the old Railway web hostname → new domain; submit the sitemap to Search Console | Low |
| 6 | Create the Cloudflare Pages project for the tools app; update hostnames (§3.3); deploy to `tools.` | Low |
| 7 | PWA cut-over (§3.4) | **Medium:** sync offline data first |
| 8 | After ~2 weeks: delete Netlify, prune old origins from CORS | None |

---

## 5. Cost summary

| Item | Yearly |
|---|---|
| `ralphalcaide.com` via Cloudflare Registrar | ~$10–11 (`.dev` ~$12–15) |
| Cloudflare DNS / Pages / SSL / redirects | $0 |
| Railway | No change from current plan |
| Netlify | $0 → removed |
| **Total new spend** | **≈ $10–15/yr** ✅ within budget |

---

## 6. Open items / to verify before buying

- [ ] Check availability of `ralphalcaide.com` / `.dev` (couldn't be checked from this environment).
- [ ] Confirm your current Railway plan supports custom domains (Hobby+).
- [ ] Decide **apex vs `www`** as canonical. This doc assumes the apex (`ralphalcaide.com`).
