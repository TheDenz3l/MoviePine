#!/usr/bin/env node
// Launch the open-source sequential thinking MCP server from modelcontextprotocol/servers via npx and send one tool call.

const { spawn } = require('child_process');

const cmd = 'npx';
const args = ['-y','@modelcontextprotocol/server-sequential-thinking'];

const child = spawn(cmd, args, { stdio: ['pipe','pipe','pipe'] });

let raw = '';
child.stderr.on('data', d => process.stderr.write(d));

let initializedSent = false;
let initAck = false;
let initAttempt = 0;
const initVariants = [
  // Variant 0: basic (no protocolVersion)
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ capabilities:{}, clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 1: protocolVersion 2024-05-31
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ protocolVersion:'2024-05-31', capabilities:{}, clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 2: protocolVersion 2024-11-05
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ protocolVersion:'2024-11-05', capabilities:{}, clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 3: capabilities with tools key
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ capabilities:{ tools:{} }, clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 4: capabilities null
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ capabilities:null, clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 5: minimal params only clientInfo
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ clientInfo:{ name:'local-test-client', version:'0.1.0' } } }),
  // Variant 6: include experimental empty
  (id) => ({ jsonrpc:'2.0', id, method:'initialize', params:{ protocolVersion:'2024-05-31', capabilities:{ experimental:{} }, clientInfo:{ name:'local-test-client', version:'0.1.0' } } })
];
let toolsListed = false;
let toolCallReceived = false;
let toolNames = [];

child.stdout.on('data', d => {
  raw += d.toString();
  process.stdout.write(d);
  if (/Sequential Thinking MCP Server running/i.test(raw) && !initializedSent) {
    sendInitialize();
  }
  parseFrames();
  maybeFinish();
});

function frame(msg){
  const json = JSON.stringify(msg)+'\n';
  const header = `Content-Length: ${Buffer.byteLength(json,'utf8')}\r\n\r\n`;
  return header+json;
}

function send(msg){
  child.stdin.write(frame(msg));
}

function sendInitialize(){
  if (initAttempt >= initVariants.length) {
    debug('All initialize variants exhausted');
    return;
  }
  const variantBuilder = initVariants[initAttempt];
  const msg = variantBuilder('init-'+initAttempt);
  initializedSent = true;
  debug('Sending initialize variant '+initAttempt+': '+JSON.stringify(msg));
  send(msg);
  // Schedule retry if no ack
  setTimeout(()=>{
    if (!initAck && initAttempt < initVariants.length-1) {
      initAttempt++;
      sendInitialize();
    }
  }, 600);
}

function parseFrames(){
  while (true) {
    // Accept \r\n\r\n or \n\n as header terminator
    let sep = raw.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (sep === -1) {
      sep = raw.indexOf('\n\n');
      sepLen = 2;
    }
    if (sep === -1) break;
    const header = raw.slice(0, sep);
    const lenMatch = /Content-Length: (\d+)/i.exec(header);
    if (!lenMatch) { raw = raw.slice(sep+sepLen); continue; }
    const length = parseInt(lenMatch[1],10);
    const start = sep + sepLen;
    if (raw.length < start + length) break; // incomplete body
    const body = raw.slice(start, start + length);
    raw = raw.slice(start + length);
    debug('Parsed frame length '+length);
    try { const msg = JSON.parse(body); handleMessage(msg); } catch(e){ debug('Frame JSON parse error: '+e.message); }
  }
}

function handleMessage(msg){
  debug('Received message id=' + msg.id + (msg.method? (' method='+msg.method):''));
  if (msg.id && /^init-/.test(msg.id) && msg.result) {
    initAck = true;
    debug('Initialize ACK via '+msg.id);
    // Now request tools list
    send({ jsonrpc:'2.0', id:'tools', method:'tools/list' });
  }
  if (msg.id === 'tools' && msg.result && msg.result.tools) {
    toolsListed = true;
    toolNames = msg.result.tools.map(t=>t.name);
    debug('Tools listed: '+toolNames.join(','));
    // Call the tool once we have list
    send({ jsonrpc:'2.0', id:'think1', method:'tool/call', params:{ name:'sequentialthinking', arguments:{ thought:'Test addition plan', nextThoughtNeeded:false, thoughtNumber:1, totalThoughts:1 }}});
  }
  if (msg.id === 'think1' && msg.result && msg.result.content) {
    const textItem = msg.result.content.find(c=>c.type==='text');
    if (textItem) {
      try {
        const parsed = JSON.parse(textItem.text);
        if (typeof parsed.thoughtNumber === 'number' && typeof parsed.totalThoughts === 'number') {
          toolCallReceived = true;
          debug('Tool call result parsed OK');
        } else {
          debug('Tool call text parsed but missing expected fields');
        }
      } catch(e) { debug('Failed to parse tool call text: '+e.message); }
    }
  }
}

function maybeFinish(){
  if (initAck && toolsListed && toolCallReceived) {
    const ok = toolNames.includes('sequentialthinking');
    if (!ok) {
      console.error('Sequential thinking tool not in tool list');
      process.exitCode = 1;
    }
    cleanupAndExit();
  }
}

function cleanupAndExit(){
  setTimeout(()=>{
    child.kill();
  },50);
}

setTimeout(()=>{
  if (!initAck) {
    console.error('Timeout: no initialize response');
    process.exitCode = 2;
    child.kill();
    return;
  }
  if (!toolsListed) {
    console.error('Timeout: tools list not received');
    process.exitCode = 2;
    child.kill();
    return;
  }
  if (!toolCallReceived) {
    console.error('Timeout: tool call response not received');
    process.exitCode = 2;
    child.kill();
    return;
  }
},12000);

function debug(msg){
  if (process.env.DEBUG_SEQ_LOCAL) {
    console.error('[seq-local] '+msg);
  }
}
