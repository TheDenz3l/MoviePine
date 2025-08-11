#!/usr/bin/env node
// SDK-based MCP client for the official sequential thinking server.
// Spawns the server via npx and uses StdioClientTransport from @modelcontextprotocol/sdk.

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main(){
  console.error('[sdk-client] Preparing transport spawn');
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y','@modelcontextprotocol/server-sequential-thinking'],
    stderr: 'pipe'
  });

  const client = new Client({
    name: 'movieplayer-sdk-client',
    version: '0.1.0'
  }, {
    // minimal capabilities for tools
    tools: {}
  });

  let clientClosed = false;

  await client.connect(transport);
  transport.stderr?.on('data', d=> process.stderr.write(d));
  console.error('[sdk-client] Connected (initialize auto-run). Listing tools...');
  const tools = await client.listTools();
  const seqTool = tools.tools.find(t=>t.name==='sequentialthinking');
  if(!seqTool){
    throw new Error('sequentialthinking tool not found');
  }
  console.error('[sdk-client] Tool found, calling');
  const result = await client.callTool({ name: 'sequentialthinking', arguments: {
    thought: 'Add 2 and 3',
    thoughtNumber: 1,
    totalThoughts: 1,
    nextThoughtNeeded: false
  }});

  console.log('[sdk-client] Tool response:');
  for(const c of result.content){
    if(c.type === 'text') console.log(c.text);
  }

  await client.close();
  clientClosed = true;
  console.error('[sdk-client] Done');
}

main().catch(err=>{
  console.error('[sdk-client] ERROR', err);
  process.exit(1);
});
