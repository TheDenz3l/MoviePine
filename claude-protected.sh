#!/bin/bash
# Interactive Claude with timeout protection

echo "🤖 Protected Interactive Claude"
echo "This will restart if it hangs."
echo "==============================="

# Set environment variables
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_API_KEY=dev-local-key

while true; do
    echo "Starting Claude session..."
    
    # Run ccr code and handle exit codes properly
    ccr code
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "Session ended normally. Press Enter to restart or Ctrl+C to exit."
        read -r
    else
        echo ""
        echo "⚠️  Session ended unexpectedly (exit code: $exit_code). Restarting in 2 seconds..."
        sleep 2
    fi
done
