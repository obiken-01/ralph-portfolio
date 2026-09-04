#!/usr/bin/env bash
#
# Work module smoke test — spec gates WM-B07 §5.4 and §5.5.
#
#   docker compose up -d --build
#   bash scripts/smoke-work.sh [API_BASE_URL]
#
# Covers what unit tests cannot: that both route prefixes are actually served,
# that the real PostgreSQL schema behaves (DateOnly, xmin, the ToTable pins), and
# that a token minted for one identity space is refused by the other.
#
# Idempotent — everything it creates is named with a per-run id and removed at the
# end, so it can be run repeatedly against the same database.
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
body POST "$API/api/auth/register" "" \
  "{\"username\":\"smoke_$RUN\",\"email\":\"smoke-$RUN@example.com\",\"password\":\"Sm0ke!Pass123\",\"confirmPassword\":\"Sm0ke!Pass123\"}" >/dev/null
ADMIN=$(body POST "$API/api/auth/login" "" \
  "{\"email\":\"smoke-$RUN@example.com\",\"password\":\"Sm0ke!Pass123\"}" | J "d['data']['accessToken']")
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
echo "== 8. cleanup ======================================================="
RW_ID=$(body GET "$API/api/work/tokens" "$W" | J "[t['id'] for t in d['data'] if t['name']=='rw-$RUN'][0]")
code DELETE "$API/api/work/tokens/$RW_ID" "$W" >/dev/null
code DELETE "$API/api/work/labels/$LBL_ID" "$W" >/dev/null
code DELETE "$API/api/work/projects/$PROJ" "$W" >/dev/null
code DELETE "$API/api/work/logs/$LOG" "$W" >/dev/null
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
