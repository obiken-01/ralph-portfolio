# Work Module — Phase B0 implementation plan

Companion to `WORK_MODULE_SPEC_BACKEND.md`. That spec was written against an assumed
file layout; this document is the corrected version, checked against the tree on
`feature/work-module` (branched off `origin/main` @ `f7ab2cb`).

**Baseline before any change:** `dotnet build Ralphy.slnx` clean (1 pre-existing
`CS0105` warning in `Program.cs`), `dotnet test` 72/72 green. Any B0 commit that
does not hold both is not done.

---

## 1. Decisions locked

| Question | Decision | Consequence |
|---|---|---|
| Table rename | **`ToTable` pin** — classes renamed, DB untouched | B0 ships **zero migrations**. Verified by an empty-scaffold gate (§5). |
| `VisibleTo` test harness | **Provider-conditional + keep SQLite** | `xmin`/`ILike` guarded behind `Database.IsNpgsql()`; leak tests run in the existing fast harness. Concurrency stays untested — accepted. |
| Service failure shape | **Existing throwing convention** | Work services throw; `ExceptionMiddleware` maps to real HTTP codes. Spec §5.5's `ApiResponse<T>` return types are **not** adopted. |
| Branch | `feature/work-module` off `origin/main` | — |

### The `ToTable` pin, precisely

The pin covers the *table* name. It does **not** cover the `TimeLogs` column rename
(`TimekeepingUserId` → `WorkUserId`), which is a separate schema change. To keep B0
at zero migrations, pin the column too:

```csharp
modelBuilder.Entity<WorkUser>(entity =>
{
    // Classes renamed Timekeeping → Work in B0; the physical table is deliberately
    // NOT renamed. Zero migration risk on Railway, mildly confusing forever.
    entity.ToTable("TimekeepingUsers");
    // …
});

modelBuilder.Entity<TimeLog>(entity =>
{
    entity.Property(t => t.WorkUserId).HasColumnName("TimekeepingUserId");
    // …
});
```

EF derives index names from the (pinned) table name, so `IX_TimekeepingUsers_Username`
and friends are unaffected. `UserType` stays an int with value `1`, so no `RefreshTokens`
data changes either — the enum *member* rename is source-only.

---

## 2. Corrected rename inventory

The spec lists five folder renames. Three of them are **new folder creation** — this
repo keeps entities, repository interfaces and repository implementations flat.
Only `Application/DTOs/Timekeeping/` actually exists as a folder today.

### Domain

| From | To |
|---|---|
| `Entities/TimekeepingUser.cs` | `Entities/Work/WorkUser.cs` *(new folder)* |
| `Entities/TimeLog.cs` | `Entities/Work/TimeLog.cs` — `TimekeepingUserId`→`WorkUserId`, nav `TimekeepingUser`→`WorkUser` |
| `Enums/UserType.cs` | `Timekeeping = 1` → `Work = 1` *(value unchanged)* |
| `Interfaces/Repositories/ITimekeepingUserRepository.cs` | `Interfaces/Repositories/Work/IWorkUserRepository.cs` *(new folder)* |
| `Interfaces/Repositories/ITimeLogRepository.cs` | `Interfaces/Repositories/Work/ITimeLogRepository.cs` — param `timekeepingUserId`→`workUserId` |

### Infrastructure

| From | To |
|---|---|
| `Data/Repositories/TimekeepingUserRepository.cs` | `Data/Repositories/Work/WorkUserRepository.cs` *(new folder)* |
| `Data/Repositories/TimeLogRepository.cs` | `Data/Repositories/Work/TimeLogRepository.cs` |
| `Data/AppDbContext.cs` | DbSet `TimekeepingUsers`→`WorkUsers`; entity config renamed; `ToTable`/`HasColumnName` pins added |
| `Data/UnitOfWork.cs` | property `TimekeepingUsers`→`WorkUsers` |

### Application

| From | To |
|---|---|
| `DTOs/Timekeeping/` *(9 files)* | `DTOs/Work/` |
| `CreateTimekeepingUserDto` | `CreateWorkUserDto` |
| `UpdateTimekeepingUserDto` | `UpdateWorkUserDto` |
| `TimekeepingUserDto` | `WorkUserDto` |
| `TimekeepingLoginResponseDto` | `WorkLoginResponseDto` |
| `ResetTimekeepingPasswordDto` | `ResetWorkPasswordDto` |
| `Services/TimekeepingAuthService.cs` | `Services/Work/WorkAuthService.cs` |
| `Services/TimekeepingUserService.cs` | `Services/Work/WorkUserService.cs` |
| `Services/TimeLogService.cs` | `Services/Work/TimeLogService.cs` |
| `Services/Interfaces/ITimekeeping*.cs` | `IWorkAuthService`, `IWorkUserService` |
| `Extensions/ApplicationExtensions.cs` | DI registrations |
| `Domain/Interfaces/IUnitOfWork .cs` | `TimekeepingUsers`→`WorkUsers`. **Note the space in the filename** — fix it while renaming. |

### API

| From | To | Routes |
|---|---|---|
| `Controllers/TimekeepingAuthController.cs` | `Controllers/Work/WorkAuthController.cs` | `api/work/auth` + deprecated alias `api/timekeeping/auth` |
| `Controllers/TimeLogController.cs` | `Controllers/Work/WorkTimeLogsController.cs` | `api/work/logs` + alias `api/timekeeping/logs` |
| `Controllers/TimekeepingAdminController.cs` | `Controllers/Work/WorkAdminUsersController.cs` | `api/work/admin/users` + alias `api/timekeeping/admin/users` |

### Frontend (`Ralphy.Web`)

| From | To |
|---|---|
| `src/pages/admin/AdminTimekeepingUsersPage.jsx` | `AdminWorkUsersPage.jsx` |
| `src/App.jsx` route `/admin/timekeeping-users` | `/admin/work-users` (keep a `<Navigate>` redirect for one release) |
| `src/components/admin/AdminLayout.jsx` | sidebar label `Timekeeping Users` → `Work Users` |

### Docs — omitted from the spec's inventory

`docs/API_REFERENCE.md` (§ Timekeeping, 5 refs), `docs/ARCHITECTURE.md` (2),
`docs/DEPLOYMENT.md` (2).

### Do NOT touch

- `Migrations/*.Designer.cs` and `20260505022018_AddTimekeepingTables.cs` — applied
  history is immutable. The old names live there forever; that is correct.
- `Migrations/AppDbContextModelSnapshot.cs` — EF-managed. It must come out of B0
  **byte-identical**; see §5.
- `RefreshToken`, the `UserType` enum *type*, `ApiResponse<T>`, anything in the blog domain.

---

## 3. The auth gap — promoted from B4 into B0

Spec WM-B43 files `ClaimsHelper.GetWorkUserId()` and the `"WorkUser"` policy under
phase B4. **Neither can be built as written, and the reason is a live bug.**

`TokenService.GenerateAccessToken` issues an identical claim set — `sub`, `email`,
`unique_name`, `jti` — for a Ralphy blog admin and a Timekeeping user. Nothing in
the token says which table the `sub` belongs to. Consequences today:

- `TimeLogController` is bare `[Authorize]`, then resolves `sub` against
  `TimekeepingUsers`. A Ralphy admin holding `User.Id = 1` reads
  `TimekeepingUser #1`'s logs. Two separate identity spaces, one integer.
- `TimekeepingAdminController` is also bare `[Authorize]`. A timekeeping user's own
  JWT can create, reset-password and delete timekeeping users.

Every authorisation rule in the Work module — `VisibleTo`, project roles, PAT scope
resolution — resolves through `GetWorkUserId()`. Building B1–B4 on top of an
unauthenticated user id means the whole visibility model rests on nothing.

**WM-B08 (new, blocking):**

1. `TokenService` — add a `user_type` claim to **both** `GenerateAccessToken` overloads.
   The call sites split cleanly: `AuthService` uses `GenerateAccessToken(User)` ×3
   (always `UserType.Ralphy`, no signature change needed); `WorkAuthService` uses
   `GenerateAccessToken(int, string, string)` ×2, which gains a `UserType` parameter
   on `ITokenService` so the caller must state which identity space it is minting for.
2. `ClaimsHelper.GetWorkUserId(ClaimsPrincipal)` — throws unless `user_type == Work`.
   Keep `GetUserId` for the blog side, similarly guarded.
3. `"WorkUser"` and `"RalphyAdmin"` policies registered where `AddAuthorization()`
   already lives, in `InfrastructureExtensions`.
4. Apply `[Authorize(Policy = "WorkUser")]` to `WorkAuthController.Me`,
   `WorkTimeLogsController`; `[Authorize(Policy = "RalphyAdmin")]` to
   `WorkAdminUsersController`.

**Deploy note:** access tokens already in the wild carry no `user_type` claim and
will 403 against the new policies. Access tokens are 15 minutes and the refresh path
re-issues through the same method, so this self-heals within one refresh cycle. No
forced logout — but it *is* a real 15-minute window, so do not deploy it during a
DTR cutoff.

---

## 4. Defects in the spec to carry forward (not B0 work — record now, fix in phase)

**B1 — the phase boundary does not quite hold (found while building B1; fixed).**
Spec B1 adds entity classes and B2 configures them. That works for entities with a
conventional `Id`, but `TimeLog.WorkItem` drags the entire new graph into the model by
navigation discovery, and `WorkItemLabel` is a composite-key join entity with no `Id`.
An unconfigured key fails model validation outright, which breaks **every** test that
touches `AppDbContext` — 71 of 79, none of them Work tests. One `HasKey` line now lives
in `OnModelCreating` ahead of WM-B20, commented as such. Nothing else from B2 was pulled
forward.

**B2 — `ReorderColumnAsync` bypasses `VisibleTo`.** *(Interface signature already fixed
in B1 — `userId` is the first parameter. The implementation must actually use it.)*
Spec §4.4 queries `_db.WorkItems`
directly and fetches `target` via an unscoped `FirstAsync`, inside the file the spec
itself calls "the single most important … nothing bypasses it." Worse: when
`projectId` is `null` (standalone items), `Where(w => w.Status == status && w.ProjectId == projectId)`
matches **every user's** standalone items in that column and renumbers all of them.
That is a cross-user write on every drag of a personal card. Thread `userId` through
the signature and compose on `VisibleTo`.

**B3 — cross-project moves are unchecked.** `MoveWorkItemDto.ProjectPublicId` allows
moving an item into another project. `VisibleTo` proves membership of the *source*;
nothing proves membership of the *target*. `WorkItemService.MoveAsync` must check the
destination role ≥ `Member` separately.

**B3 — no `PagedResult<T>` exists.** `Application/Common` has no generic paged type;
the convention is per-module (`PagedTimeLogResultDto`). Either add
`Common/PagedResult<T>` or follow the local convention — do not assume it is there.

**B2 — `RefreshToken.User` navigation is still on the entity** despite
`20260505072150_RemoveRefreshTokenUserForeignKey`. The RAL-6 / RAL-23 landmine is
still armed for anyone who adds `.Include(rt => rt.User)`. Consider deleting the
property outright while touching this area.

**B4 — the rate limiter's rejection message is hardcoded.** `Program.cs` `OnRejected`
writes *"Too many requests. Limit is 10 per hour."* for every policy. Adding
`work-api` (WM-B44) needs the message derived from the policy, or Work clients get a
wrong number.

**B2 — provider-conditional config is now required, not optional.** Per the locked
decision, `EF.Functions.ILike` and `Property(w => w.RowVersion).IsRowVersion()` must
sit behind `Database.IsNpgsql()`, with a `ToLower().Contains()` search fallback, or
the Work tests cannot run in `TestDb`'s SQLite harness at all.

**Housekeeping:** `Program.cs:11` duplicates the `Microsoft.AspNetCore.RateLimiting`
using (`CS0105`). Free to fix in B0.

---

## 5. Verification gates

Run in order. B0 is not done until all five pass.

1. `dotnet build Ralphy.slnx` — clean, and the `CS0105` warning gone.
2. `dotnet test Ralphy.slnx` — **72/72**, unchanged. B0 renames nothing tested;
   any red here means a rename went too far.
3. **Zero schema drift.** Scaffolds from the model only — no database required, so run
   this before bothering with Docker.
   `dotnet ef migrations add _B0Check -p Ralphy.Infrastructure -s Ralphy.Api`
   must scaffold an **empty** `Up`/`Down`. If it does not, a `ToTable` or
   `HasColumnName` pin is missing. Then delete the two scaffolded files.

   The `AppDbContextModelSnapshot.cs` diff that comes with this is **expected and
   must be kept** — the snapshot records CLR type names, so renaming
   `TimekeepingUser` → `WorkUser` legitimately rewrites it (and reorders blocks,
   since `…Entities.Work.*` sorts after `…Entities.User`). Reverting it would leave
   the next real migration diffing against a stale model. The empty `Up`/`Down` is
   the proof that nothing *physical* moved — not the snapshot being byte-identical.
   Spot-check that `b.Property<int>("WorkUserId")` carries
   `.HasColumnName("TimekeepingUserId")`.

   Note `dotnet ef migrations remove` wants a live database connection to check
   whether the migration was applied; with Postgres down, just delete the files.
4. **Local Postgres smoke test.** `docker compose up` (postgres:16 + api + seq), then
   against both route families:
   - `POST /api/work/auth/login` **and** `POST /api/timekeeping/auth/login`
   - time-log create / list / update / delete / export on both prefixes
   - `GET /api/work/auth/me`
5. **Negative auth tests** — the point of WM-B08. Log in as a Ralphy admin, call
   `/api/work/logs` with that JWT: expect **403**, not someone else's time logs. Log
   in as a work user, call `/api/work/admin/users`: expect **403**.

Gate 5 is the one worth writing as an xUnit test rather than a manual curl. It is a
regression that would be invisible on screen.

---

## 6. Revised B0 work items

| ID | Title | Depends on | Status |
|---|---|---|---|
| WM-B01 | Domain rename: `WorkUser`, `TimeLog` FK/nav, `UserType.Work`, repo interfaces into `Repositories/Work/` | — | ✅ done |
| WM-B02 | Infrastructure rename: repositories into `Repositories/Work/`, `AppDbContext` config, `UnitOfWork` | WM-B01 | ✅ done |
| WM-B03 | **`ToTable` + `HasColumnName` pins** and the zero-drift gate (§5.3) | WM-B02 | ✅ done — probe scaffolded empty `Up`/`Down` |
| WM-B04 | Application rename: `DTOs/Work/`, `WorkAuthService`, `WorkUserService`, `TimeLogService`, DI | WM-B02 | ✅ done |
| WM-B05 | API rename: three controllers into `Controllers/Work/`, `api/work/*` + deprecated aliases | WM-B04 | ✅ done |
| WM-B08 | **`user_type` claim, `GetWorkUserId()`, `WorkUser`/`RalphyAdmin` policies** *(was WM-B43)* | WM-B05 | ✅ done — + 7 regression tests |
| WM-B06 | Ralphy admin page + route + sidebar (`AdminWorkUsersPage.jsx`, `/admin/work-users` with redirect) | WM-B05 | ✅ done |
| WM-B09 | Docs: `API_REFERENCE.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md` | WM-B05 | ✅ done |
| WM-B07 | Deploy to Railway (backend first, aliases live), smoke-test §5.4 + §5.5, then Netlify, then drop aliases | all | ⬜ **not started — needs a running Postgres** |

Gates §5.1 (clean build, `CS0105` gone), §5.2 (tests), §5.3 (zero drift) and §5.5 (negative
auth, as `Ralphy.Tests/IdentitySpaceTests.cs`) are green: **79 tests passing**, up from 72.
Gate §5.4 — the two-prefix smoke test against a live Postgres — is the one outstanding item.

The `user_type` fix went slightly wider than the Work module: the 14 blog controllers were
also bare `[Authorize]`, so a Work token could create blog posts. Rather than edit 14 call
sites, `ClaimsHelper.GetUserId` now asserts `UserType.Ralphy` the same way `GetWorkUserId`
asserts `UserType.Work` — one chokepoint, both directions.

`WM-B04` in the original spec was the migration item — it no longer exists under the
`ToTable` decision, and its ID is reused above. The spec's `WM-B07` (fix RAL-23) is
unchanged and still gates WM-B40.

---

## 7. Phase B1 is unblocked by this document

Nothing in B1 (enums, `Project`, `WorkItem`, `Label`, `Milestone`, repository
interfaces) depends on a decision left open here. Start it the moment gate §5.5 is
green.
