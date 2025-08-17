#!/usr/bin/env bash
# Y-Router Local Proxy Setup - Complete CCR Replacement

set -euo pipefail

A4F_KEY="ddc-a4f-c7be883171b74a1e90920ac1368fb23d"

echo "🛑 Stopping Claude Code Router..."
# Kill CCR process if running
CCR_PID=$(ps aux | grep "claude-code-router" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$CCR_PID" ]; then
    echo "Stopping CCR process $CCR_PID..."
    kill $CCR_PID || true
    sleep 2
    echo "✅ CCR stopped"
else
    echo "CCR not running"
fi

echo ""
echo "🚀 Starting Y-Router Local Proxy..."

# Start the local proxy in background
node y-router-local.js &
PROXY_PID=$!

echo "📍 Y-Router Local Proxy started with PID: $PROXY_PID"
echo "⏳ Waiting for service to start..."
sleep 3

# Test the proxy
echo ""
echo "🧪 Testing Y-Router Local Proxy..."
curl -s -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "provider-6/claude-opus-4-20250514",
    "messages": [{"role": "user", "content": "Hello from Y-Router Local Proxy! Confirm you are working."}],
    "max_tokens": 100
  }' | jq . || echo "Test request failed - check logs"

echo ""
echo "📝 Setting up environment for Claude Code..."

# Create Claude environment file
cat > ~/.claude_env << EOF
# Y-Router Local Proxy Environment
export ANTHROPIC_BASE_URL="http://localhost:3456"
export ANTHROPIC_API_KEY="${A4F_KEY}"
export ANTHROPIC_MODEL="provider-6/claude-sonnet-4-20250514-thinking"
export ANTHROPIC_SMALL_FAST_MODEL="provider-6/claude-sonnet-4-20250514-thinking"
export ANTHROPIC_LARGE_MODEL="provider-6/claude-opus-4-20250514"
EOF

chmod +x ~/.claude_env

# Save PID for later management
echo $PROXY_PID > .y-router-proxy.pid

echo ""
echo "✅ Y-Router Local Proxy setup complete!"
echo ""
echo "🎉 CCR has been completely replaced!"
echo ""
echo "🔧 To use Claude Code:"
echo "1. Source environment: source ~/.claude_env"
echo "2. Run Claude: claude"
echo ""
echo "📊 Management commands:"
echo "🟢 Check status: curl http://localhost:3456/health"
echo "📋 View logs: ps aux | grep y-router-local"
echo "🛑 Stop proxy: kill \$(cat .y-router-proxy.pid)"
echo "🔄 Restart: ./y-router-simple-setup.sh"
echo ""
echo "🎯 Proxy is running on port 3456 (same as CCR)"
echo "🔗 Provider: A4F API"
echo "💾 PID saved to: .y-router-proxy.pid"
