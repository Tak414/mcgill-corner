#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend"
BASE_URL="${BASE_URL:-http://127.0.0.1:8000/api}"
SERVER_PID=""
FAILURES=0

if command -v php >/dev/null 2>&1; then
  PHP_BIN="php"
elif command -v php.exe >/dev/null 2>&1; then
  PHP_BIN="php.exe"
elif [ -f "$HOME/.config/herd/bin/php.bat" ]; then
  PHP_BIN="$HOME/.config/herd/bin/php.bat"
else
  echo "FAIL: PHP executable not found"
  exit 1
fi

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pass_fail() {
  local label="$1"
  local condition="$2"

  if [ "$condition" -eq 0 ]; then
    echo "PASS: $label"
  else
    echo "FAIL: $label"
    FAILURES=$((FAILURES + 1))
  fi
}

json_field() {
  "$PHP_BIN" -r '$d=json_decode(stream_get_contents(STDIN), true); $keys=explode(".", $argv[1]); $v=$d; foreach ($keys as $key) { $v=is_array($v) && array_key_exists($key, $v) ? $v[$key] : null; } echo is_scalar($v) ? (string) $v : "";' "$1"
}

print_json() {
  "$PHP_BIN" -r '$d=json_decode(stream_get_contents(STDIN), true); echo json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;' <<<"$1"
}

request() {
  local method="$1"
  local url="$2"
  local token="${3:-}"
  local data="${4:-}"
  local tmp="${TMPDIR:-/tmp}/unlock-smoke-$$-$RANDOM"
  local header_args=(-H "Accept: application/json")

  if [ -n "$token" ]; then
    header_args+=(-H "Authorization: Bearer $token")
  fi
  if [ -n "$data" ]; then
    header_args+=(-H "Content-Type: application/json")
  fi

  local status
  if [ -n "$data" ]; then
    status=$(curl.exe -sS -o "$tmp" -w "%{http_code}" -X "$method" "${header_args[@]}" --data "$data" "$url")
  else
    status=$(curl.exe -sS -o "$tmp" -w "%{http_code}" -X "$method" "${header_args[@]}" "$url")
  fi
  RESPONSE_STATUS="$status"
  RESPONSE_BODY=$(cat "$tmp")
  rm -f "$tmp"
}

echo "UNLOCK API smoke test"
echo "====================="

if command -v jq >/dev/null 2>&1; then
  echo "JSON parser: jq"
else
  echo "JSON parser: php -r"
fi

echo "[1/10] Resetting database"
cd "$BACKEND" || exit 1
export DEMO_MODE=true
"$PHP_BIN" artisan migrate:fresh --seed

echo "[2/10] Starting local server"
"$PHP_BIN" artisan serve --host=127.0.0.1 --port=8000 >"$BACKEND/storage/logs/smoke-server.log" 2>&1 &
SERVER_PID=$!

ready=0
for _ in $(seq 1 30); do
  if curl.exe -sS "$BASE_URL/zones" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.25
done
pass_fail "Local server is ready" "$(( ready == 1 ? 0 : 1 ))"
if [ "$ready" -ne 1 ]; then
  exit 1
fi

echo "[3/10] Logging in attendee1"
request POST "$BASE_URL/login" "" '{"email":"attendee1@unlock.test","password":"unlock123"}'
TOKEN1=$(printf '%s' "$RESPONSE_BODY" | json_field token)
test "$RESPONSE_STATUS" = "200" -a -n "$TOKEN1"
pass_fail "attendee1 login" "$?"

echo "[4/10] Logging in attendee2"
request POST "$BASE_URL/login" "" '{"email":"attendee2@unlock.test","password":"unlock123"}'
TOKEN2=$(printf '%s' "$RESPONSE_BODY" | json_field token)
test "$RESPONSE_STATUS" = "200" -a -n "$TOKEN2"
pass_fail "attendee2 login" "$?"

echo "[5/10] attendee1 RSVPs to live event"
request POST "$BASE_URL/events/1/rsvp" "$TOKEN1"
print_json "$RESPONSE_BODY"
CODE1=$(printf '%s' "$RESPONSE_BODY" | json_field my_code)
test "$RESPONSE_STATUS" = "200" -a -n "$CODE1"
pass_fail "attendee1 RSVP and code" "$?"
echo "attendee1 code: $CODE1"

echo "[6/10] attendee2 RSVPs to live event"
request POST "$BASE_URL/events/1/rsvp" "$TOKEN2"
print_json "$RESPONSE_BODY"
CODE2=$(printf '%s' "$RESPONSE_BODY" | json_field my_code)
test "$RESPONSE_STATUS" = "200" -a -n "$CODE2"
pass_fail "attendee2 RSVP and code" "$?"
echo "attendee2 code: $CODE2"

echo "[7/10] attendee1 enters attendee2 code"
request POST "$BASE_URL/events/1/exchange" "$TOKEN1" "{\"code\":\"$CODE2\"}"
STATUS1=$(printf '%s' "$RESPONSE_BODY" | json_field status)
print_json "$RESPONSE_BODY"
test "$RESPONSE_STATUS" = "200" -a "$STATUS1" = "pending"
pass_fail "First exchange is pending" "$?"

echo "[8/10] attendee2 enters attendee1 code"
request POST "$BASE_URL/events/1/exchange" "$TOKEN2" "{\"code\":\"$CODE1\"}"
STATUS2=$(printf '%s' "$RESPONSE_BODY" | json_field status)
POINTS=$(printf '%s' "$RESPONSE_BODY" | json_field points_gained)
TOTAL_POINTS=$(printf '%s' "$RESPONSE_BODY" | json_field total_points)
ZONE_UNLOCKED=$(printf '%s' "$RESPONSE_BODY" | json_field zone.unlocked)
ZONE_UNLOCKED_NOW=$(printf '%s' "$RESPONSE_BODY" | json_field zone.unlocked_now)
print_json "$RESPONSE_BODY"
test "$RESPONSE_STATUS" = "200" -a "$STATUS2" = "completed"
pass_fail "Mutual exchange completes" "$?"
test "$POINTS" -ge 100 -a "$TOTAL_POINTS" -ge 300
pass_fail "Points are awarded" "$?"
test "$ZONE_UNLOCKED" = "1" -a "$ZONE_UNLOCKED_NOW" = "1"
pass_fail "Zone unlock is returned" "$?"

echo "[9/10] attendee1 reads exchanges and leaderboard"
request GET "$BASE_URL/me/exchanges" "$TOKEN1"
print_json "$RESPONSE_BODY"
test "$RESPONSE_STATUS" = "200"
pass_fail "GET /me/exchanges" "$?"

request GET "$BASE_URL/leaderboard" "$TOKEN1"
print_json "$RESPONSE_BODY"
test "$RESPONSE_STATUS" = "200"
pass_fail "GET /leaderboard" "$?"

echo "[10/10] Re-entering the same code"
request POST "$BASE_URL/events/1/exchange" "$TOKEN1" "{\"code\":\"$CODE2\"}"
ERROR_CODE=$(printf '%s' "$RESPONSE_BODY" | json_field error.code)
print_json "$RESPONSE_BODY"
test "$RESPONSE_STATUS" = "409" -a "$ERROR_CODE" = "ALREADY_EXCHANGED"
pass_fail "Duplicate exchange returns ALREADY_EXCHANGED" "$?"

if [ "$FAILURES" -eq 0 ]; then
  echo "SMOKE TEST: PASS"
  exit 0
fi

echo "SMOKE TEST: FAIL ($FAILURES failures)"
exit 1
