#!/usr/bin/env bash
set -euo pipefail

# Claude Code Router Easy Setup
# Handles A4F key, router startup, and Claude Code launch

echo "🚀 Claude Code Router Easy Setup"
echo

# Check for A4F key
if [[ -z "${A4F_KEY:-}" ]]; then
  echo "❌ A4F_KEY not set. Please export your real A4F key:"
  echo "   export A4F_KEY=ddc-a4f-your-real-key-here"
  exit 1
fi

if [[ "${A4F_KEY}" == "REPLACE_WITH_REAL_KEY" ]] || [[ "${A4F_KEY}" == "ddc-a4f-..." ]]; then
  echo "❌ A4F_KEY is still a placeholder. Set your real key."
  exit 1
fi

echo "✅ A4F_KEY found"

# Start router
echo "🔄 Starting Claude Code Router..."
ccr restart >/dev/null 2>&1 || {
  echo "⚠️  ccr restart failed, trying ccr start..."
  ccr start >/dev/null 2>&1 &
  sleep 3
}

# Wait for router
echo "⏳ Waiting for router to be ready..."
for i in {1..10}; do
  if lsof -iTCP:3456 -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! lsof -iTCP:3456 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Router failed to start on port 3456"
  exit 1
fi

echo "✅ Router is running"

# Test the connection
echo "🧪 Testing connection..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Authorization: Bearer dev-local-key' \
  -H 'Content-Type: application/json' \
  -d '{"model":"provider-6/claude-sonnet-4-20250514-thinking","messages":[{"role":"user","content":"test"}]}' \
  http://127.0.0.1:3456/v1/messages)

if [[ "$STATUS" == "200" ]]; then
  echo "✅ Connection test passed (200)"
else
  echo "⚠️  Connection test returned $STATUS (check A4F_KEY is valid)"
fi

# Set environment for Claude Code
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_API_KEY=dev-local-key

echo "🎯 Environment configured:"
echo "   ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL"
echo "   ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
echo

# Launch Claude Code with proper TTY handling
if [[ "${1:-}" == "--no-launch" ]]; then
  echo "✅ Setup complete. Router ready at http://127.0.0.1:3456"
  echo "   Run 'ccr code' from a real terminal to start Claude Code"
  exit 0
fi

echo "🚀 Launching Claude Code..."

# Force script wrapper for VS Code or non-TTY environments
if [[ "${TERM_PROGRAM:-}" == "vscode" ]] || [[ ! -t 0 ]] || [[ ! -t 1 ]]; then
  echo "📟 Detected VS Code/non-TTY environment, using script wrapper..."
  if command -v script >/dev/null 2>&1; then
    exec script -q /dev/null ccr code
  else
    echo "❌ 'script' command not available. Run from macOS Terminal/iTerm instead."
    exit 1
  fi
else
  echo "💻 Launching in interactive mode..."
  exec ccr code
fi
