# PWA Offline — Backend Plan

Corrections and decisions for `PWA_OFFLINE_BACKEND.md`, written after auditing
the code the spec describes. Read this before the spec; several of the spec's
starting assumptions do not hold.

---

## 1. Audit — spec assumption vs. actual code

| Item | Spec assumes | Actual | Work |
|---|---|---|---|
| PWA-B1/B2 `WorkItem` | `PublicId` exists | ✅ exists, `Guid.NewGuid()` default | Accept + idempotency |
| PWA-B1/B2 `TimeLog` | `PublicId` exists | ❌ **no `PublicId` at all** — keyed by `int Id` | Column + migration first |
| PWA-B3 unique index | "confirm it exists" | ✅ `WorkItem`, `Project`, `Milestone`, `WorkUser` | Add for `TimeLog` |
| PWA-B4 `LoggedAt` | may be overwritten | ✅ already read from the DTO on create *and* update | No fix; add a test |
| PWA-B4 UTC normalisation | flagged as needed | ❌ absent | Real fix (see §3) |
| PWA-B4 `CompletedAt` | should carry offline time | ❌ always `DateTime.UtcNow` server-side | Real fix |
| PWA-B5 clock guard | absent | ❌ `CreateTimeLogDto` has **no validator at all** | Real fix |
| PWA-B6 rate limit | `work-api` too tight for a flush | fixed window, 200/min | Reshape to a bucket |
| PWA-B7/B8 conflict | absent | ❌ absent | Real fix |
| PWA-B9 refresh 401-vs-5xx | "worth reading" | ✅ already correct | No fix; add a test |
| PWA-B10 clean 404 | "make sure" | ✅ `KeyNotFoundException` → 404 in middleware | No fix; add a test |
| PWA-B11 `Cache-Control` | audit `/api/work/*` | ✅ `no-store` is only on the OPTIONS preflight | No fix; assert in smoke |
| PWA-B12 batch endpoint | defer | — | Deferred, as instructed |

Four of the twelve items were already satisfied. They still get tests, because
"correct today with nothing pinning it" is how PWA-B4 became a spec item in the
first place.

---

## 2. Locked decisions

### D1 — `TimeLog` gains a `PublicId`; routes stay integer-keyed

Idempotent replay needs a client-generatable key, and `TimeLog` has none. Adding
one is a migration — the first schema change since the Work module landed.

The **routes do not change.** `PUT/DELETE /api/work/logs/{id}` stay `int`, and
`TimeLogDto.Id` stays `int`, because `Ralphy.Web` and the tools site both address
logs that way today. `PublicId` is added *alongside* as the sync key and is
exposed on the DTO so a client can correlate what it queued with what came back.

Migration is three steps, not one: add nullable → backfill `gen_random_uuid()` →
set `NOT NULL` and add the unique index. A single `AddColumn(nullable: false)`
would stamp every existing row with the same all-zero GUID and then fail on the
unique index.

### D2 — Conflict detection compares against an effective last-modified

`UpdatedAt` is `null` until a record is first updated, so the spec's
`item.UpdatedAt > dto.ExpectedUpdatedAt` is a null comparison that silently
evaluates false — every conflict against a never-edited record would be missed.
The comparison uses `UpdatedAt ?? CreatedAt`.

The 1-second tolerance from the spec is kept, and matters for the same reason
the spec gives.

### D3 — 409 responses carry the current server state

The spec asks for this (§2) but the codebase throws from services and formats in
`ExceptionMiddleware`, which only knows how to serialise a message. So the fix is
a `ConflictException` that carries a payload, and one arm in the middleware that
serialises it. Nothing else about the error contract changes.

### D4 — Client-supplied `CompletedAt`, not server clock

`ApplyStatus` stamps `DateTime.UtcNow` on the transition into `Done`. A task
completed offline on Monday and synced Wednesday must report Monday. `ApplyStatus`
takes an optional explicit time and falls back to `UtcNow` when the client does
not supply one, so online behaviour is untouched.

### D5 — Token bucket, and the time-log controller joins the policy

`work-api` becomes a token bucket (100 tokens, 20/s replenish) per the spec's
first option. Separately: `WorkTimeLogsController` carries **no rate limit
attribute at all** — the one Work controller that does not. That is a live gap,
and the bucket is sized for a sync flush, so it is brought under the policy
rather than left unlimited.

### D6 — Timestamps are normalised to UTC at the service boundary

`LoggedAt` has no explicit column type, so Npgsql maps it `timestamptz`, which
rejects `DateTimeKind.Unspecified`. Today's clients send `Z` and it works. A
replayed offline timestamp that lost its suffix would be a 500, not a 400.
Normalisation happens once, in the service, where every path meets.

---

## 3. Verification gates

1. `dotnet test` — 142 existing tests stay green, new ones added per item.
2. `scripts/smoke-work.sh` against live PostgreSQL, extended with §10 of the spec.
3. The duplicate-replay check specifically: identical create twice → one row.
4. A 50-item sequential flush on one token → no 429.
5. Migration reviewed as generated SQL before it touches the dev volume.

---

## 4. Results

**187 unit tests + 65 smoke assertions, all green.** The smoke run covers every
box in §10 of the spec against live PostgreSQL.

### Migration, proven on populated data

The dev volume's `TimeLogs` was empty, so applying the migration there proved
nothing about the case it was rewritten for. Tested separately on a scratch
database holding five rows:

- the **scaffolded** version failed exactly as predicted —
  `could not create unique index: Key ("PublicId")=(00000000-…) is duplicated`
- the **shipped** version gave 5 rows, 5 non-null, 5 distinct

So the rewrite was necessary, not cosmetic.

### Tests shown non-vacuous

- ignoring the client's `PublicId` entirely → 6 idempotency tests fail
- reverting the `CreatedAt` fallback in the staleness check → exactly the one
  test written for it fails

Removing *only* the up-front existence check changes nothing, because the
unique-index catch delivers the same guarantee on its own. That is the intended
design — two independent mechanisms — and the tests assert the outcome rather
than which one produced it.

### Not done

- **PWA-B12** — the batch `POST /api/work/sync` endpoint. Deferred, as the spec
  instructs: build the naive per-item loop first.
- **RAL-23** (idle logout) is still open. §7 of the spec asks whether it is a
  refresh-path issue that offline sessions would inherit. It is not: the refresh
  service throws `UnauthorizedAccessException` only for an unknown, revoked,
  expired, or wrong-identity-space token, and every other failure propagates as
  a 5xx. Both halves are now pinned by tests. Whatever RAL-23 is, it is not
  here.

### Worth knowing for the frontend

- Send the enum **name**, not the display label — `"InProgress"`, not
  `"In Progress"`.
- `publicId` is optional everywhere. Omit it and behaviour is exactly as before;
  send it and the create becomes replay-safe.
- A 409 always carries the current server record in `data`.
- Reusing another account's `publicId` returns **409, not 200** — do not treat a
  409 on create as "already synced" without checking the id came back matching.

### The backdating window applies to creates only

PWA-B5 asks for a ±90 day guard on `LoggedAt`. That belongs on **create**, where
a device with a wrong clock could invent an entry at a nonsense date.

It is deliberately **not** applied to updates. An update targets a record the
user deliberately opened, and the client resends `loggedAt` on every edit — so
the window there would make a log older than ninety days permanently
uneditable, typo and all, for no integrity gain. The no-future rule stays on
both paths, so forward drift is still caught.

### One thing that changed beyond the spec

The Work controllers never ran their FluentValidation validators — the project
references `FluentValidation.DependencyInjectionExtensions`, which registers
validators but does not invoke them, and only the blog controllers call
`ValidateAsync` by hand. `CreateWorkItemDtoValidator` had therefore never run
since it was written.

The clock guard could not work without fixing that, so validation is now wired
up on the two Work controllers via a filter. It is deliberately **not** global:
switching validation on across the blog surface would start rejecting requests
that are accepted today, which is a much larger change than this one and belongs
in its own.
