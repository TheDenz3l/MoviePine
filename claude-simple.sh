#!/bin/bash
# Simple Claude launcher with manual restart option

echo "🤖 Simple Claude Launcher"
echo "========================="

# Set environment variables
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_API_KEY=dev-local-key

echo "🚀 Starting Claude..."
echo "If it hangs, press Ctrl+C and run this script again."
echo ""

# Just run ccr code once
ccr code

echo ""
echo "Claude session ended."
