#!/usr/bin/env node
/**
 * Claude Code compatibility checker and launcher
 * Handles raw mode issues and provides fallbacks
 */

const { execSync, spawn } = require('child_process');

console.log('🔍 Claude Code Compatibility Checker\n');

// Check if ccr is running
async function checkRouterStatus() {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://127.0.0.1:3456/health', { 
      method: 'GET',
      timeout: 2000 
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Check raw mode support
function checkRawModeSupport() {
  try {
    if (!process.stdin.isTTY) {
      return false;
    }
    // Try to set raw mode briefly
    process.stdin.setRawMode(true);
    process.stdin.setRawMode(false);
    return true;
  } catch (error) {
    console.log(`⚠️  Raw mode not supported: ${error.message}`);
    return false;
  }
}

// Test API connectivity
async function testAPI() {
  const { default: fetch } = await import('node-fetch');
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-local-key'
      },
      body: JSON.stringify({
        model: 'provider-6/claude-sonnet-4-20250514-thinking',
        messages: [{ role: 'user', content: 'ping' }]
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.content?.[0]?.text || 'API working';
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  // 1. Check router status
  console.log('1️⃣ Checking Claude Code Router...');
  const routerRunning = await checkRouterStatus();
  if (routerRunning) {
    console.log('✅ Router is running on port 3456');
  } else {
    console.log('❌ Router not running. Start with: ccr start');
    process.exit(1);
  }

  // 2. Test API
  console.log('\n2️⃣ Testing API connectivity...');
  const apiResponse = await testAPI();
  if (apiResponse) {
    console.log('✅ API is working');
    console.log(`   Response: ${apiResponse.substring(0, 50)}...`);
  } else {
    console.log('❌ API test failed. Check A4F_KEY environment variable.');
    process.exit(1);
  }

  // 3. Check raw mode support
  console.log('\n3️⃣ Checking terminal compatibility...');
  const rawModeSupported = checkRawModeSupport();
  
  if (rawModeSupported) {
    console.log('✅ Raw mode supported - Claude Code should work');
    console.log('\n🚀 Launching Claude Code...');
    
    // Set environment and launch
    process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:3456';
    process.env.ANTHROPIC_API_KEY = 'dev-local-key';
    
    const child = spawn('ccr', ['code'], {
      stdio: 'inherit',
      env: process.env
    });
    
    child.on('exit', (code) => {
      console.log(`\nClaude Code exited with code ${code}`);
      process.exit(code);
    });
    
  } else {
    console.log('❌ Raw mode not supported in this terminal');
    console.log('\n🔧 Workarounds:');
    console.log('   1. Use iTerm2 or Terminal.app directly (not VS Code terminal)');
    console.log('   2. Use the API directly (see test-claude.js)');
    console.log('   3. Try: script -q /dev/null ccr code');
    console.log('\n📡 Your API setup is working perfectly for direct integration!');
    
    console.log('\n🧪 Quick API test:');
    console.log(`curl -H 'Authorization: Bearer dev-local-key' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -d '{"model":"provider-6/claude-sonnet-4-20250514-thinking","messages":[{"role":"user","content":"Hello"}]}' \\`);
    console.log(`  http://127.0.0.1:3456/v1/messages`);
  }
}

main().catch(console.error);
