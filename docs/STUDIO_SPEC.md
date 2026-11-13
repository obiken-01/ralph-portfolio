# Studio: Beat-Synced Video Editing Tool — Implementation Spec

Owner: Ralph (Occidental Mindoro, PH). Status: design agreed in chat, ready for implementation planning.
Audience: an implementation session with access to Ralph's local machine and repos.

---

## 1. Goal

A private web tool, called **Studio**, that turns Ralph's drone and phone footage (DJI Neo 2, Samsung A57 5G) plus a music file into a finished edited video: beat-synced b-roll, Reels, YouTube cuts and 4:5 posts. Ralph posts to Facebook, Instagram and YouTube, so outputs must fit those.

Non-goals (phase 1): blog image prep (his blog already compresses photos), publishing to the portfolio's Videos feature, public access, long-term file storage, transitions other than hard cut and crossfade.

## 2. Decisions already made (do not re-litigate)

| Topic | Decision |
|---|---|
| Processing | Server-side rendering (FFmpeg). Not in the browser. |
| Foundation | **Fresh design.** Do not extend the old Reel Maker. Borrow ideas only. |
| Architecture | One shared **edit list** (JSON). UI and beat-sync both produce it; one renderer consumes it. |
| Uploads | Direct **chunked uploads** from the browser to the new render service (bypasses the 100 MB API limit). |
| Access | **Private to Ralph.** Reuse his existing Work login; no new login system. |
| Placement | Inside the logged-in **`/work`** area of the tools app, as `/work/studio`. |
| Storage | Temporary disk only. Delete after export or after a fixed TTL, whichever comes first. Finished videos are downloaded to the device. |
| Queue | **One render job at a time** (small Railway instance, 4K footage). |
| Outputs | Reels 9:16 (1080x1920), YouTube 16:9 (1080p; 4K optional later), 4:5 (1080x1350). |
| Original audio | Always dropped (wind and motor noise). |
| Portfolio site | **No changes** in this plan. |

## 3. Repos and deployment

- **Tools app** (frontend): `github.com/obiken-01/php-currency-converter-app`. React + Vite, React Query, axios, PWA, deployed on **Netlify**. Top-level tabs: Currency, Time, Shopping, Work. Studio is added under Work.
- **Portfolio + API:** `github.com/obiken-01/ralph-portfolio`. Site plus a .NET API (`Ralphy/Ralphy.Api`) on **Railway**. Site domain: `ralphalcaide.com`. Contains `docs/DEPLOYMENT.md` and `docs/DOMAIN_HOSTING_STUDY.md`.
- **New: render service** (Python, **Railway**, its own service and Dockerfile). Where it lives (new repo, or a folder inside `ralph-portfolio`) is for the implementer to propose; a new small repo is preferred to keep the .NET API untouched.

## 4. Architecture

```
Browser (tools app /work/studio)
   │  Work login token (Bearer)
   ▼
Render service (Python, Railway)
   ├─ chunked upload endpoints
   ├─ beat detection (librosa)
   ├─ proxy/preview generation (FFmpeg)
   ├─ draft edit-list generator (beat-sync)
   └─ renderer (edit list → FFmpeg → mp4), one job at a time
```

- **Auth:** the render service verifies the Work login JWT with the **same signing secret** as the .NET API. *Verify locally:* how the .NET API issues and validates the token (algorithm, claims, issuer, expiry) and how the tools app stores and attaches it. Mirror that exactly. Look at the existing API-key attribute (`ShoppingListApiKeyAttribute.cs`) and the tools app's axios setup for patterns.
- **CORS:** allow the tools origin only, as the .NET API does today.
- **Frontend patterns:** lazy-load the Studio route so the PWA bundle does not grow for other tools. Use React Query + axios like the rest of the app. Add a "Studio" item to the Work navigation.

## 5. Edit list (the core contract)

The renderer reads **only** this JSON. Everything else is a way to produce or edit it.

```jsonc
{
  "version": 1,
  "project": {
    "aspect": "9:16",            // "9:16" | "16:9" | "4:5"
    "width": 1080, "height": 1920,
    "fps": 30
  },
  "music": {
    "fileId": "up_abc",          // uploaded audio
    "startSec": 12.4,
    "endSec": 42.4,
    "fadeOutSec": 1.5,
    "beats": [12.40, 12.91, 13.42]   // detected beat times, seconds
  },
  "audioMode": "music",          // "music" (baked in) | "silent"
  "timeline": [
    {
      "type": "video",           // "video" | "photo" | "empty" (template slot)
      "slotStartSec": 0.0,       // position on the output timeline
      "durationSec": 1.02,
      "source": { "fileId": "up_clip1", "inSec": 34.2, "outSec": 35.22 },
      "crop": { "focusX": 0.5, "focusY": 0.5 },   // 0..1, where to center the crop
      "transitionOut": "cut"     // "cut" | "crossfade" (short, ~0.15 s)
    },
    {
      "type": "photo",
      "slotStartSec": 1.02,
      "durationSec": 2.04,
      "source": { "fileId": "up_img1" },
      "motion": { "kind": "zoom_in" }             // "zoom_in" | "zoom_out" | "pan_left" | "pan_right"
    },
    { "type": "empty", "slotStartSec": 3.06, "durationSec": 1.02 }   // unfilled template slot
  ]
}
```

Rules:
- Total timeline duration must equal `music.endSec - music.startSec` (or the "use everything" length), and the last cut lands on a beat.
- An `empty` segment cannot be rendered. Render must reject with a clear error listing unfilled slot indexes.
- Validate the schema on the server (pydantic or JSON Schema) before queuing.

## 6. Beat-sync (phase 1)

1. **Beats:** `librosa` beat tracking on the uploaded music gives `beats[]`.
2. **Pace** (user choice): calm = 4 beats per shot, medium = 2, fast = 1. Default shot length should not average much above 5 s (matches Instagram's template guidance).
3. **Length:** 15 s, 30 s, 60 s, or "use everything". End on a beat; fade the music out.
4. **Slots:** build slots from the beat grid and pace (or from a saved template, see section 7).
5. **Pool:** split long clips into short candidate windows (window length = slot length). Each photo gets one slot.
6. **Fill:** pick windows so the **same clip never appears twice in a row** and footage is **spread evenly** across clips. Drive choices with a **seeded shuffle**; a **Reshuffle** button re-runs with a new seed.
7. **Crop:** 16:9 drone footage is center-cropped for 9:16 and 4:5 by default. Crop focus is adjustable per shot in tweak mode (phase 2).
8. **Photos:** slow zoom or pan (Ken Burns), default duration one or two slots.

## 7. Slots and templates (inspired by Instagram Edits)

Auto beat-sync and templates are the same machine in two steps: **make slots, then fill slots.**

- A **template** is an edit list whose segments have type `empty` (timings and beat grid, no sources). A few KB of JSON.
- **Save as template:** stores slot timings and beat grid. The music file and footage stay temporary, so the user re-adds the audio when reusing it.
- **Use template:** shows the empty slots with durations, plus an **Auto-fill** button that runs the beat-sync fill.
- Each slot lets the user choose **which part of a long clip** to use (important for long drone clips).
- Slots can be skipped but not added in phase 1.
- Template storage location (browser localStorage vs. a small JSON store on the service) is an open item, see section 12. Default: **localStorage in the tools app**, since templates are tiny and private.

> Note: this slot/template model was proposed in the last design step and Ralph had not explicitly approved it yet. Treat it as **in scope for phase 1** because it costs little (same data shape), but flag it back to Ralph if it complicates the UI.

## 8. Render service API (sketch; implementer finalizes)

All endpoints require the Work login token.

| Method + path | Purpose |
|---|---|
| `POST /uploads` | Start an upload; returns `uploadId`. Body: filename, size, type (video, photo, audio). |
| `PUT /uploads/{id}/chunks/{n}` | Upload one chunk (resumable; client retries failed chunks). |
| `POST /uploads/{id}/complete` | Assemble; returns `fileId`, probed metadata (duration, resolution, fps, rotation). |
| `POST /projects/analyze` | Given music `fileId`: returns `beats[]`, tempo. |
| `POST /projects/draft` | Given files, aspect, pace, length, seed: returns a draft edit list. |
| `POST /previews` | Make small proxy copies of clips (e.g. 480p) for browser preview (phase 2). |
| `POST /renders` | Submit an edit list; returns `jobId`. Queued, one at a time. |
| `GET /renders/{jobId}` | Status: queued / running (with percent) / done / failed (with message). |
| `GET /renders/{jobId}/download` | Stream the finished mp4. |
| `DELETE /files/{fileId}` and `DELETE /renders/{jobId}` | Manual cleanup. |
| `GET /health` | Liveness for Railway. |

Limits to enforce (tune after testing): max single file ~3 GB, max total per project, allowed MIME types and extensions (mp4, mov, jpg, png, heic if supported, mp3, m4a, wav).

## 9. Rendering

- FFmpeg driven by the edit list. Build the filter graph from the timeline; do not shell-concatenate user-supplied strings (avoid command injection; pass args as a list).
- Each segment: trim (`inSec`..`outSec`), scale and crop to output aspect using `crop.focusX/Y`, set fps.
- Photos: Ken Burns via `zoompan`.
- Concatenate segments; apply optional short crossfades only where `transitionOut` says so.
- Audio: if `audioMode` is `music`, trim to `startSec..endSec` with fade-out; if `silent`, no audio track.
- Output: H.264 (`libx264`), AAC when audio present, `-movflags +faststart`, `-pix_fmt yuv420p` for Instagram/Facebook compatibility. Use `-preset veryfast` by default for CRF encoding (long renders are costly on shared CPU); expose an optional "best quality" toggle later.
- Respect phone/drone rotation metadata and variable frame rate (normalize to constant fps).
- Progress: parse FFmpeg `-progress` output to report percent.
- Resource guard: one job at a time; reject or queue additional jobs; cap render timeout and fail cleanly.

## 10. Audio and copyright note

"Silent" export must be a one-click choice. Reels audio is usually added inside Instagram/Facebook, and silent export also avoids a possible copyright claim on YouTube for tracks downloaded from those apps. The music file is still needed in the tool for beat detection either way.

## 11. UX (Studio page, `/work/studio`)

**Phase 1 screens**
1. **Upload:** drag and drop or file picker for clips, photos, one music file. Chunked, resumable, per-file progress.
2. **Options:** aspect (9:16 / 16:9 / 4:5), pace (calm / medium / fast), length (15 / 30 / 60 / use everything), audio (music baked in / silent).
3. **Draft + Reshuffle:** generate a draft edit list; Reshuffle gives a new seeded draft.
4. **Render + Download:** progress bar, then download button. Warn that files are deleted after export/TTL.

**Phase 2 (tweak mode)**
- Swap a clip in a slot, shift a cut, change trim, move the crop focus.
- Quick low-res preview using the proxy copies.
- Beat dots on the timeline; cuts **snap to beats** (like Edits' beat markers).
- Safe-zone overlay for Reels (so text and graphics aren't hidden by the Instagram UI).

**Phase 3**: full manual timeline (add/remove/reorder, music on a track).

Mobile matters: Ralph also uses a phone (PWA). Keep upload and options usable on a narrow screen.

## 12. Open items (verify locally or ask Ralph)

1. **Token details:** exact JWT algorithm, claims, secret name, and how the tools app attaches it. Confirm by reading the .NET API and the tools app.
2. **Render service location:** new repo vs. folder in `ralph-portfolio`. Check `docs/DEPLOYMENT.md` for how Railway services are set up today.
3. **Railway limits:** plan CPU/RAM/disk, and whether a persistent volume is available. Design for temp disk regardless.
4. **Template storage:** localStorage (default) vs. service-side.
5. **HEIC photos:** Samsung A57 may produce HEIC/HEIF. Decide support (pillow-heif or ffmpeg build with heif) or require JPEG.
6. **Drone files:** Neo 2 may output 4K and large `.mp4`/`.mov` with rotation metadata. Test real samples.
7. **Slot/template model** approval (see section 7).
8. **Tweak screen, preview details, error handling, test plan:** the chat design had not covered these yet; sections 9, 11 and 13 are proposed defaults, not approved decisions.

## 13. Errors and testing

**Errors (user-facing messages, not stack traces)**
- Unsupported or corrupt file, file too large, upload chunk failure (auto retry, then resume), expired or missing token (redirect to Work login), audio too short for requested length (offer shorter length), not enough footage for the slots (reuse windows with the "no repeat in a row" rule relaxed, and say so), render timeout, disk full.

**Tests**
- Unit: edit-list schema validation; slot builder from a beat grid; fill algorithm (no immediate repeats, even spread, seeded determinism); crop math for each aspect.
- Integration: chunked upload then complete with a real small file; `/projects/analyze` on a short sample track; render a 5-second edit list and verify with `ffprobe` (duration, resolution, fps, codec, audio present or absent).
- Auth: request without token or with a bad token returns 401; token signed with the wrong secret returns 401.
- Cleanup: files and renders removed after export and after TTL.
- Manual acceptance on real files: one DJI Neo 2 clip and one Samsung A57 clip plus a photo, for each of the three aspects, in both audio modes. Play the results on a phone and confirm Instagram/Facebook upload accepts them.

## 14. Phases and acceptance

**Phase 1 (build first):** upload, beat analysis, draft + reshuffle, slots/templates (empty-slot data model and Auto-fill), render, download, all three aspects, both audio modes, private auth, cleanup.
Done when: Ralph uploads 3+ clips, 1 photo and a song at `/work/studio`, gets a beat-synced 30 s Reel 9:16 that plays correctly on his phone, and the temporary files are gone afterward.

**Phase 2:** tweak mode, proxies and quick preview, beat snapping, safe-zone overlay.

**Phase 3:** full manual timeline.

## 15. Working notes for the implementer

- Read both repos before planning; follow their conventions (project structure, lint/format, env var naming, README style).
- Start with the render service skeleton plus `/health` and auth, then the edit-list schema and renderer on a hand-written JSON, then uploads, then beat-sync, then the frontend. This proves the contract early.
- Keep secrets out of the repo; document new env vars in the README and `docs/DEPLOYMENT.md`.
- Ask Ralph before changing anything in the portfolio site or the .NET API beyond reading it.
