#!/bin/bash
# Ultimate Claude Code Fix
# Based on Ink documentation and GitHub issues research

echo "🔧 Ultimate Claude Code Fix"
echo "Checking raw mode support and applying all known fixes..."
echo "========================================================="

# Method 1: Check if stdin supports raw mode
if node -e "
try {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    console.log('RAW_MODE_SUPPORTED=true');
  } else {
    console.log('RAW_MODE_SUPPORTED=false');
  }
} catch (e) {
  console.log('RAW_MODE_SUPPORTED=false');
}
" | grep -q "RAW_MODE_SUPPORTED=true"; then
    echo "✅ Raw mode is supported - using normal mode"
    export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
    export ANTHROPIC_API_KEY=dev-local-key
    ccr code
else
    echo "❌ Raw mode not supported - using compatibility mode"
    export CI=true
    export FORCE_COLOR=0
    export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
    export ANTHROPIC_API_KEY=dev-local-key
    
    echo "🔄 Trying multiple fallback approaches..."
    
    # Try with script wrapper first
    if command -v script >/dev/null 2>&1; then
        echo "📜 Using script wrapper..."
        script -q /dev/null -c "ccr code"
    else
        echo "⚡ Using direct approach with environment fixes..."
        ccr code
    fi
fi
