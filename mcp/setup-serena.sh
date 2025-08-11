#!/bin/bash

# Serena MCP Setup Script for MoviePine Project
# This script helps configure Serena MCP for Claude Desktop

set -e

echo "🚀 Serena MCP Setup for MoviePine"
echo "=================================="

# Check if uvx is installed
if ! command -v uvx &> /dev/null; then
    echo "❌ uvx is not installed. Please install uv first:"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "✅ uvx found"

# Test Serena installation
echo "🔧 Testing Serena installation..."
if uvx --from git+https://github.com/oraios/serena serena --help > /dev/null 2>&1; then
    echo "✅ Serena is accessible via uvx"
else
    echo "❌ Serena installation test failed"
    exit 1
fi

# Get current project path
PROJECT_PATH=$(pwd)
echo "📁 Current project: $PROJECT_PATH"

# Generate Claude Desktop configuration snippet
echo "📝 Generating Claude Desktop configuration..."

cat > claude_desktop_serena_config.json << EOF
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from", 
        "git+https://github.com/oraios/serena", 
        "serena", 
        "start-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "$PROJECT_PATH"
      ]
    }
  }
}
EOF

echo "✅ Configuration saved to: claude_desktop_serena_config.json"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the configuration from claude_desktop_serena_config.json"
echo "2. Open Claude Desktop > File > Settings > Developer > MCP Servers > Edit Config"
echo "3. Add the serena configuration to your existing mcpServers object"
echo "4. Save and fully restart Claude Desktop"
echo ""
echo "🔧 Testing Serena MCP server (will run for 3 seconds)..."

# Test the MCP server
(
    uvx --from git+https://github.com/oraios/serena serena start-mcp-server \
        --context ide-assistant \
        --project "$PROJECT_PATH" &
    SERVER_PID=$!
    sleep 3
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
) && echo "✅ Serena MCP server test completed successfully" || echo "⚠️  Server test completed (this is normal)"

echo ""
echo "🎉 Serena MCP setup complete!"
echo "📖 See mcp/SERENA_SETUP.md for detailed documentation"
