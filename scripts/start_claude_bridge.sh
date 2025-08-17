#!/usr/bin/env bash
# Unified launcher: starts LiteLLM A4F bridge and then opens VS Code so Claude Code uses it.
# Idempotent: restarts existing bridge if running.

set -euo pipefail
cd "$(dirname "$0")/.."

# Load .env.local if present (non-exported lines ignored)
if [ -f .env.local ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.local | grep -E '^(A4F_|ANTHROPIC_)' | xargs || true)
fi

: "${A4F_API_KEY:?A4F_API_KEY missing in environment or .env.local}" || exit 1
export ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-http://127.0.0.1:8001}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-local-any}"
export A4F_BASE_URL="${A4F_BASE_URL:-https://api.a4f.co/v1}"    
export A4F_RPM="${A4F_RPM:-15}"

BRIDGE_LOG=.bridge.out.log
BRIDGE_PID=.bridge.pid

start_bridge() {
  if [ -f "$BRIDGE_PID" ] && kill -0 "$(cat $BRIDGE_PID)" 2>/dev/null; then
    echo "Bridge already running (PID $(cat $BRIDGE_PID))"
    return
  fi
  echo "Starting bridge on $ANTHROPIC_BASE_URL ..."
    PORT_NUMBER="${ANTHROPIC_BASE_URL##*:}"
    # If URL includes path (/v1) strip it for port calc
    PORT_NUMBER="${PORT_NUMBER%%/*}"
    [ -n "$PORT_NUMBER" ] || PORT_NUMBER=8001
    ( source .venv/bin/activate && \
      uvicorn ai.anthropic_litellm_bridge:app --host 127.0.0.1 --port "$PORT_NUMBER" --log-level info \
        > "$BRIDGE_LOG" 2>&1 & echo $! > "$BRIDGE_PID" )
  sleep 1
  if kill -0 "$(cat $BRIDGE_PID)" 2>/dev/null; then
    echo "Bridge started PID $(cat $BRIDGE_PID). Logs: tail -f $BRIDGE_LOG"
  else
    echo "Bridge failed to start. See $BRIDGE_LOG" >&2
    exit 1
  fi
}

stop_bridge() {
  if [ -f "$BRIDGE_PID" ] && kill -0 "$(cat $BRIDGE_PID)" 2>/dev/null; then
    kill "$(cat $BRIDGE_PID)" || true
    rm -f "$BRIDGE_PID"
    echo "Bridge stopped"
  else
    echo "Bridge not running"
  fi
}

case "${1:-up}" in
  up|start)
    start_bridge
    ;;
  down|stop)
    stop_bridge
    exit 0
    ;;
  restart)
    stop_bridge || true
    start_bridge
    ;;
  status)
    if [ -f "$BRIDGE_PID" ] && kill -0 "$(cat $BRIDGE_PID)" 2>/dev/null; then
      echo "Bridge running (PID $(cat $BRIDGE_PID))"
    else
      echo "Bridge not running"
    fi
    exit 0
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
 esac

# Launch VS Code in same env so extension inherits vars
if command -v code >/dev/null 2>&1; then
  echo "Launching VS Code so Claude Code picks up env..."
  code . >/dev/null 2>&1 &
fi

echo "Ready. Example curl:"
cat <<EOF
curl -s -X POST $ANTHROPIC_BASE_URL/v1/messages \\
  -H 'Authorization: Bearer $ANTHROPIC_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"model":"claude-sonnet-4-thinking","messages":[{"role":"user","content":[{"type":"text","text":"hi"}]}],"max_tokens":64}'
EOF
