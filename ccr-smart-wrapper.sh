#!/bin/bash
# CCR Smart Wrapper - Permanent Fix
# This replaces the ccr command with an intelligent version

# Store the original ccr path
ORIGINAL_CCR="/usr/local/bin/ccr"

ccr_smart() {
    # If not using 'code' subcommand, use original ccr
    if [[ "$1" != "code" ]]; then
        "$ORIGINAL_CCR" "$@"
        return
    fi
    
    echo "🔧 CCR Smart Wrapper - Fixing raw mode issues..."
    
    # Check if stdin supports raw mode
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
    " 2>/dev/null | grep -q "RAW_MODE_SUPPORTED=true"; then
        echo "✅ Raw mode supported - using enhanced mode"
        export CI=true
        export FORCE_COLOR=0
        export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
        export ANTHROPIC_API_KEY=dev-local-key
        "$ORIGINAL_CCR" code
    else
        echo "⚡ Raw mode limited - using compatibility mode"
        export CI=true
        export FORCE_COLOR=0
        export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
        export ANTHROPIC_API_KEY=dev-local-key
        
        # Try with script wrapper first
        if command -v script >/dev/null 2>&1; then
            echo "📜 Using script wrapper..."
            script -q /dev/null -c "$ORIGINAL_CCR code"
        else
            echo "🔄 Using direct approach..."
            "$ORIGINAL_CCR" code
        fi
    fi
}
