#!/bin/bash
# Claude Code with Raw Mode Fix
# Based on GitHub PR #444 solution and issues research

echo "🤖 Claude Code (Raw Mode Fixed)"
echo "Using multiple fixes from GitHub issues"
echo "======================================="

# Set environment variables that fix raw mode issues
export CI=true
export FORCE_COLOR=0
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_API_KEY=dev-local-key

# Additional fix: Force non-interactive mode for stdin
export TERM=dumb

# Alternative approach: Use expect or script to handle TTY issues
if command -v script >/dev/null 2>&1; then
    echo "Using script wrapper to fix TTY issues..."
    script -q /dev/null -c "ccr code"
else
    echo "Using direct approach with environment fixes..."
    ccr code
fi
