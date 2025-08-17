#!/usr/bin/env node
/**
 * OpenAI-compatible shim for Claude Code Router
 * Maps /v1/chat/completions to /v1/messages
 */

const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

const CCR_BASE = process.env.CCR_BASE || 'http://127.0.0.1:3456';
const SHIM_PORT = process.env.SHIM_PORT || 3457;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', upstream: CCR_BASE });
});

// OpenAI chat completions -> Anthropic messages
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, stream = false, ...otherParams } = req.body;
    
    // Transform OpenAI format to Anthropic format
    const anthropicPayload = {
      model,
      messages,
      stream,
      ...otherParams
    };

    const response = await fetch(`${CCR_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(anthropicPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const result = await response.json();
    
    // Transform Anthropic response to OpenAI format
    const openaiResponse = {
      id: result.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model || model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.content?.[0]?.text || result.content || ''
        },
        finish_reason: result.stop_reason === 'end_turn' ? 'stop' : result.stop_reason || 'stop'
      }],
      usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    res.json(openaiResponse);
  } catch (error) {
    console.error('Shim error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pass through other endpoints
app.all('*', async (req, res) => {
  try {
    const response = await fetch(`${CCR_BASE}${req.path}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(SHIM_PORT, () => {
  console.log(`OpenAI shim running on http://localhost:${SHIM_PORT}`);
  console.log(`Proxying to CCR at ${CCR_BASE}`);
});
