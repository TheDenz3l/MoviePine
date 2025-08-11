#!/usr/bin/env node
// Launch the Sequential Thinking MCP server locally via Smithery CLI (stdio) and perform a simple session.
// Uses provided key & profile args. Falls back to env if CLI args absent.
// This simulates how an MCP client would interact over stdio JSON-RPC.

const { spawn } = require('child_process');

const KEY = process.env.SEQ_THINKING_API_KEY || process.argv[2];
const PROFILE = process.env.SEQ_THINKING_PROFILE || process.argv[3];
if (!KEY || !PROFILE) {
  console.error('Usage: SEQ_THINKING_API_KEY=... SEQ_THINKING_PROFILE=... npm run mcp:sequential:session');
  process.exit(1);
}

// Smithery CLI command per user example
const cmd = 'npx';
const args = ['-y','@smithery/cli@latest','run','@smithery-ai/server-sequential-thinking','--key',KEY,'--profile',PROFILE];

const child = spawn(cmd, args, { stdio: ['pipe','pipe','pipe'] });

let rawBuffer = '';
let lastActivity = Date.now();
child.stdout.on('data', chunk => {
  const text = chunk.toString();
  rawBuffer += text;
  process.stdout.write(text.replace(new RegExp(KEY,'g'),'***'));
  lastActivity = Date.now();
  // Parse Content-Length framed JSON-RPC messages if present
  parseFrames();
});
child.stderr.on('data', chunk => {
  const text = chunk.toString();
  process.stderr.write(text.replace(KEY,'***'));
  lastActivity = Date.now();
});
child.on('exit', code => {
  console.log(`MCP server exited with code ${code}`);
});

let initialized = false;
function frameMessage(obj){
  const jsonLine = JSON.stringify(obj) + '\n';
  const header = `Content-Length: ${Buffer.byteLength(jsonLine, 'utf8')}\r\n\r\n`;
  return header + jsonLine;
}

function send(msg){
  const framed = frameMessage(msg);
  child.stdin.write(framed);
}

function parseFrames(){
  // Simple parser: look for Content-Length header, then extract body
  while (true) {
    const headerIdx = rawBuffer.indexOf('\r\n\r\n');
    if (headerIdx === -1) break;
    const headerPart = rawBuffer.slice(0, headerIdx);
    const match = /Content-Length: (\d+)/i.exec(headerPart);
    if (!match) { rawBuffer = rawBuffer.slice(headerIdx + 4); continue; }
    const length = parseInt(match[1],10);
    const start = headerIdx + 4;
    if (rawBuffer.length < start + length) break; // wait for more
    const body = rawBuffer.slice(start, start + length);
    rawBuffer = rawBuffer.slice(start + length);
    try {
      const msg = JSON.parse(body);
      if (!initialized && msg.result) {
        // Possibly response to initialize
        process.stdout.write('[Parsed initialize response]\n');
      }
    } catch(e){ /* ignore parse errors */ }
  }
}

function startSession(){
  if (initialized) return;
  initialized = true;
  // Basic initialize message (speculative JSON-RPC shape)
  send({ jsonrpc:'2.0', id:'init-1', method:'initialize', params:{ client:'local-test', version:'0.1.0' }});
  // After a short delay send a sequential step
  setTimeout(()=>{
  send({ jsonrpc:'2.0', id:'step-1', method:'sequentialThinking.step', params:{ thought:'Add 2 and 3', thoughtNumber:1, totalThoughts:1, nextThoughtNeeded:false }});
  },500);
}

// Fallback timeout if no 'ready' output detected
setTimeout(()=>{
  if(!initialized){
    startSession();
  }
},2000);

// Periodic status + global timeout
const startTime = Date.now();
const interval = setInterval(()=>{
  const elapsed = ((Date.now()-startTime)/1000).toFixed(1);
  process.stdout.write(`[status] elapsed=${elapsed}s initialized=${initialized} lastActivity=${((Date.now()-lastActivity)/1000).toFixed(1)}s\n`);
  if (Date.now()-startTime > 25000) {
    process.stdout.write('[timeout] No successful response within 25s, terminating child.\n');
    clearInterval(interval);
    try { child.kill('SIGKILL'); } catch(_){}
  }
},5000);
