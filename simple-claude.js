#!/usr/bin/env node
/**
 * Simple Claude CLI using your working Claude Code Router
 * No raw mode required - works in any terminal
 */

const readline = require('readline');
const fetch = require('node-fetch');

const API_BASE = 'http://127.0.0.1:3456';
const API_KEY = 'dev-local-key';
const MODEL = 'provider-6/claude-sonnet-4-20250514-thinking';

class SimpleClaude {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n🤖 You: '
    });
    
    this.conversation = [];
  }

  async sendMessage(userInput) {
    if (!userInput.trim()) return;

    this.conversation.push({ role: 'user', content: userInput });

    try {
      console.log('\n🧠 Claude is thinking...');
      
      const response = await fetch(`${API_BASE}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: this.conversation,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`❌ API Error: ${response.status} - ${error}`);
        return;
      }

      const result = await response.json();
      const claudeResponse = result.content?.[0]?.text || 'No response';
      
      // Add to conversation history
      this.conversation.push({ role: 'assistant', content: claudeResponse });
      
      // Display response
      console.log('\n📝 Claude:');
      console.log('─'.repeat(60));
      
      // Check if response has thinking tags and format nicely
      if (claudeResponse.includes('<thought>')) {
        const parts = claudeResponse.split(/<\/?thought>/);
        if (parts.length >= 3) {
          const thinking = parts[1];
          const response = parts[2];
          
          console.log('💭 Thinking:');
          console.log(thinking.trim());
          console.log('\n💬 Response:');
          console.log(response.trim());
        } else {
          console.log(claudeResponse);
        }
      } else {
        console.log(claudeResponse);
      }
      
      console.log('─'.repeat(60));
      
      // Usage info
      if (result.usage) {
        console.log(`📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async checkConnection() {
    try {
      const response = await fetch(`${API_BASE}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: 'ping' }]
        })
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  async start() {
    console.log('🚀 Simple Claude CLI');
    console.log('═'.repeat(60));
    
    // Check connection
    console.log('🔍 Checking connection to Claude Code Router...');
    const connected = await this.checkConnection();
    
    if (!connected) {
      console.log('❌ Cannot connect to Claude Code Router');
      console.log('   Make sure it\'s running: ccr start');
      console.log('   And A4F_KEY is set in environment');
      process.exit(1);
    }
    
    console.log('✅ Connected to Claude via your router!');
    console.log('\n💡 Commands:');
    console.log('   Type your message and press Enter');
    console.log('   Type "clear" to clear conversation history');
    console.log('   Type "exit" or Ctrl+C to quit');
    console.log('═'.repeat(60));

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const trimmed = input.trim().toLowerCase();
      
      if (trimmed === 'exit' || trimmed === 'quit') {
        console.log('\n👋 Goodbye!');
        this.rl.close();
        process.exit(0);
      }
      
      if (trimmed === 'clear') {
        this.conversation = [];
        console.log('\n🧹 Conversation cleared!');
        this.rl.prompt();
        return;
      }
      
      if (trimmed === 'help') {
        console.log('\n💡 Available commands:');
        console.log('   clear  - Clear conversation history');
        console.log('   exit   - Quit the application');
        console.log('   help   - Show this help');
        this.rl.prompt();
        return;
      }

      await this.sendMessage(input);
      this.rl.prompt();
    });

    this.rl.on('SIGINT', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }
}

// Start the CLI
const claude = new SimpleClaude();
claude.start().catch(console.error);
