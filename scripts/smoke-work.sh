#!/usr/bin/env bash
#
# Work module smoke test — spec gates WM-B07 §5.4 and §5.5.
#
#   docker compose up -d --build
#   bash scripts/smoke-work.sh [API_BASE_URL]
#
# Covers what unit tests cannot: that both route prefixes are actually served,
# that the real PostgreSQL schema behaves (DateOnly, xmin, the ToTable pins), that
# a token minted for one identity space is refused by the other, and that an
# offline outbox replaying its queue neither duplicates rows nor trips the rate
# limiter.
#
# Idempotent — work data is named with a per-run id and removed over the API at
# the end. The one exception is a single reusable blog admin (smoke_admin), kept
# because blog users have no delete endpoint.
set -uo pipefail

API="${1:-http://localhost:5000}"
RUN=$(date +%H%M%S)$$
PASS=0
FAIL=0

# Extract a value from a JSON body on stdin. The expression receives the parsed
# document as `d`; anything Python can evaluate is fair game.
J() { python -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
try:
    v = eval(sys.argv[1])
except Exception:
    sys.exit(0)
print('' if v is None else v)
" "$1" 2>/dev/null; }

ok()  { PASS=$((PASS + 1)); printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  \033[31mFAIL\033[0m  %s  %s\n' "$1" "${2:-}"; }

expect() { [ "$2" = "$3" ] && ok "$1" || bad "$1" "(expected $2, got $3)"; }

_curl() { # _curl OUTMODE METHOD URL [TOKEN] [BODY]
  local mode=$1 method=$2 url=$3 token=${4:-} body=${5:-}
  local args=(-s -X "$method" "$url")
  [ "$mode" = status ] && args+=(-o /dev/null -w '%{http_code}')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  curl "${args[@]}"
}
code() { _curl status "$@"; }
body() { _curl body "$@"; }

echo "Work module smoke test against $API   (run $RUN)"
echo

echo "== 0. seed =========================================================="
# One fixed admin, reused across runs. Work users are removed over the API at the
# end, but blog users have no delete endpoint — a per-run admin would leave one
# behind on every run and grow without bound.
ADMIN_EMAIL="smoke-admin@example.com"
ADMIN=$(body POST "$API/api/auth/login" "" \
  "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Sm0ke!Pass123\"}" | J "d['data']['accessToken']")

if [ -z "$ADMIN" ]; then
  body POST "$API/api/auth/register" "" \
    "{\"username\":\"smoke_admin\",\"email\":\"$ADMIN_EMAIL\",\"password\":\"Sm0ke!Pass123\",\"confirmPassword\":\"Sm0ke!Pass123\"}" >/dev/null
  ADMIN=$(body POST "$API/api/auth/login" "" \
    "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Sm0ke!Pass123\"}" | J "d['data']['accessToken']")
fi
[ -n "$ADMIN" ] && ok "ralphy admin session" || { bad "ralphy admin login"; exit 1; }

for who in worker other; do
  body POST "$API/api/work/admin/users" "$ADMIN" \
    "{\"username\":\"${who}_$RUN\",\"email\":\"$who-$RUN@example.com\",\"password\":\"W0rk!Pass123\"}" >/dev/null
done
W=$(body POST "$API/api/work/auth/login" "" \
  "{\"email\":\"worker-$RUN@example.com\",\"password\":\"W0rk!Pass123\"}" | J "d['data']['accessToken']")
OTHER=$(body POST "$API/api/work/auth/login" "" \
  "{\"email\":\"other-$RUN@example.com\",\"password\":\"W0rk!Pass123\"}" | J "d['data']['accessToken']")
[ -n "$W" ] && [ -n "$OTHER" ] && ok "two work users provisioned" || bad "work user provisioning"

echo
echo "== 1. both route prefixes answer (deploy-window aliases) ============="
OLD=$(body POST "$API/api/timekeeping/auth/login" "" \
  "{\"email\":\"worker-$RUN@example.com\",\"password\":\"W0rk!Pass123\"}" | J "d['data']['accessToken']")
[ -n "$OLD" ] && ok "POST /api/timekeeping/auth/login (deprecated alias)" || bad "alias login"
expect "GET  /api/work/auth/me"           200 "$(code GET "$API/api/work/auth/me" "$W")"
expect "GET  /api/timekeeping/auth/me"    200 "$(code GET "$API/api/timekeeping/auth/me" "$W")"

echo
echo "== 2. time log CRUD on both prefixes ================================"
LOG=$(body POST "$API/api/work/logs" "$W" \
  "{\"taskDescription\":\"smoke-$RUN new\",\"duration\":1.5,\"loggedAt\":\"2026-09-01T09:00:00Z\"}" | J "d['data']['id']")
LOG2=$(body POST "$API/api/timekeeping/logs" "$W" \
  "{\"taskDescription\":\"smoke-$RUN old\",\"duration\":2,\"loggedAt\":\"2026-09-01T11:00:00Z\"}" | J "d['data']['id']")
[ -n "$LOG" ]  && ok "POST /api/work/logs"                || bad "POST /api/work/logs"
[ -n "$LOG2" ] && ok "POST /api/timekeeping/logs (alias)" || bad "alias POST logs"
expect "GET  /api/work/logs"              200 "$(code GET "$API/api/work/logs" "$W")"
expect "GET  /api/timekeeping/logs"       200 "$(code GET "$API/api/timekeeping/logs" "$W")"
expect "PUT  /api/work/logs/{id}"         200 "$(code PUT "$API/api/work/logs/$LOG" "$W" "{\"taskDescription\":\"smoke-$RUN edited\",\"duration\":2.5,\"loggedAt\":\"2026-09-01T09:00:00Z\"}")"
expect "GET  /api/work/logs/export"       200 "$(code GET "$API/api/work/logs/export" "$W")"
expect "DEL  /api/timekeeping/logs/{id}"  200 "$(code DELETE "$API/api/timekeeping/logs/$LOG2" "$W")"

echo
echo "== 3. gate 5.5 — the two identity spaces stay apart ================="
expect "ralphy admin token REFUSED on /work/logs"   403 "$(code GET "$API/api/work/logs" "$ADMIN")"
expect "ralphy admin token REFUSED on /work/tasks"  403 "$(code GET "$API/api/work/tasks" "$ADMIN")"
expect "work token REFUSED on /work/admin/users"    403 "$(code GET "$API/api/work/admin/users" "$W")"
expect "no token REFUSED"                           401 "$(code GET "$API/api/work/tasks")"
expect "malformed token REFUSED"                    401 "$(code GET "$API/api/work/tasks" "not-a-token")"

echo
echo "== 4. projects, tasks, board ========================================"
PROJ=$(body POST "$API/api/work/projects" "$W" \
  "{\"name\":\"smoke-$RUN\",\"colorHex\":\"#3B82F6\",\"status\":\"Active\",\"startDate\":\"2026-09-01\",\"targetEndDate\":\"2026-09-30\"}" | J "d['data']['publicId']")
[ -n "$PROJ" ] && ok "POST /work/projects (enum names accepted)" || bad "POST /work/projects"
expect "creator is an Admin member"       "Admin" "$(body GET "$API/api/work/projects/$PROJ" "$W" | J "d['data']['myRole']")"

TASK=$(body POST "$API/api/work/tasks" "$W" \
  "{\"title\":\"smoke-$RUN task\",\"projectPublicId\":\"$PROJ\",\"status\":\"Todo\",\"priority\":\"High\",\"startDate\":\"2026-09-02\",\"dueDate\":\"2026-09-10\"}" | J "d['data']['publicId']")
[ -n "$TASK" ] && ok "POST /work/tasks" || bad "POST /work/tasks"

expect "board serves every column, Cancelled excluded" \
  "Backlog,Todo,InProgress,Blocked,Done" \
  "$(body GET "$API/api/work/tasks/board" "$W" | J "','.join(c['status'] for c in d['data']['columns'])")"

expect "PATCH /tasks/{id}/move"           200 "$(code PATCH "$API/api/work/tasks/$TASK/move" "$W" '{"status":"InProgress","newIndex":0}')"
expect "GET   /projects/{id}/timeline"    200 "$(code GET "$API/api/work/projects/$PROJ/timeline" "$W")"

# --- status changes, by dropdown and by drag ---------------------------
# The endpoint used to bind a bare [FromBody] enum, so it demanded the naked
# literal "Done" and silently fell through to Backlog for the obvious payload.
expect "legacy bare-string status body refused" 400   "$(code PATCH "$API/api/work/tasks/$TASK/status" "$W" '\"Done\"')"
expect "PATCH /tasks/{id}/status"               200   "$(code PATCH "$API/api/work/tasks/$TASK/status" "$W" '{"status":"Done"}')"
expect "  ...the new status was committed"      "Done"   "$(body GET "$API/api/work/tasks/$TASK" "$W" | J "d['data']['status']")"
expect "  ...and completedAt was stamped"       "True"   "$(body GET "$API/api/work/tasks/$TASK" "$W" | J "d['data']['completedAt'] is not None")"

code PATCH "$API/api/work/tasks/$TASK/status" "$W" '{"status":"InProgress"}' >/dev/null
expect "moving away from Done clears completedAt" "True"   "$(body GET "$API/api/work/tasks/$TASK" "$W" | J "d['data']['completedAt'] is None")"

# The path most likely to diverge: a drag must complete a task exactly as the
# dropdown does, or the board and the reporting disagree.
code PATCH "$API/api/work/tasks/$TASK/move" "$W" '{"status":"Done","newIndex":0}' >/dev/null
expect "a DRAG into Done also stamps completedAt" "True"   "$(body GET "$API/api/work/tasks/$TASK" "$W" | J "d['data']['completedAt'] is not None")"

TASK2=$(body POST "$API/api/work/tasks" "$W"   "{\"title\":\"smoke-$RUN second\",\"projectPublicId\":\"$PROJ\",\"status\":\"Todo\"}" | J "d['data']['publicId']")
code PATCH "$API/api/work/tasks/$TASK/move" "$W" '{"status":"Todo","newIndex":0}' >/dev/null
expect "a dragged card lands at the requested index" "smoke-$RUN task"   "$(body GET "$API/api/work/tasks/board" "$W" | J "[c for c in d['data']['columns'] if c['status']=='Todo'][0]['items'][0]['title']")"
expect "GET   /tasks/export"              200 "$(code GET "$API/api/work/tasks/export" "$W")"
expect "GET   /work/users/directory"      200 "$(code GET "$API/api/work/users/directory" "$W")"

LBL_ID=$(body POST "$API/api/work/labels" "$W" "{\"name\":\"Smoke-$RUN\",\"colorHex\":\"#EF4444\"}" | J "d['data']['id']")
expect "label names are normalised to lowercase" \
  "smoke-$(echo "$RUN" | tr '[:upper:]' '[:lower:]')" \
  "$(body GET "$API/api/work/labels" "$W" | J "[l['name'] for l in d['data'] if l['id']==$LBL_ID][0]")"

echo
echo "== 5. cross-user isolation =========================================="
expect "a non-member cannot read the project" 404 "$(code GET "$API/api/work/projects/$PROJ" "$OTHER")"
expect "a non-member cannot read the task"    404 "$(code GET "$API/api/work/tasks/$TASK" "$OTHER")"
expect "a non-member cannot move the task"    404 "$(code PATCH "$API/api/work/tasks/$TASK/move" "$OTHER" '{"status":"Todo","newIndex":0}')"

echo
echo "== 6. accomplishments (self-scoped) ================================="
expect "GET /work/accomplishments" 200 "$(code GET "$API/api/work/accomplishments?from=2026-09-01&to=2026-09-30" "$W")"
expect "this run's edited log is reported at its own hours" "2.5" \
  "$(body GET "$API/api/work/accomplishments?from=2026-09-01&to=2026-09-30" "$W" \
     | J "[e['hours'] for day in d['data']['days'] for e in day['entries'] if 'smoke-$RUN edited' in e['title']][0]")"
expect "another user's accomplishments are empty" "0" \
  "$(body GET "$API/api/work/accomplishments?from=2026-09-01&to=2026-09-30" "$OTHER" | J "len(d['data']['days'])")"

echo
echo "== 7. personal access tokens ======================================="
RO=$(body POST "$API/api/work/tokens" "$W" "{\"name\":\"ro-$RUN\",\"scopes\":[\"tasks:read\"]}"                  | J "d['data']['token']")
RW=$(body POST "$API/api/work/tokens" "$W" "{\"name\":\"rw-$RUN\",\"scopes\":[\"tasks:read\",\"tasks:write\"]}" | J "d['data']['token']")
case "$RO" in rpat_*) ok "token issued in rpat_ format" ;; *) bad "token format" "got '$RO'" ;; esac

expect "read-only PAT can read"                  200 "$(code GET "$API/api/work/tasks" "$RO")"
expect "read-only PAT CANNOT write"              403 "$(code POST "$API/api/work/tasks" "$RO" '{"title":"must not exist"}')"
expect "read-write PAT can write"                200 "$(code POST "$API/api/work/tasks" "$RW" "{\"title\":\"smoke-$RUN via PAT\"}")"
# A PAT presented to a JWT-only endpoint fails that scheme outright, so 401 is
# the honest answer rather than 403.
expect "PAT CANNOT issue tokens"                 401 "$(code GET "$API/api/work/tokens" "$RO")"
expect "PAT CANNOT reach admin users"            401 "$(code GET "$API/api/work/admin/users" "$RW")"

RO_ID=$(body GET "$API/api/work/tokens" "$W" | J "[t['id'] for t in d['data'] if t['name']=='ro-$RUN'][0]")
expect "DELETE /work/tokens/{id}"                200 "$(code DELETE "$API/api/work/tokens/$RO_ID" "$W")"
expect "a revoked PAT stops working immediately" 401 "$(code GET "$API/api/work/tasks" "$RO")"

echo
echo "== 8. offline sync (PWA backend) ===================================="
# Everything here is about an outbox replaying queued writes on reconnect. The
# duplicate check is the one that matters most: it has to hold before the
# frontend outbox ever points at production.

KEY=$(python -c "import uuid; print(uuid.uuid4())")
THREE_DAYS_AGO=$(date -u -d '3 days ago' +%Y-%m-%dT%H:%M:%SZ)
TOMORROW=$(date -u -d 'tomorrow' +%Y-%m-%dT%H:%M:%SZ)

IDEM_BODY="{\"publicId\":\"$KEY\",\"taskDescription\":\"smoke-$RUN queued\",\"duration\":1,\"loggedAt\":\"$THREE_DAYS_AGO\"}"

FIRST=$(body POST "$API/api/work/logs" "$W" "$IDEM_BODY")
FIRST_ID=$(echo "$FIRST" | J "d['data']['id']")
expect "a client-supplied publicId is the one stored" "$KEY" "$(echo "$FIRST" | J "d['data']['publicId']")"

# The check the whole mechanism exists for. A create whose response was lost gets
# sent again; if it inserts a second row the accomplishment report is wrong and
# nobody finds out until DTR cutoff.
SECOND_ID=$(body POST "$API/api/work/logs" "$W" "$IDEM_BODY" | J "d['data']['id']")
expect "a REPLAYED create returns the same record" "$FIRST_ID" "$SECOND_ID"
expect "  ...and did not create a second row" "1" \
  "$(body GET "$API/api/work/logs?pageSize=100" "$W" | J "len([i for i in d['data']['items'] if i['taskDescription']=='smoke-$RUN queued'])")"

# A GUID is not a capability. Reusing someone else's must never hand their record
# over; the unique index refuses the insert instead.
expect "another user's key does NOT return the first user's record" 409 \
  "$(code POST "$API/api/work/logs" "$OTHER" "$IDEM_BODY")"

# --- the client's clock, not the server's ------------------------------
expect "a backdated log keeps its own date" "True" \
  "$(body GET "$API/api/work/logs?pageSize=100" "$W" | J "[i['loggedAt'][:10] for i in d['data']['items'] if i['taskDescription']=='smoke-$RUN queued'][0] == '${THREE_DAYS_AGO:0:10}'")"

expect "a log dated in the future is refused" 400 \
  "$(code POST "$API/api/work/logs" "$W" "{\"taskDescription\":\"smoke-$RUN future\",\"duration\":1,\"loggedAt\":\"$TOMORROW\"}")"
expect "a log beyond the backdating window is refused" 400 \
  "$(code POST "$API/api/work/logs" "$W" "{\"taskDescription\":\"smoke-$RUN ancient\",\"duration\":1,\"loggedAt\":\"2020-01-01T09:00:00Z\"}")"

# --- stale edits ------------------------------------------------------
STALE=$(body PUT "$API/api/work/tasks/$TASK2" "$W" \
  "{\"title\":\"smoke-$RUN offline edit\",\"status\":\"Todo\",\"priority\":\"Normal\",\"expectedUpdatedAt\":\"2020-01-01T00:00:00Z\"}")
expect "a stale offline edit is refused" 409 \
  "$(code PUT "$API/api/work/tasks/$TASK2" "$W" "{\"title\":\"smoke-$RUN offline edit\",\"status\":\"Todo\",\"priority\":\"Normal\",\"expectedUpdatedAt\":\"2020-01-01T00:00:00Z\"}")"
# Without the current state the client can only drop the edit or retry forever.
expect "  ...and the 409 carries the current server state" "smoke-$RUN second" \
  "$(echo "$STALE" | J "d['data']['title']")"
expect "a current snapshot still goes through" 200 \
  "$(code PUT "$API/api/work/tasks/$TASK2" "$W" "{\"title\":\"smoke-$RUN second\",\"status\":\"Todo\",\"priority\":\"Normal\"}")"

# --- records deleted server-side --------------------------------------
GONE=$(python -c "import uuid; print(uuid.uuid4())")
expect "editing a task deleted server-side is a clean 404" 404 \
  "$(code PUT "$API/api/work/tasks/$GONE" "$W" "{\"title\":\"gone\",\"status\":\"Todo\",\"priority\":\"Normal\"}")"
expect "deleting an already-deleted task is a clean 404" 404 \
  "$(code DELETE "$API/api/work/tasks/$GONE" "$W")"

# --- a flush must not trip the rate limiter ----------------------------
# The failure this guards against is specific: a device offline all morning
# flushes its queue in a few seconds, trips the limit, and the sync that was
# meant to recover the data fails instead.
BURST_429=0
for i in $(seq 1 50); do
  BK=$(python -c "import uuid; print(uuid.uuid4())")
  RC=$(code POST "$API/api/work/logs" "$W" \
    "{\"publicId\":\"$BK\",\"taskDescription\":\"smoke-$RUN burst\",\"duration\":0.25,\"loggedAt\":\"$THREE_DAYS_AGO\"}")
  [ "$RC" = "429" ] && BURST_429=$((BURST_429 + 1))
done
expect "50 sequential creates flush without a 429" "0" "$BURST_429"

# --- refresh tells a dead session from a bad day -----------------------
RT=$(body POST "$API/api/work/auth/login" "" \
  "{\"email\":\"worker-$RUN@example.com\",\"password\":\"W0rk!Pass123\"}" | J "d['data']['refreshToken']")
expect "a valid refresh token refreshes"      200 "$(code POST "$API/api/work/auth/refresh" "" "{\"refreshToken\":\"$RT\"}")"
# Rotated by the call above, so this same token is now revoked.
expect "a revoked refresh token is 401"       401 "$(code POST "$API/api/work/auth/refresh" "" "{\"refreshToken\":\"$RT\"}")"
expect "an unknown refresh token is 401"      401 "$(code POST "$API/api/work/auth/refresh" "" '{"refreshToken":"never-issued"}')"

# --- the service worker has to be allowed to cache reads ---------------
expect "GET /work/tasks is not marked no-store" "0" \
  "$(curl -s -o /dev/null -D - -H "Authorization: Bearer $W" "$API/api/work/tasks" | grep -ci 'cache-control: *no-store' || true)"

echo
echo "== 9. cleanup ======================================================="
RW_ID=$(body GET "$API/api/work/tokens" "$W" | J "[t['id'] for t in d['data'] if t['name']=='rw-$RUN'][0]")
code DELETE "$API/api/work/tokens/$RW_ID" "$W" >/dev/null
code DELETE "$API/api/work/labels/$LBL_ID" "$W" >/dev/null
code DELETE "$API/api/work/projects/$PROJ" "$W" >/dev/null
code DELETE "$API/api/work/logs/$LOG" "$W" >/dev/null
for l in $(body GET "$API/api/work/logs?pageSize=200" "$W" | J "' '.join(str(i['id']) for i in d['data']['items'])"); do
  code DELETE "$API/api/work/logs/$l" "$W" >/dev/null
done
for t in $(body GET "$API/api/work/tasks" "$W" | J "' '.join(i['publicId'] for i in d['data']['items'])"); do
  code DELETE "$API/api/work/tasks/$t" "$W" >/dev/null
done
for u in $(body GET "$API/api/work/admin/users" "$ADMIN" | J "' '.join(u['publicId'] for u in d['data'] if u['username'].endswith('_$RUN'))"); do
  code DELETE "$API/api/work/admin/users/$u" "$ADMIN" >/dev/null
done
expect "no smoke users left behind" "0"   "$(body GET "$API/api/work/admin/users" "$ADMIN" | J "len([u for u in d['data'] if u['username'].endswith('_$RUN')])")"

echo
echo "====================================================================="
printf '  PASS: %s    FAIL: %s\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
