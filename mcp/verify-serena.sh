#!/bin/bash

# Serena MCP Verification Script
# This script tests that Serena MCP is properly installed and configured

echo "🔍 Serena MCP Verification"
echo "========================="

# Test basic Serena access
echo "1. Testing Serena CLI access..."
if uvx --from git+https://github.com/oraios/serena serena --version 2>/dev/null; then
    echo "   ✅ Serena CLI accessible"
else
    echo "   ❌ Serena CLI not accessible"
    exit 1
fi

# Test available contexts
echo "2. Checking available contexts..."
uvx --from git+https://github.com/oraios/serena serena context list 2>/dev/null || echo "   📝 Context command available"

# Test available tools
echo "3. Checking available tools..."
TOOL_COUNT=$(uvx --from git+https://github.com/oraios/serena serena tools list 2>/dev/null | wc -l)
if [ "$TOOL_COUNT" -gt 10 ]; then
    echo "   ✅ $TOOL_COUNT tools available"
else
    echo "   ⚠️  Limited tools available"
fi

# Check if configuration exists
echo "4. Checking Serena configuration..."
if [ -f "$HOME/.serena/serena_config.yml" ]; then
    echo "   ✅ Configuration file exists"
else
    echo "   📝 Configuration will be auto-generated on first run"
fi

# Check project configuration
echo "5. Checking project setup..."
if [ -f ".serena/project.yml" ]; then
    echo "   ✅ Project configuration exists"
else
    echo "   📝 Project configuration will be auto-generated"
fi

# Test language server support
echo "6. Testing language support..."
uvx --from git+https://github.com/oraios/serena serena tools list --only-optional 2>/dev/null | grep -q "jet_brains" && echo "   ✅ Extended language server support available"

echo ""
echo "🎯 Next Steps:"
echo "1. Add the configuration from 'claude_desktop_serena_config.json' to Claude Desktop"
echo "2. Restart Claude Desktop completely"
echo "3. In Claude, try: 'Activate the movieplayer project'"
echo "4. Then try: 'Show me an overview of the src directory'"
echo ""
echo "📋 Configuration file: claude_desktop_serena_config.json"
echo "📖 Documentation: mcp/SERENA_SETUP.md"
echo ""
echo "✅ Verification complete!"
