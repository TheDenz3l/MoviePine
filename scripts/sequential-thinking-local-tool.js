#!/usr/bin/env node
/*
Local Sequential Thinking demo (no MCP handshake required).
Implements a lightweight reflective thought processor inspired by the open-source server
(https://github.com/modelcontextprotocol/servers, MIT) but simplified & re-written.

Features:
- Track thoughts, allow dynamic totalThoughts adjustments
- Support revision & branching metadata (isRevision, revisesThought, branchFromThought, branchId)
- Provide summary snapshot after each step

Usage:
  node scripts/sequential-thinking-local-tool.js '{"thought":"Plan addition","nextThoughtNeeded":true,"thoughtNumber":1,"totalThoughts":3}' \
      '{"thought":"Compute 2+3","nextThoughtNeeded":false,"thoughtNumber":2,"totalThoughts":3}'
If no args: runs a built-in mini demo.
*/

class SequentialThinkingEngine {
  constructor(options = {}) {
    this.history = [];
    this.branches = {}; // branchId -> array of thoughts
    this.disableLogging = !!options.disableLogging;
  }

  addStep(input) {
    const data = this.validate(input);

    // Auto-extend totalThoughts if current exceeds projection
    if (data.thoughtNumber > data.totalThoughts) {
      data.totalThoughts = data.thoughtNumber;
    }

    this.history.push(data);

    if (data.branchId) {
      if (!this.branches[data.branchId]) this.branches[data.branchId] = [];
      this.branches[data.branchId].push(data);
    }

    if (!this.disableLogging) {
      process.stderr.write(this.formatThought(data));
    }

    return this.snapshot();
  }

  validate(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Input must be object');
    const { thought, nextThoughtNeeded, thoughtNumber, totalThoughts } = obj;
    if (typeof thought !== 'string' || !thought.trim()) throw new Error('thought must be non-empty string');
    if (typeof nextThoughtNeeded !== 'boolean') throw new Error('nextThoughtNeeded must be boolean');
    if (typeof thoughtNumber !== 'number' || thoughtNumber < 1) throw new Error('thoughtNumber must be >= 1');
    if (typeof totalThoughts !== 'number' || totalThoughts < 1) throw new Error('totalThoughts must be >= 1');
    return {
      thought: thought.trim(),
      nextThoughtNeeded,
      thoughtNumber,
      totalThoughts,
      isRevision: obj.isRevision === true ? true : undefined,
      revisesThought: typeof obj.revisesThought === 'number' ? obj.revisesThought : undefined,
      branchFromThought: typeof obj.branchFromThought === 'number' ? obj.branchFromThought : undefined,
      branchId: typeof obj.branchId === 'string' ? obj.branchId : undefined,
      needsMoreThoughts: obj.needsMoreThoughts === true ? true : undefined,
      timestamp: Date.now()
    };
  }

  formatThought(t) {
    const parts = [];
    if (t.isRevision) parts.push('REVISION');
    else if (t.branchFromThought) parts.push('BRANCH');
    else parts.push('THOUGHT');
    const meta = [];
    if (t.isRevision && t.revisesThought) meta.push(`revises:${t.revisesThought}`);
    if (t.branchFromThought) meta.push(`from:${t.branchFromThought}`);
    if (t.branchId) meta.push(`branch:${t.branchId}`);
    return `[${parts.join('+')}] ${t.thoughtNumber}/${t.totalThoughts} ${meta.length? '('+meta.join(', ')+') ': ''}- ${t.thought}\n`;
  }

  snapshot() {
    return {
      thoughtNumber: this.history.at(-1).thoughtNumber,
      totalThoughts: this.history.at(-1).totalThoughts,
      nextThoughtNeeded: this.history.at(-1).nextThoughtNeeded,
      thoughtHistoryLength: this.history.length,
      branches: Object.keys(this.branches),
      done: !this.history.at(-1).nextThoughtNeeded,
      lastThought: this.history.at(-1).thought
    };
  }
}

function runDemo(engine){
  const steps = [
    { thought: 'Outline solution', nextThoughtNeeded: true, thoughtNumber: 1, totalThoughts: 3 },
    { thought: 'Provide concrete example', nextThoughtNeeded: true, thoughtNumber: 2, totalThoughts: 3 },
    { thought: 'Finalize answer', nextThoughtNeeded: false, thoughtNumber: 3, totalThoughts: 3 }
  ];
  for (const s of steps) {
    const snap = engine.addStep(s);
    process.stdout.write(JSON.stringify(snap)+"\n");
  }
}

function main(){
  const engine = new SequentialThinkingEngine();
  const args = process.argv.slice(2);
  if (!args.length) {
    runDemo(engine);
    return;
  }
  for (const raw of args) {
    let obj;
    try { obj = JSON.parse(raw); } catch(e) { console.error('Bad JSON arg:', raw); process.exit(1); }
    try {
      const snap = engine.addStep(obj);
      process.stdout.write(JSON.stringify(snap)+"\n");
      if (snap.done) break;
    } catch(err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  }
}

if (require.main === module) main();
