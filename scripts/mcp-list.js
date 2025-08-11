#!/usr/bin/env node
/*
 * Lists documented MCP tools for this project.
 * (Conceptual tools provided by assistant runtime; this script is for team visibility only.)
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'mcp', 'mcp.config.json');

try {
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  console.log('\nMCP Tools Registered (conceptual):');
  console.log('--------------------------------');
  for (const t of cfg.tools) {
    console.log(`- ${t.name} [${t.type}] :: ${t.description}`);
  }
  console.log('\nNotes:', cfg.notes);
  console.log('\nUsage Examples:');
  console.log('- Ask assistant: "Run AoT to plan migrating streaming pipeline"');
  console.log('- Ask assistant: "Sequential thinking: redesign hover animation steps"');
  console.log('- Ask assistant: "Context7: fetch Next.js streaming docs"');
  console.log('\n');
} catch (e) {
  console.error('Failed to read MCP config:', e.message);
  process.exit(1);
}
