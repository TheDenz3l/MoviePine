# Anthropic LiteLLM Bridge (A4F)

Replaces the legacy `y-router-local.js` Node proxy with a pure-Python FastAPI + LiteLLM bridge that presents minimal Anthropic-compatible endpoints to Claude Code while routing to A4F's OpenAI-compatible API.

## Features
- `/v1/messages` Anthropic-style input -> OpenAI chat -> Anthropic-style output
- Models: `claude-sonnet-4-thinking`, `claude-opus-latest` (map to A4F providers)
- Simple RPM limiter (default 15/min) matching A4F constraint
- `/v1/models`, `/v1/me`, `/health` endpoints

## Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r ai/requirements-litellm.txt
```

## Run
```bash
export A4F_API_KEY="YOUR_A4F_KEY"
export A4F_BASE_URL="https://api.a4f.co/v1"           # override if A4F provides a different base
export ANTHROPIC_BASE_URL="http://127.0.0.1:8001"  # for Claude Code
export ANTHROPIC_API_KEY="local-any"               # optional gate (set in Claude env too)
export A4F_RPM=15
python -m uvicorn ai.anthropic_litellm_bridge:app --host 127.0.0.1 --port 8001
```

## Authentication Modes

Environment variables influencing key validation:

- `ANTHROPIC_API_KEY` single expected key (legacy; simplest)
- `ANTHROPIC_API_KEYS` comma-separated allowlist of multiple keys (rotations, per-user keys). Example:
  `export ANTHROPIC_API_KEYS="local-any,dev-key-2,staging-rotate-2025Q3"`
- `BRIDGE_DISABLE_KEY_CHECK=1` disables auth (local emergency / debugging only)

Client may send key either as:
- `Authorization: Bearer <key>` (Claude Code default)
- `x-api-key: <key>` header (alternative for simple scripts)

## Claude Code Environment
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:8001"
export ANTHROPIC_API_KEY="local-any"
```

## Test
```bash
curl -s -X POST "$ANTHROPIC_BASE_URL/v1/messages" \
  -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-sonnet-4-thinking",
    "messages": [{"role":"user","content":[{"type":"text","text":"Hello bridge"}]}],
    "max_tokens": 512
  }' | jq .
```

## Notes
- Streaming currently returns only a final aggregated response.
- Adjust `MODEL_MAP` inside `ai/anthropic_litellm_bridge.py` if A4F model identifiers differ.
- For true incremental streaming, extend the code to pass `stream=True` to `litellm.acompletion` and translate deltas into SSE.

## Deprecation
Legacy y-router files have been removed from the repository to prevent interference; rollback would require restoring them from version control history if ever needed.
