#!/usr/bin/env bash
# Helper to guarantee Claude Code uses new LiteLLM A4F bridge (replaces legacy y-router)
# Usage:
#   ./use-claude-proxy.sh /status
#   ./use-claude-proxy.sh --print "hello"
#   (Anything after the script name is passed to `claude`)

set -euo pipefail

# Load user env file if present
[ -f "$HOME/.claude_env" ] && source "$HOME/.claude_env"

# Hard‑set required vars (override if missing)
export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-http://127.0.0.1:8001}"
export ANTHROPIC_API_URL="$ANTHROPIC_BASE_URL"
# Provide a placeholder Anthropic-style key if user hasn't set one; real auth is via A4F_API_KEY inside bridge
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-local-any}"
# Some clients read this
export ANTHROPIC_VERSION="2023-06-01"

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' CLI not found in PATH" >&2
  exit 1
fi

echo "[bridge-wrapper] Using ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL"
echo "[bridge-wrapper] Using ANTHROPIC_API_URL=$ANTHROPIC_API_URL"
echo "[bridge-wrapper] Model vars: SMALL=$ANTHROPIC_MODEL LARGE=$ANTHROPIC_LARGE_MODEL" >&2

if [[ "$1" == "--debug-print" ]]; then
  shift
  CLAUDE_DEBUG=1 claude "$@"
else
  echo "[bridge-wrapper] Running: claude $*" >&2
  exec claude "$@"
fi
