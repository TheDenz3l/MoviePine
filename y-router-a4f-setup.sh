#!/usr/bin/env bash
# Y-Router setup script for A4F integration - Complete CCR Replacement

set -euo pipefail

# Your A4F API key
A4F_KEY="ddc-a4f-c7be883171b74a1e90920ac1368fb23d"

echo "🛑 Stopping Claude Code Router..."
# Kill CCR process if running
CCR_PID=$(ps aux | grep "claude-code-router" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$CCR_PID" ]; then
    echo "Stopping CCR process $CCR_PID..."
    kill $CCR_PID || true
    sleep 2
fi

echo "🔧 Setting up Y-Router with A4F to replace CCR..."

# Clone y-router
if [ ! -d "y-router" ]; then
    echo "📥 Cloning y-router..."
    git clone https://github.com/luohy15/y-router.git
    cd y-router
else
    echo "📁 Y-router already exists, updating..."
    cd y-router
    git pull
fi

# Create environment file for A4F
echo "📝 Creating A4F environment configuration..."
cat > .env << EOF
# A4F Configuration for Y-Router
OPENROUTER_BASE_URL=https://api.a4f.co/v1/chat/completions
A4F_KEY=${A4F_KEY}
EOF

# Create docker-compose override for A4F
echo "🐳 Creating Docker Compose configuration..."
cat > docker-compose.a4f.yml << EOF
version: '3.8'
services:
  y-router:
    build: .
    ports:
      - "3456:8787"  # Use same port as CCR for easy replacement
    environment:
      - OPENROUTER_BASE_URL=https://api.a4f.co/v1/chat/completions
      - A4F_KEY=${A4F_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker..."
    open -a Docker
    echo "⏳ Waiting for Docker to start..."
    while ! docker info > /dev/null 2>&1; do
        sleep 2
    done
fi

echo "🚀 Starting Y-Router with A4F configuration..."
docker-compose -f docker-compose.a4f.yml up -d --build

echo "⏳ Waiting for service to start..."
sleep 10

echo "🧪 Testing Y-Router with A4F..."
# Test with your A4F key
curl -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${A4F_KEY}" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello from Y-Router + A4F! Confirm you are working."}],
    "max_tokens": 100
  }' | jq .

echo ""
echo "✅ Y-Router setup complete! CCR has been replaced."
echo ""
echo "🔧 Setting up environment for Claude Code..."

# Update Claude environment
echo "📝 Creating Claude environment configuration..."
cat > ~/.claude_env << EOF
export ANTHROPIC_BASE_URL="http://localhost:3456"
export ANTHROPIC_API_KEY="${A4F_KEY}"
export ANTHROPIC_CUSTOM_HEADERS="x-api-key: \$ANTHROPIC_API_KEY"
EOF

# Make it executable
chmod +x ~/.claude_env

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "To use Claude Code with Y-Router:"
echo "1. Source the environment: source ~/.claude_env"
echo "2. Run Claude: claude"
echo ""
echo "Or manually set these environment variables:"
echo "export ANTHROPIC_BASE_URL=\"http://localhost:3456\""
echo "export ANTHROPIC_API_KEY=\"${A4F_KEY}\""
echo "export ANTHROPIC_CUSTOM_HEADERS=\"x-api-key: \$ANTHROPIC_API_KEY\""
echo ""
echo "🔍 To monitor Y-Router logs: docker-compose -f y-router/docker-compose.a4f.yml logs -f"
echo "🛑 To stop Y-Router: docker-compose -f y-router/docker-compose.a4f.yml down"

cd ..
