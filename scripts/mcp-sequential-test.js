#!/usr/bin/env node
// Attempt an authenticated Sequential Thinking session step via POST.
// Requires: SEQ_THINKING_API_KEY, SEQ_THINKING_PROFILE
// Falls back to unauthenticated (will 401) if missing.
// Exit codes: 0 on reachable (even 401), 1 on unexpected HTTP >=400 (except 401), 2 network error.

const https = require('https');

const { SEQ_THINKING_API_KEY, SEQ_THINKING_PROFILE } = process.env;
const base = 'server.smithery.ai';
// Base path (no query params to avoid leaking key; use Authorization header instead)
let path = '/@smithery-ai/server-sequential-thinking/mcp';

// We try a POST with a minimal sequential-thinking payload (thought #1 asking to sum numbers)
// Hypothetical contract: JSON body with fields: thought, nextThoughtNeeded, thoughtNumber, totalThoughts
// If server requires a different schema this will still validate reachability & auth.

const candidateMethods = [
  'sequentialThinking.step',
  'sequential-thinking.step',
  'sequentialThinking',
  'sequential-thinking'
];

const authVariants = (function () {
  if (!SEQ_THINKING_API_KEY) return [[]];
  return [
    [{ name: 'Authorization', value: `Bearer ${SEQ_THINKING_API_KEY}` }],
    [{ name: 'Authorization', value: `Token ${SEQ_THINKING_API_KEY}` }],
    [{ name: 'Authorization', value: `Api-Key ${SEQ_THINKING_API_KEY}` }],
    [{ name: 'X-API-Key', value: SEQ_THINKING_API_KEY }],
    [
      { name: 'Authorization', value: `Bearer ${SEQ_THINKING_API_KEY}` },
      { name: 'X-API-Key', value: SEQ_THINKING_API_KEY }
    ]
  ];
})();

function attempt(methodIdx, authIdx) {
  if (authIdx >= authVariants.length) {
    process.stdout.write('All auth variants exhausted.\n');
    return;
  }
  if (methodIdx >= candidateMethods.length) {
    attempt(0, authIdx + 1);
    return;
  }
  const method = candidateMethods[methodIdx];
  const variant = authVariants[authIdx];
  const rpc = {
    jsonrpc: '2.0',
    id: `test-${authIdx}-${methodIdx}`,
    method,
    params: {
      thought: 'Add numbers 2 and 3',
      nextThoughtNeeded: false,
      thoughtNumber: 1,
      totalThoughts: 1
    }
  };
  const payload = JSON.stringify(rpc);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  };
  for (const h of variant) headers[h.name] = h.value;
  if (SEQ_THINKING_PROFILE) headers['X-Seq-Thinking-Profile'] = SEQ_THINKING_PROFILE;
  const opts = { method: 'POST', hostname: base, path, headers };
  const req = https.request(opts, res => {
    let body = '';
    res.on('data', d => (body += d));
    res.on('end', () => {
      const authDesc = variant.map(v => v.name).join('+') || 'none';
      process.stdout.write(`AuthVariant[${authIdx}](${authDesc}) Method '${method}' status: ${res.statusCode}\n`);
      if (body) {
        process.stdout.write(`Raw body: ${body}\n`);
        try {
          const parsed = JSON.parse(body);
          const keys = Object.keys(parsed).join(', ');
          process.stdout.write(`Parsed keys: ${keys}\n`);
          if (parsed.result) {
            process.stdout.write('Success: received result field.\n');
          }
        } catch (e) {
          process.stdout.write('Body not JSON.\n');
        }
      }
      if (res.statusCode === 200) return; // success
      if (res.statusCode === 401) {
        process.stdout.write('401 Unauthorized — trying next auth variant.\n');
        attempt(0, authIdx + 1);
        return;
      }
      // For 400/404 keep trying other method names under same auth variant
      attempt(methodIdx + 1, authIdx);
    });
  });
  req.on('error', err => {
    process.stderr.write(`Network error (method ${method}): ${err.message}\n`);
  });
  req.write(payload);
  req.end();
}

attempt(0, 0);
