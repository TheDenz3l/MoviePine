#!/usr/bin/env bash
# Installs the local claude helper script into your PATH via ~/.bashrc (and ~/.zshrc if present).
# Safe/idempotent: only appends export line if missing.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_LINE="export PATH=\"$PROJECT_ROOT/scripts:$PATH\""
BASHRC="$HOME/.bashrc"
ZSHRC="$HOME/.zshrc"
add_line() {
  local file="$1"
  if [ -f "$file" ] && grep -Fq "$PROJECT_ROOT/scripts" "$file"; then
    echo "Already present in $file"
    return
  fi
  echo "$TARGET_LINE" >> "$file"
  echo "Added to $file"
}
if [ ! -d "$PROJECT_ROOT/scripts" ]; then
  echo "Scripts directory missing" >&2; exit 1
fi
add_line "$BASHRC"
if [ -f "$ZSHRC" ]; then
  add_line "$ZSHRC"
fi
chmod +x "$PROJECT_ROOT/scripts/claude" || true
if [ -f "$PROJECT_ROOT/scripts/claudecode" ]; then chmod +x "$PROJECT_ROOT/scripts/claudecode"; fi
echo "Run: source $BASHRC (or reopen terminal). Then 'claude code' to start bridge."
