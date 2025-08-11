#!/bin/bash

# Serena Analysis-Only Mode Setup
# Configures Serena to handle analysis and planning while GitHub Copilot handles code writing

echo "🔧 Configuring Serena for Analysis-Only Mode"
echo "============================================"

# Restart any existing Serena servers
echo "🔄 Restarting Serena MCP server with new configuration..."

# Check if VS Code is running and suggest restart
if pgrep -f "Visual Studio Code" > /dev/null; then
    echo "📝 VS Code is running. Please restart VS Code to apply new configuration."
    echo "   1. Save your work"
    echo "   2. Quit VS Code completely (Cmd+Q)"
    echo "   3. Restart VS Code"
    echo ""
fi

echo "✅ Configuration updated for analysis-only mode!"
echo ""
echo "📋 New Workflow:"
echo "  1️⃣  Analysis & Planning (Use Serena):"
echo "     • 'Use Serena to analyze the project structure'"
echo "     • 'With Serena, find all React components'"
echo "     • 'Serena, show me the data flow in this feature'"
echo ""
echo "  2️⃣  Code Implementation (Use GitHub Copilot):"
echo "     • 'Generate a React component for...'"
echo "     • 'Implement the function to...'"
echo "     • 'Create TypeScript interfaces for...'"
echo ""
echo "🎯 Serena's Role: Analysis, Exploration, Planning"
echo "🎯 Copilot's Role: Code Generation, Implementation"
echo ""
echo "📖 See mcp/ANALYSIS_ONLY_CONFIG.md for detailed guide"
