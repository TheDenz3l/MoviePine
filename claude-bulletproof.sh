#!/bin/bash
# Bulletproof Claude Launcher
# Complete replacement for problematic 'ccr code' command

echo "🛡️  Starting Bulletproof Claude..."
echo "📍 Bypassing ccr code interactive mode completely"

# Check if CCR is running
if ! curl -s http://127.0.0.1:3456/health > /dev/null 2>&1; then
    echo "❌ CCR is not running. Starting it now..."
    echo "🚀 Running: ccr start"
    ccr start &
    sleep 3
    echo "⏳ Waiting for CCR to initialize..."
    sleep 2
    
    # Check again
    if ! curl -s http://127.0.0.1:3456/health > /dev/null 2>&1; then
        echo "❌ Failed to start CCR. Please run 'ccr start' manually."
        exit 1
    fi
fi

echo "✅ CCR is running"
echo "🚀 Launching bulletproof interface..."
echo ""

# Launch the bulletproof interface
node /Users/bmar/Documents/movieplayer/bulletproof-claude.js
