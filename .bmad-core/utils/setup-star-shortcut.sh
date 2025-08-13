#!/bin/bash

# BMad "*" Shortcut Setup
# This creates a global "*" command for BMad routing

echo "🚀 Setting up BMad '*' shortcut..."

# Get the current directory
BMAD_UTILS_DIR="$(pwd)"

# Create the global star command
STAR_SCRIPT="$BMAD_UTILS_DIR/star"

# Check if we can create a symlink in /usr/local/bin
if [ -w "/usr/local/bin" ]; then
    echo "📁 Creating symlink in /usr/local/bin..."
    ln -sf "$STAR_SCRIPT" "/usr/local/bin/*"
    echo "✅ Global '*' command created!"
    echo ""
    echo "Usage: * \"your task description\""
    echo "Example: * \"fix the search overlay\""
elif [ -w "$HOME/bin" ] || mkdir -p "$HOME/bin" 2>/dev/null; then
    echo "📁 Creating symlink in ~/bin..."
    ln -sf "$STAR_SCRIPT" "$HOME/bin/*"
    echo "✅ Global '*' command created in ~/bin!"
    echo ""
    echo "⚠️  Make sure ~/bin is in your PATH:"
    echo "   export PATH=\"\$HOME/bin:\$PATH\""
    echo ""
    echo "Usage: * \"your task description\""
    echo "Example: * \"fix the search overlay\""
else
    echo "❌ Cannot create global command. Using local version:"
    echo ""
    echo "Usage from this directory:"
    echo "  ./star \"your task description\""
    echo ""
    echo "Or add an alias to your shell config:"
    echo "  alias '*'='$STAR_SCRIPT'"
fi

echo ""
echo "🧪 Testing the setup..."
echo ""

# Test the command
if command -v "*" &> /dev/null; then
    echo "🎉 Testing global '*' command:"
    "*" "fix the search overlay"
else
    echo "🧪 Testing local command:"
    "$STAR_SCRIPT" "fix the search overlay"
fi
