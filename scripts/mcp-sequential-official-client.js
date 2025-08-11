#!/usr/bin/env node
// Official Sequential Thinking MCP client using upstream server via stdio.
// Launches the server with npx, performs initialize, lists tools, then calls the sequentialthinking tool.

const { spawn } = require('child_process');

const serverCmd = 'npx';
const serverArgs = ['-y','@modelcontextprotocol/server-sequential-thinking'];
console.error('[client] Spawning official sequential thinking server via npx');

const child = spawn(serverCmd, serverArgs, { stdio: ['pipe','pipe','pipe'] });

let buffer = '';
let msgCounter = 0;

function frame(json){
  const line = JSON.stringify(json)+'\n';
  return `Content-Length: ${Buffer.byteLength(line,'utf8')}\r\n\r\n${line}`;
}

function send(method, params){
  const id = `m${++msgCounter}`;
  const payload = { jsonrpc:'2.0', id, method, params };
  child.stdin.write(frame(payload));
  return id;
}

function callTool(name, args){
  return send('tools/call', { name, arguments: args });
}

function listTools(){
  return send('tools/list', {});
}

let initialized = false;
let toolCalled = false;
let toolCompleted = false;
const startTime = Date.now();
const INIT_TIMEOUT_MS = 15000;
const TOTAL_TIMEOUT_MS = 25000;
let initAttempts = 0;

function parseFrames(){
  while(true){
    const sep = buffer.indexOf('\r\n\r\n');
    if (sep === -1) break;
    const header = buffer.slice(0, sep);
    const m = /Content-Length: (\d+)/i.exec(header);
    if(!m){
      buffer = buffer.slice(sep+4);
      continue;
    }
    const length = parseInt(m[1],10);
    const start = sep+4;
    if (buffer.length < start + length) break;
    const body = buffer.slice(start, start+length);
    buffer = buffer.slice(start+length);
    try {
      const msg = JSON.parse(body);
      handleMessage(msg);
    } catch(e){
      console.error('Failed to parse message', e);
    }
  }
}

function handleMessage(msg){
  if (msg.method && msg.params){
    // notifications
    if (msg.method === 'notifications/message') {
      return; // ignore log notifications
    }
  }
  if (msg.id && msg.result){
    if (!initialized) {
      // First response should be initialize ack
      initialized = true;
      console.log('[client] Initialized (%.1fs)', (Date.now()-startTime)/1000);
      listTools();
      return;
    }
    if (msg.result.tools){
      const tool = msg.result.tools.find(t=>t.name==='sequentialthinking');
      if (!tool) {
        console.error('Sequential thinking tool not found');
        process.exit(1);
      }
      console.log('[client] Tool discovered, invoking...');
      callTool('sequentialthinking', {
        thought: 'Add 2 and 3',
        thoughtNumber: 1,
        totalThoughts: 1,
        nextThoughtNeeded: false
      });
      toolCalled = true;
      return;
    }
    if (msg.result.content){
      toolCompleted = true;
      console.log('[client] Tool response:\n' + msg.result.content.map(c=>c.text).join('\n'));
      console.log('[client] Done in %.1fs', (Date.now()-startTime)/1000);
      child.kill('SIGINT');
    }
  }
}

child.stdout.on('data', d => { buffer += d.toString(); parseFrames(); });
child.stderr.on('data', d => process.stderr.write(d));
child.on('exit', code => process.exit(code ?? 0));

// Kick off initialize once slight delay to allow server startup
function sendInitializeVariants(){
  if (initialized) return;
  initAttempts++;
  console.error(`[client] Sending initialize attempt #${initAttempts}`);
  // Variant A: minimal capabilities
  send('initialize', { client: { name: 'movieplayer-mcp-client', version: '0.1.0' }, capabilities: {} });
  // Variant B: explicit tools capability object
  send('initialize', { client: { name: 'movieplayer-mcp-client', version: '0.1.0' }, capabilities: { tools: {} } });
  // Variant C: legacy shape (if SDK accepted older field name "clientInfo")
  send('initialize', { clientInfo: { name: 'movieplayer-mcp-client', version: '0.1.0' }, capabilities: { tools: {} } });
}

setTimeout(sendInitializeVariants, 250);
setTimeout(()=>{ if(!initialized) sendInitializeVariants(); }, 1500);
setTimeout(()=>{ if(!initialized) sendInitializeVariants(); }, 4000);

// Progress watchdog
const interval = setInterval(()=>{
  const elapsed = Date.now()-startTime;
  if (!initialized) {
    console.error(`[client] Waiting for initialize response... attempts=${initAttempts}`);
  }
  if (!initialized && elapsed > INIT_TIMEOUT_MS) {
    console.error('[client] ERROR: initialize timeout after %dms', elapsed);
    clearInterval(interval); child.kill('SIGKILL'); process.exit(2);
  }
  if (initialized && toolCalled && !toolCompleted && elapsed > TOTAL_TIMEOUT_MS) {
    console.error('[client] ERROR: tool call timeout after %dms', elapsed);
    clearInterval(interval); child.kill('SIGKILL'); process.exit(3);
  }
}, 1000);
