# Work API — sync & validation contract for the tools frontend

**From:** Ralphy backend (`ralph-portfolio`)
**To:** Ralphy Tools frontend (React SPA, `php-currency-converter` repo)
**Date:** 2026-09-09
**Re:** `timelogcreate400spec.md` — POST /api/work/logs returns 400 "Validation failed"
**Status:** backend fixed; the frontend changes in §3 are outstanding

---

## 1. What was wrong

Your second suspect was right. `loggedAt` was refused for being in the future.

The rule allowed **5 minutes** of forward tolerance — enough for a device clock
running slightly fast and nothing else. The failing request was dated ~1h54m
ahead of server time, so it was refused. Nothing changed on the server between
09-08 and 09-09; the difference was that the earlier entries happened to be
dated at or behind the moment they were typed, and this one was not.

The rule compared UTC correctly. This was not a timezone bug, and
`new Date(...).toISOString()` on your side is right.

**The tolerance is now 24 hours.** Entering the day's blocks in one sitting —
dating a log hours ahead of when you type it — is ordinary use, and the guard's
real job is catching a clock set to the wrong week or year. The create and edit
paths share the one limit.

Your first suspect was not the cause. `publicId` was already accepted on both
DTOs, model binding ignores unknown members rather than rejecting them, and the
idempotent replay behaviour was genuinely implemented, not merely declared — see
§4.

### The actual blocker was the error body, and that is fixed

`errors` carried bare message strings, so the field name was discarded before
serialisation and all you could render was `message`. It now carries
`{ field, message }`. Details in §2.

---

## 2. Error contract

**The API emits the `ApiResponse` envelope, not ProblemDetails.** You can drop
the ProblemDetails branch in `src/work/api/errors.js`.

```jsonc
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "data": null,
  "errors": [
    { "field": "LoggedAt", "message": "loggedAt must be within the last 90 days and no more than 24 hours ahead. Check the device clock." }
  ]
}
```

Three things to handle:

| | Behaviour | Why it matters to you |
|---|---|---|
| Case | `field` is **PascalCase** from rule failures (`LoggedAt`), but **camelCase** from body-binding failures (`loggedAt`, `duration`) — those are keyed off the JSON path of what you sent | **Match case-insensitively.** An exact-match lookup silently misses one of the two sources |
| Absence | `field` is **omitted entirely** (not `null`) for a rule belonging to no single property | Don't assume the key exists; fall back to showing `message` alone |
| Multiplicity | Every broken rule is reported, not just the first | Render all of them, or the user fixes one field per round trip |

Malformed-body and type-mismatch 400s now use this same envelope. They
previously returned a bare object with no `success` key, so if you special-cased
that shape, it can go.

### Rules you can hit on a time log

| Field | Rule | Message |
|---|---|---|
| `TaskDescription` | required, max 500 chars | `A time log needs a description.` |
| `Duration` | greater than 0, max 24 | `Duration must be greater than zero.` / `A single log cannot exceed 24 hours.` |
| `LoggedAt` (create) | within last 90 days, max 24h ahead | `loggedAt must be within the last 90 days and no more than 24 hours ahead. Check the device clock.` |
| `LoggedAt` (edit) | max 24h ahead, no backdating limit | `loggedAt cannot be more than 24 hours ahead. Check the device clock.` |
| `PublicId` | not an empty GUID when present | `publicId must be a real GUID, not an empty one.` |

An old log stays editable forever on purpose — a typo in a log from four months
ago should still be fixable. Only the create path carries the 90-day window.

---

## 3. Required frontend changes

### 3.1 Parse the envelope — `src/work/api/errors.js`

Per §2: envelope shape, case-insensitive field matching, tolerate a missing
`field`, render every entry.

### 3.2 Treat 400 as permanent in the outbox

This is the most important one. A 400 is a rule violation: the same request will
be refused forever. An outbox that retries it blocks the queue behind one bad
entry, and does so silently.

| Response | Outbox action |
|---|---|
| `400` | **Stop retrying.** Park the entry, surface the field-level message to the user, keep draining the rest of the queue |
| `401` | Refresh the token, retry once |
| `409` | See §3.4 (create) and §3.5 (edit) — they mean different things |
| `429` | Back off and retry (§5) |
| `5xx`, network failure | Retry with backoff |

### 3.3 Do not clamp the date input to "now"

Same-day forward entry is legal now, so `max="now"` on the datetime-local would
re-impose exactly the restriction that caused this ticket. If you want inline
feedback before the round trip, clamp to **now + 24h** and **now − 90 days**,
matching the server.

### 3.4 A 409 on **create** means the key belongs to another account

`publicId` is scoped to the caller. A replay of your own key returns your record
(§4). A 409 here means the GUID resolves to a record you cannot see — realistic
if an outbox survives a user switch.

```jsonc
{ "success": false, "statusCode": 409, "message": "That identifier is already in use." }
```

**Regenerate the `publicId` and retry.** Do not treat this as "already synced"
and drop the entry — that silently loses the work.

### 3.5 Send `expectedUpdatedAt` on replayed edits

`PUT /api/work/logs/{id}` accepts an optional `expectedUpdatedAt`. Omitting it
means last-write-wins, so a queued edit silently clobbers whatever changed while
you were offline.

Source it as **`updatedAt ?? createdAt`** from the record you last read — that
fallback mirrors the server's own comparison exactly.

`TimeLogDto` now returns `updatedAt` (null until the log has been edited once).
It previously did not, which meant you could only echo `createdAt`; that works
once, and then every later offline edit is refused as stale against a value you
had no way to obtain. If you built around that, it can be simplified now.

On a stale edit the server replies 409 **with the current server record in
`data`**, so you can show a comparison rather than just failing:

```jsonc
{
  "success": false,
  "statusCode": 409,
  "message": "This time log was changed since you last saw it.",
  "data": { "id": 812, "publicId": "...", "taskDescription": "...", "updatedAt": "..." }
}
```

---

## 4. Idempotency — confirmed working, contract and all

Your spec asked us to confirm the replay behaviour, not just the property. Both
are real, on both endpoints (`POST /api/work/logs` and `POST /api/work/tasks`):

- Sending a `publicId` the server already holds **for you** returns the stored
  record and creates nothing.
- The stored record wins. If you mutated your queued copy between attempts, the
  replay is a **no-op, not an update** — the server returns what it already has.
- Two retries racing are both resolved to whichever won; you get a record, not
  an error.
- A key belonging to another account is refused (§3.4), never handed over.
- Omitting `publicId` keeps the old behaviour: every send creates a row. Online
  callers are unaffected.

This is pinned by tests, so it will not regress silently.

### Don't use the status code to detect a replay

Both a fresh create and an idempotent replay return **HTTP 200** with the stored
record. (Task creates return HTTP 200 with `"statusCode": 201` inside the
envelope — a wart, not a signal.)

Reconcile on the returned `publicId` instead. It is echoed on `TimeLogDto` for
exactly this purpose.

---

## 5. Rate limiting

`work-api` is a **token bucket**: 100 burst, refilling 20/second. Sized so that
flushing a morning's queued writes does not trip it.

A 429 returns the standard envelope with the retry hint **in the message text**:

```jsonc
{ "success": false, "statusCode": 429, "message": "Too many requests. Try again in 3 seconds." }
```

There is **no `Retry-After` header** today. If you would rather parse a header
than a string, say so and we will add one — it is a small change.

---

## 6. Still open

- **Swagger is 404 in production.** It is registered but gated to Development,
  which is why `/swagger/v1/swagger.json` 404s on Railway. Exposing it publicly
  is a deliberate decision nobody has made yet, so it stays gated for now.
- **`CompletedAt` on work items has no validation at all.** A task can be marked
  Done with a completion date in 2087. Time logs are strict, task completion is
  wide open, and both feed the accomplishment report. Unrelated to this ticket
  and untouched — flagged because your offline queue writes to that field.
