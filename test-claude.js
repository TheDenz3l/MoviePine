// Test Claude Code Router API directly
const fetch = require('node-fetch');

async function testClaude() {
  try {
    const response = await fetch('http://127.0.0.1:3456/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-local-key'
      },
      body: JSON.stringify({
        model: 'provider-6/claude-sonnet-4-20250514-thinking',
        messages: [
          { role: 'user', content: 'Write a simple hello world function in JavaScript' }
        ]
      })
    });

    const result = await response.json();
    console.log('Claude Response:');
    console.log(result.content[0].text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testClaude();
