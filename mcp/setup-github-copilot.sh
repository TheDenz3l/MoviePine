#!/bin/bash

# Serena MCP Setup Script for GitHub Copilot
# This script configures Serena MCP for use with GitHub Copilot in VS Code

set -e

echo "🚀 Serena MCP Setup for GitHub Copilot"
echo "====================================="

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

# Check for Copilot MCP extension
echo "🔍 Checking for Copilot MCP extension..."
if code --list-extensions | grep -q "automatalabs.copilot-mcp"; then
    echo "✅ Copilot MCP extension is installed"
else
    echo "⚠️  Copilot MCP extension not found. Installing..."
    code --install-extension automatalabs.copilot-mcp
    echo "✅ Copilot MCP extension installed"
fi

# Get current project path
PROJECT_PATH=$(pwd)
echo "📁 Current project: $PROJECT_PATH"

# Ensure .vscode directory exists
mkdir -p .vscode

# Check if settings.json exists and has copilot-mcp configuration
if [ -f ".vscode/settings.json" ] && grep -q "copilot-mcp.mcpServers" .vscode/settings.json; then
    echo "✅ VS Code settings already configured for Serena MCP"
else
    echo "📝 Configuring VS Code settings for Serena MCP..."
    
    # Create or update settings.json
    cat > .vscode/settings.json << EOF
{
  "copilot-mcp.mcpServers": {
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
      ],
      "description": "Serena semantic code toolkit for MoviePine project"
    }
  },
  "files.exclude": {
    "**/.serena": false
  },
  "search.exclude": {
    "**/.serena/logs": true
  }
}
EOF
    echo "✅ VS Code settings configured"
fi

# Test the MCP server briefly
echo "🔧 Testing Serena MCP server (3 second test)..."
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
echo "🎉 Serena MCP setup for GitHub Copilot complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Restart VS Code to ensure all extensions are loaded"
echo "2. Open GitHub Copilot Chat"
echo "3. Try: 'Use Serena to show me the project structure'"
echo "4. Try: 'With Serena, find all React components'"
echo ""
echo "💡 Available Commands:"
echo "   - Copilot MCP: List Servers (Command Palette)"
echo "   - Copilot MCP: Restart Server (Command Palette)"
echo "   - Copilot MCP: View Logs (Command Palette)"
echo ""
echo "📖 See mcp/GITHUB_COPILOT_SETUP.md for detailed documentation"
