#!/usr/bin/env node

/**
 * BMad Quick Router - "*" Command
 * Ultra-fast task routing to the right specialist
 */

const { handleDelegation } = require('./agent-delegator.js');

function quickRoute(userRequest) {
  const result = handleDelegation(userRequest);
  
  if (result.action === 'delegate') {
    // Success - show the agent command
    console.log(`🎯 ${result.command}`);
    console.log(`📋 Task: "${userRequest}"`);
    console.log(`👤 → ${result.agentName}`);
    
    return result.command;
  } else {
    // No clear match - suggest orchestrator
    console.log(`🎯 *agent bmad-orchestrator`);
    console.log(`📋 Task: "${userRequest}"`);
    console.log(`❓ → No clear specialist match`);
    
    return '*agent bmad-orchestrator';
  }
}

// CLI interface
if (require.main === module) {
  const userInput = process.argv.slice(2).join(' ');
  
  if (!userInput) {
    console.log('🚀 BMad Quick Router - "*" Command');
    console.log('');
    console.log('Usage: * "your task description"');
    console.log('');
    console.log('Examples:');
    console.log('  * "fix the search overlay"        → *agent dev');
    console.log('  * "design the authentication"     → *agent architect');
    console.log('  * "create project timeline"       → *agent pm');
    console.log('  * "test the application"          → *agent qa');
    console.log('');
    console.log('The output command can be copied directly to BMad chat!');
    process.exit(1);
  }
  
  quickRoute(userInput);
}

module.exports = { quickRoute };
