#!/bin/bash
# Non-interactive Claude wrapper that works reliably

echo "🤖 Non-Interactive Claude"
echo "Enter your question (press Ctrl+D when done):"
echo "----------------------------------------"

# Read multi-line input until EOF
input=$(cat)

if [ -n "$input" ]; then
    echo "🧠 Claude is thinking..."
    echo "----------------------------------------"
    ccr code "$input"
else
    echo "❌ No input provided"
fi
