#!/usr/bin/env node
/**
 * MCP Server for Claude Code Router
 * Bridges Claude Code to your A4F-powered router
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fetch = require('node-fetch');

const API_BASE = 'http://127.0.0.1:3456';
const API_KEY = 'dev-local-key';
const MODEL = 'provider-6/claude-sonnet-4-20250514-thinking';

class RouterMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'claude-code-router',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  setupTools() {
    // Add tools for interacting with your router
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'query_a4f_claude',
            description: 'Query Claude via your A4F-powered router',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The message to send to Claude',
                },
                model: {
                  type: 'string',
                  description: 'Model to use (optional)',
                  default: MODEL,
                },
              },
              required: ['message'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'query_a4f_claude') {
        try {
          const response = await fetch(`${API_BASE}/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
              model: args.model || MODEL,
              messages: [{ role: 'user', content: args.message }],
              max_tokens: 4000,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const result = await response.json();
          const content = result.content?.[0]?.text || 'No response';

          return {
            content: [
              {
                type: 'text',
                text: `A4F Claude Response:\n\n${content}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error querying A4F Claude: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Run the server
const server = new RouterMCPServer();
server.run().catch(console.error);
