#!/usr/bin/env bash
set -euo pipefailecho "[ccr-echo "[ccr-launch] Launching Claude Code..."
echo "[ccr-launch] If you previously saw a Raw mode error, this terminal must be a real TTY (macOS Terminal/iTerm)."

# Try allocating a pseudo-TTY via 'script' if available and we are not already in a raw-capable TTY.
if [[ ! -t 0 || ! -t 1 || "${TERM_PROGRAM:-}" == "vscode" ]]; thenh] Router is up. Testing health (expect 200 for /v1/messages)."
curl -s -o /dev/null -w "[ccr-launch] Test status /v1/messages (POST expect 200): %{http_code}\n" \
  -H "Authorization: Bearer ${APIKEY_LOCAL}" -H 'Content-Type: application/json' \
  -d '{"model":"provider-6/claude-sonnet-4-20250514-thinking","messages":[{"role":"user","content":"ping"}]}' \
  ${BASE_URL}/v1/messages || trueonvenience launcher for Claude Code Router + Claude Code pointed at A4F
# Requirements:
#   export A4F_KEY=ddc-a4f-... (your real key) before running OR put it in your shell profile.
# Optional overrides:
#   CCR_PORT (default 3456)

CCR_PORT="${CCR_PORT:-3456}"
BASE_URL="http://127.0.0.1:${CCR_PORT}"
APIKEY_LOCAL="dev-local-key"

if [[ -z "${A4F_KEY:-}" ]]; then
  echo "[ccr-launch] ERROR: A4F_KEY env var not set. Export A4F_KEY first." >&2
  exit 1
fi

if [[ "${A4F_KEY}" == "REPLACE_WITH_REAL_KEY" ]]; then
  echo "[ccr-launch] ERROR: A4F_KEY is still the placeholder. Set your real A4F key." >&2
  exit 1
fi

echo "[ccr-launch] Ensuring router running on ${BASE_URL}..."

# Check if port already listening
if ! lsof -iTCP:${CCR_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[ccr-launch] Starting router..."
  ccr start >/dev/null 2>&1 || true
  sleep 2
fi

if ! lsof -iTCP:${CCR_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[ccr-launch] Router did not bind to port ${CCR_PORT}. Check logs in ~/.claude-code-router/logs." >&2
  exit 1
fi

echo "[ccr-launch] Router is up. Testing health (expect 200 for /v1/messages)."
curl -s -o /dev/null -w "[ccr-launch] Test status /v1/messages (POST expect 200): %{http_code}\\n" \
  -H "Authorization: Bearer ${APIKEY_LOCAL}" -H 'Content-Type: application/json' \
  -d '{"model":"a4f,provider-6/claude-sonnet-4-20250514-thinking","messages":[{"role":"user","content":"ping"}]}' \
  "${BASE_URL}/v1/messages" || true

export ANTHROPIC_BASE_URL="${BASE_URL}"
export ANTHROPIC_API_KEY="${APIKEY_LOCAL}"

echo "[ccr-launch] Launching Claude Code..."
echo "[ccr-launch] If you previously saw a Raw mode error, use a real TTY (macOS Terminal/iTerm)."

# Try allocating a pseudo-TTY via 'script' if available and we are not already in a raw-capable TTY.
if [[ ! -t 0 || ! -t 1 ]]; then
  if command -v script >/dev/null 2>&1; then
    echo "[ccr-launch] Non-interactive shell detected; wrapping with 'script' to provide a TTY." >&2
    exec script -q /dev/null ccr code
  else
    echo "[ccr-launch] No TTY and 'script' unavailable. Falling back to one-shot prompt via curl." >&2
    curl -s -H "Authorization: Bearer ${APIKEY_LOCAL}" -H 'Content-Type: application/json' \
      -d '{"model":"a4f,provider-6/claude-sonnet-4-20250514-thinking","messages":[{"role":"user","content":"Hello"}]}' \
      "${BASE_URL}/v1/messages" | jq '.content[0].text' 2>/dev/null || true
    exit 0
  fi
else
  # We are in an interactive TTY.
  exec ccr code
fi
