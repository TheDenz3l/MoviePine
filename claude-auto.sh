#!/usr/bin/env bash
# Auto-accept Claude Code custom API key prompt

export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_API_KEY=dev-local-key

# Try using expect to automatically answer the prompt
if command -v expect >/dev/null 2>&1; then
  expect -c "
    spawn claude
    expect \"Do you want to use this API key?\"
    send \"1\r\"
    expect \"Enter to confirm\"
    send \"\r\"
    interact
  "
else
  echo "expect not installed. Trying alternative..."
  
  # Alternative: pipe the response
  echo -e "1\n" | claude 2>/dev/null || {
    echo "❌ Interactive mode failed. Use non-interactive mode instead:"
    echo "   claude --print 'Your question here'"
    echo "   or install expect: brew install expect"
  }
fi
