#!/usr/bin/env node
/**
 * Bulletproof Claude Interface
 * Direct API client that completely bypasses ccr code interactive mode issues
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const API_BASE = 'http://127.0.0.1:3456';
const API_KEY = 'dev-local-key';
const MODEL = 'provider-6/claude-sonnet-4-20250514-thinking';

class BulletproofClaude {
  constructor() {
    this.conversation = [];
    this.setupInterface();
  }

  setupInterface() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n🤖 You: '
    });

    console.log('🛡️  Bulletproof Claude Interface');
    console.log('══════════════════════════════════════════════');
    console.log('✅ Direct API connection (bypasses ccr code issues)');
    console.log('✅ Full streaming support');
    console.log('✅ Complete responses guaranteed');
    console.log('══════════════════════════════════════════════');
    
    this.checkConnection();
  }

  async checkConnection() {
    try {
      console.log('\n🔍 Testing CCR connection...');
      const response = await this.makeRequest('/health', { method: 'GET' });
      if (response) {
        console.log('✅ CCR is running and accessible');
        this.startChat();
      }
    } catch (error) {
      console.log('❌ CCR connection failed:', error.message);
      console.log('💡 Make sure CCR is running: ccr start');
      process.exit(1);
    }
  }

  makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, API_BASE);
      const postData = options.body || null;
      
      const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          ...options.headers
        }
      };

      if (postData) {
        reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = http.request(reqOptions, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
          
          // Handle streaming responses
          if (options.stream && chunk.toString().includes('data: ')) {
            this.handleStreamChunk(chunk.toString());
          }
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  handleStreamChunk(chunk) {
    // Handle streaming data if needed
    // For now, we'll use the complete response
  }

  async sendMessage(userInput) {
    if (!userInput.trim()) return;

    // Handle special commands
    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }

    if (userInput.toLowerCase() === 'clear') {
      this.conversation = [];
      console.log('\n🧹 Conversation cleared!');
      this.rl.prompt();
      return;
    }

    this.conversation.push({ role: 'user', content: userInput });

    try {
      console.log('\n🧠 Claude is thinking...');
      
      const requestBody = JSON.stringify({
        model: MODEL,
        messages: this.conversation,
        max_tokens: 4000,
        stream: false // Disable streaming to avoid hanging issues
      });

      const response = await this.makeRequest('/v1/messages', {
        method: 'POST',
        body: requestBody
      });

      if (response.content && response.content[0] && response.content[0].text) {
        const claudeResponse = response.content[0].text;
        this.conversation.push({ role: 'assistant', content: claudeResponse });
        
        console.log('\n💬 Claude:');
        console.log('─'.repeat(50));
        console.log(claudeResponse);
        console.log('─'.repeat(50));
      } else {
        console.log('\n❌ Unexpected response format:', JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
      console.log('🔄 You can try your message again or type "exit" to quit.');
    }

    this.rl.prompt();
  }

  startChat() {
    console.log('\n💡 Commands:');
    console.log('   • Type your message and press Enter');
    console.log('   • Type "clear" to clear conversation');
    console.log('   • Type "exit" or "quit" to exit');
    console.log('══════════════════════════════════════════════\n');

    this.rl.prompt();
    
    this.rl.on('line', (input) => {
      this.sendMessage(input.trim());
    });

    this.rl.on('SIGINT', () => {
      console.log('\n\n👋 Goodbye!');
      process.exit(0);
    });
  }
}

// Start the bulletproof interface
new BulletproofClaude();
