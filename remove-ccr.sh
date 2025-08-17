#!/usr/bin/env bash
# Complete Claude Code Router removal script

set -euo pipefail

echo "🛑 Removing Claude Code Router completely..."

# Stop CCR process
echo "Stopping CCR processes..."
pkill -f "claude-code-router" || true
sleep 2

# Remove CCR npm package
echo "Uninstalling CCR npm package..."
npm uninstall -g @musistudio/claude-code-router || true

# Remove CCR configuration directory
echo "Removing CCR configuration..."
if [ -d ~/.claude-code-router ]; then
    rm -rf ~/.claude-code-router
    echo "✅ Removed ~/.claude-code-router"
fi

# Remove any CCR-related environment variables from shell profiles
echo "Cleaning up shell profiles..."
for profile in ~/.bashrc ~/.zshrc ~/.bash_profile ~/.zprofile; do
    if [ -f "$profile" ]; then
        # Remove CCR-related exports
        sed -i.bak '/CLAUDE_CODE_ROUTER/d' "$profile" 2>/dev/null || true
        sed -i.bak '/claude-code-router/d' "$profile" 2>/dev/null || true
        echo "Cleaned $profile"
    fi
done

# Remove CCR launch scripts
echo "Removing CCR launch scripts..."
for script in ccr-launch.sh claude-*.sh; do
    if [ -f "$script" ]; then
        echo "Removing $script"
        rm "$script"
    fi
done

echo ""
echo "✅ Claude Code Router completely removed!"
echo ""
echo "Next steps:"
echo "1. Run: ./y-router-a4f-setup.sh"
echo "2. Restart your terminal or source ~/.claude_env"
echo "3. Test with: claude"
