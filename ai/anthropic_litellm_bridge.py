"""Anthropic-compatible API Bridge using LiteLLM + A4F

Replaces the Node y-router. Exposes a minimal subset of Anthropic API endpoints
needed by Claude Code while routing requests through LiteLLM to A4F's
OpenAI-compatible /chat/completions.

Endpoints:
    POST /v1/messages   -> Anthropic style request -> OpenAI chat -> Anthropic style response
    GET  /v1/models     -> Lists available mapped models
    GET  /v1/me         -> Simple key validation stub
    GET  /health        -> Health check

Environment Variables:
    A4F_API_KEY             (required)  - Your A4F key
    ANTHROPIC_API_KEY       (optional)  - Key Claude Code will send; we accept any if unset
    PORT                    (default 8001)
    A4F_RPM                 (default 15) - Max requests per minute across all models
    LOG_LEVEL               (info|debug)

Claude Code Setup:
    export ANTHROPIC_BASE_URL="http://127.0.0.1:8001"
    export ANTHROPIC_API_KEY="local-any"

Run:
    uvicorn ai.anthropic_litellm_bridge:app --host 127.0.0.1 --port 8001

Notes:
    - Streaming: Supports SSE when request body.stream=true.
    - Non-streaming: buffers OpenAI response.
"""
import os
import time
import uuid
import asyncio
from typing import Any, Dict, List, Optional, Callable, Awaitable  # extended types

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import litellm
from dotenv import load_dotenv  # added import
import hmac  # added for timing-safe compare
import json, datetime  # structured logging imports
# Order: .env.local overrides .env if both present.
load_dotenv(".env")
load_dotenv(".env.local", override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

A4F_API_KEY = os.getenv("A4F_API_KEY")
if not A4F_API_KEY:
    raise RuntimeError("A4F_API_KEY environment variable is required")

ANTHROPIC_API_KEY_EXPECTED = os.getenv("ANTHROPIC_API_KEY")  # optional gate
# Multi-key support: comma-separated list in ANTHROPIC_API_KEYS
_multi_keys_raw = os.getenv("ANTHROPIC_API_KEYS")
ANTHROPIC_API_KEYS = [k.strip() for k in _multi_keys_raw.split(",") if k.strip()] if _multi_keys_raw else []
DISABLE_KEY_CHECK = os.getenv("BRIDGE_DISABLE_KEY_CHECK") == "1"
PORT = int(os.getenv("PORT", "8001"))
RPM_LIMIT = int(os.getenv("A4F_RPM", "15"))  # requests per minute
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").lower()

# Allow overriding the A4F base URL (should point to the OpenAI-compatible root, *not* the /chat/completions leaf)
A4F_BASE_URL = os.getenv("A4F_BASE_URL", "https://api.a4f.co/v1")

# Underlying A4F model identifiers (OpenAI-style) -> exposed Anthropic names
# Adjust underlying model names to match A4F's catalog.
MODEL_MAP = {
    # exposed_name: underlying_a4f_model
    "claude-sonnet-4-thinking": "provider-6/claude-sonnet-4-20250514-thinking",
    "claude-opus-latest": "provider-6/claude-opus-20250514",  # placeholder; adjust if different
}

DEFAULT_MAX_TOKENS = 4096

# ---------------------------------------------------------------------------
# Rate Limiter (simple token bucket by request count)
# ---------------------------------------------------------------------------

class RateLimiter:
    def __init__(self, rpm: int):
        self.rpm = rpm
        self._events: List[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            window_start = now - 60
            # prune
            self._events = [t for t in self._events if t >= window_start]
            if len(self._events) >= self.rpm:
                retry_after = 60 - (now - self._events[0])
                raise HTTPException(status_code=429, detail={
                    "error": {
                        "type": "rate_limit_error",
                        "message": f"RPM limit {self.rpm} reached; retry after {retry_after:.1f}s"
                    }
                })
            self._events.append(now)

rate_limiter = RateLimiter(RPM_LIMIT)

# ---------------------------------------------------------------------------
# Request / Response Models (partial Anthropic schema subset)
# ---------------------------------------------------------------------------

class AnthropicContentItem(BaseModel):
    type: str = Field("text", literal=True)
    text: str

class AnthropicMessage(BaseModel):
    role: str  # user|assistant|system
    content: List[AnthropicContentItem]

class MessagesRequest(BaseModel):
    model: str
    messages: List[AnthropicMessage]
    max_tokens: Optional[int] = None
    system: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    stream: Optional[bool] = False
    class Config:
        extra = "allow"

class Usage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

class AnthropicResponse(BaseModel):
    id: str
    type: str = "message"
    role: str = "assistant"
    model: str
    content: List[AnthropicContentItem]
    stop_reason: Optional[str] = None
    stop_sequence: Optional[str] = None
    usage: Usage

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log_debug(*args):
    if LOG_LEVEL == "debug":
        print("[debug]", *args)

def anthropic_to_openai_messages(req: MessagesRequest) -> List[Dict[str, str]]:
    openai_msgs: List[Dict[str, str]] = []
    if req.system:
        openai_msgs.append({"role": "system", "content": req.system})
    for m in req.messages:
        text = "\n".join(ci.text for ci in m.content if ci.type == "text")
        openai_msgs.append({"role": m.role, "content": text})
    return openai_msgs

def map_finish_reason(fr: Optional[str]) -> Optional[str]:
    if fr == "stop":
        return "end_turn"
    return fr

def openai_to_anthropic_response(data: Dict[str, Any], model_exposed: str) -> AnthropicResponse:
    choices = data.get("choices", [])
    message_text = ""
    finish_reason = None
    if choices:
        choice = choices[0]
        msg = choice.get("message") or {}
        message_text = msg.get("content", "")
        finish_reason = choice.get("finish_reason")
    usage_raw = data.get("usage", {})
    usage = Usage(
        input_tokens=usage_raw.get("prompt_tokens", 0),
        output_tokens=usage_raw.get("completion_tokens", 0),
        total_tokens=usage_raw.get("total_tokens", 0),
    )
    return AnthropicResponse(
        id=data.get("id", f"msg_{uuid.uuid4().hex[:8]}"),
        model=model_exposed,
        content=[AnthropicContentItem(text=message_text)],
        stop_reason=map_finish_reason(finish_reason),
        usage=usage,
    )

app = FastAPI(title="Anthropic LiteLLM Bridge", version="0.1.0")

# Add exception handler for request parsing errors
@app.exception_handler(422)
async def validation_exception_handler(request: Request, exc):
    raw_body = await request.body()
    log_debug("Request validation failed", {
        "error": str(exc),
        "raw_body": raw_body.decode()[:500] if raw_body else "empty",
        "headers": dict(request.headers)
    })
    return JSONResponse(
        status_code=400,
        content={"error": {"type": "invalid_request_error", "message": "Request validation failed"}}
    )

@app.middleware("http")
async def request_context_mw(request: Request, call_next: Callable[[Request], Awaitable[Any]]):
    rid = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = rid
    start = time.time()
    try:
        response = await call_next(request)
        status = getattr(response, "status_code", 200)
    except Exception as e:
        status = getattr(e, "status_code", 500)
        raise
    finally:
        duration_ms = int((time.time() - start) * 1000)
        print(json.dumps({
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "event": "access",
            "rid": rid,
            "method": request.method,
            "path": request.url.path,
            "status": status,
            "dur_ms": duration_ms,
        }))
    if hasattr(response, "headers"):
        response.headers["x-request-id"] = rid
    return response

@app.get("/health")
async def health():
    return {"status": "ok", "rpm_limit": RPM_LIMIT, "models": list(MODEL_MAP.keys())}

@app.get("/v1/models")
async def list_models():
    data = [{"id": name, "object": "model"} for name in MODEL_MAP.keys()]
    return {"object": "list", "data": data}

@app.get("/v1/me")
async def me():
    return {
        "id": "user-bridge",
        "email": "bridge@local",
        "type": "user_api_key",
        "display_name": "LiteLLM Bridge User"
    }

def _extract_client_key(request: Request) -> str:
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(None, 1)[1].strip()
    x_key = request.headers.get("x-api-key")
    if x_key:
        return x_key.strip()
    return auth.strip()

def validate_key(request: Request):
    if DISABLE_KEY_CHECK:
        return
    if not (ANTHROPIC_API_KEYS or ANTHROPIC_API_KEY_EXPECTED):
        return
    provided = _extract_client_key(request)
    if not provided:
        raise HTTPException(status_code=401, detail={"error": {"type": "authentication_error", "message": "Missing API key"}})
    if ANTHROPIC_API_KEYS:
        for allowed in ANTHROPIC_API_KEYS:
            if hmac.compare_digest(provided, allowed):
                return
        log_debug("API key rejected", {"provided_prefix": provided[:6], "mode": "multi", "count": len(ANTHROPIC_API_KEYS)})
        raise HTTPException(status_code=401, detail={"error": {"type": "authentication_error", "message": "Invalid API key"}})
    if ANTHROPIC_API_KEY_EXPECTED and hmac.compare_digest(provided, ANTHROPIC_API_KEY_EXPECTED):
        return
    log_debug("API key mismatch", {"provided_prefix": provided[:6], "expected_prefix": (ANTHROPIC_API_KEY_EXPECTED[:6] if ANTHROPIC_API_KEY_EXPECTED else None)})
    raise HTTPException(status_code=401, detail={"error": {"type": "authentication_error", "message": "Invalid API key"}})

async def call_openai_via_litellm(model_underlying: str, oai_messages: List[Dict[str, str]], req: MessagesRequest) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "model": model_underlying,
        "messages": oai_messages,
        "max_tokens": req.max_tokens or DEFAULT_MAX_TOKENS,
        # A4F is OpenAI-compatible; use api_base/api_key directly. LiteLLM will append /chat/completions.
        "api_base": A4F_BASE_URL.rstrip("/"),
        "api_key": A4F_API_KEY,
        # Force OpenAI adapter path if needed (litellm infers, but we can be explicit)
        "custom_llm_provider": "openai",
    }
    if req.temperature is not None:
        params["temperature"] = req.temperature
    if req.top_p is not None:
        params["top_p"] = req.top_p
    params["stream"] = False
    log_debug("Dispatching to A4F via LiteLLM", {
        k: (v if k != "messages" else f"{len(v)} messages")
        for k, v in params.items() if k != "api_key"
    })
    response = await litellm.acompletion(**params)
    return response

@app.post("/v1/messages")
async def messages_endpoint(request: Request, body: MessagesRequest):
    # Debug: log incoming request details
    log_debug("Incoming /v1/messages request", {
        "model": body.model,
        "messages_count": len(body.messages),
        "stream": body.stream,
        "max_tokens": body.max_tokens,
        "headers": dict(request.headers)
    })
    validate_key(request)
    await rate_limiter.acquire()
    model_exposed = body.model
    if model_exposed not in MODEL_MAP:
        raise HTTPException(status_code=400, detail={"error": {"type": "invalid_request_error", "message": f"Unknown model '{model_exposed}'"}})
    underlying = MODEL_MAP[model_exposed]
    oai_messages = anthropic_to_openai_messages(body)

    # Streaming path
    if body.stream:
        async def event_generator():
            # Use litellm streaming; yield SSE events Anthropic style
            stream_params = {
                "model": underlying,
                "messages": oai_messages,
                "api_base": A4F_BASE_URL.rstrip("/"),
                "api_key": A4F_API_KEY,
                "custom_llm_provider": "openai",
                "stream": True,
                "max_tokens": body.max_tokens or DEFAULT_MAX_TOKENS,
            }
            if body.temperature is not None:
                stream_params["temperature"] = body.temperature
            if body.top_p is not None:
                stream_params["top_p"] = body.top_p
            request_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:8]}")
            full_text = []
            usage_final: Dict[str, Any] = {}
            async for chunk in litellm.astream_completion(**stream_params):
                # chunk resembles OpenAI stream delta events
                choice = (chunk.get("choices") or [{}])[0]
                delta = (choice.get("delta") or {}).get("content")
                if delta:
                    full_text.append(delta)
                    anth_chunk = {
                        "type": "message_delta",
                        "delta": {
                            "type": "message_delta",
                            "content": [{"type": "text_delta", "text": delta}],
                        },
                        "model": model_exposed,
                        "request_id": request_id,
                    }
                    yield f"event: message.delta\ndata: {anth_chunk}\n\n"
                if not usage_final and chunk.get("usage"):
                    usage_final = chunk["usage"]
            # Final message event
            final_text = "".join(full_text)
            final_payload = {
                "type": "message",
                "id": f"msg_{uuid.uuid4().hex[:8]}",
                "model": model_exposed,
                "role": "assistant",
                "content": [{"type": "text", "text": final_text}],
                "stop_reason": "end_turn",
                "usage": usage_final,
                "request_id": request_id,
            }
            yield f"event: message.stop\ndata: {final_payload}\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # Non-streaming path
    data = await call_openai_via_litellm(underlying, oai_messages, body)
    anthropic_resp = openai_to_anthropic_response(data, model_exposed)
    return JSONResponse(status_code=200, content=anthropic_resp.dict())

@app.get("/")
async def root():
    return {"service": "anthropic-bridge", "endpoints": ["/v1/messages", "/v1/models", "/v1/me", "/health"], "models": list(MODEL_MAP.keys())}

# Catch-all for debugging what Claude Code is requesting
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def catch_all(request: Request, path: str):
    body = await request.body()
    log_debug("Catch-all endpoint hit", {
        "method": request.method,
        "path": path,
        "headers": dict(request.headers),
        "body": body.decode()[:500] if body else "empty"
    })
    return JSONResponse(
        status_code=404,
        content={"error": {"type": "not_found", "message": f"Path /{path} not found", "available_endpoints": ["/v1/messages", "/v1/models", "/v1/me", "/health"]}}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai.anthropic_litellm_bridge:app", host="127.0.0.1", port=PORT, reload=False)
