#!/usr/bin/env node
// Enhanced reachability & auth check for Sequential Thinking MCP remote server.
// Usage:
//   SEQ_THINKING_API_KEY=xxxx SEQ_THINKING_PROFILE=profileId npm run mcp:sequential:health
// Notes:
//   * 200 => OK (authorized)
//   * 401 => Unauthorized (server reachable, missing/invalid key) -> exit 0 (informational) unless STRICT=1
//   * Other 4xx/5xx => real failure -> exit 1
//   * Network error => exit 2
// Avoid committing secrets. Provide via env / secret manager.

const https = require('https');
const { SEQ_THINKING_API_KEY, SEQ_THINKING_PROFILE, STRICT } = process.env;

const base = 'https://server.smithery.ai/@smithery-ai/server-sequential-thinking/mcp';
const params = new URLSearchParams();
if (SEQ_THINKING_API_KEY) params.set('api_key', SEQ_THINKING_API_KEY);
if (SEQ_THINKING_PROFILE) params.set('profile', SEQ_THINKING_PROFILE);
const url = params.toString() ? `${base}?${params.toString()}` : base;

const redactedUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
https.get(url, res => {
  const { statusCode } = res;
  process.stdout.write(`Sequential Thinking MCP status: ${statusCode} (url=${redactedUrl})\n`);
  if (statusCode === 200) return; // success
  if (statusCode === 401) {
    process.stdout.write('Info: Unauthorized (401). Server reachable; provide SEQ_THINKING_API_KEY to authenticate.\n');
    if (STRICT === '1') process.exitCode = 1; // treat as failure only in strict mode
    return;
  }
  process.exitCode = 1;
  res.resume();
}).on('error', err => {
  process.stderr.write(`Error contacting Sequential Thinking MCP: ${err.message}\n`);
  process.exitCode = 2;
});
