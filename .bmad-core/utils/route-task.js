#!/usr/bin/env node

/**
 * BMad Automatic Task Router
 * Automatically routes tasks to the appropriate BMad agent
 */

const { handleDelegation } = require('./agent-delegator.js');

function routeTask(userRequest) {
  const result = handleDelegation(userRequest);
  
  console.log(`🎯 BMad Router Analysis for: "${userRequest}"`);
  console.log(''.padStart(80, '='));
  
  if (result.action === 'delegate') {
    console.log(`✅ ROUTING TO: ${result.targetAgent.toUpperCase()}`);
    console.log(`👤 Agent: ${result.agentName}`);
    console.log(`📝 Reason: ${result.reason}`);
    console.log(`🎯 Confidence: ${result.confidence}`);
    console.log(`💻 Command: ${result.command}`);
    console.log(''.padStart(80, '='));
    console.log(`🚀 Next Steps:`);
    console.log(`   1. Copy this command: ${result.command}`);
    console.log(`   2. Paste it in your BMad chat`);
    console.log(`   3. The ${result.agentName} will handle your request`);
    
    return {
      success: true,
      targetAgent: result.targetAgent,
      command: result.command
    };
  } else {
    console.log(`⚠️  NO SPECIFIC AGENT MATCH`);
    console.log(`📝 Reason: ${result.reason}`);
    console.log(`💡 Suggestion: ${result.suggestion}`);
    console.log(''.padStart(80, '='));
    console.log(`🚀 Next Steps:`);
    console.log(`   1. Use: *agent bmad-orchestrator`);
    console.log(`   2. Or choose a specific agent manually`);
    console.log(`   3. Available: dev, architect, pm, qa, ux-expert, po, sm, analyst`);
    
    return {
      success: false,
      suggestion: '*agent bmad-orchestrator'
    };
  }
}

// CLI interface
if (require.main === module) {
  const userInput = process.argv.slice(2).join(' ');
  
  if (!userInput) {
    console.log('📍 BMad Automatic Task Router');
    console.log('Usage: node route-task.js "your request here"');
    console.log('');
    console.log('Example: node route-task.js "fix the search overlay bug"');
    console.log('');
    console.log('Available agents:');
    console.log('  • dev: Code implementation, debugging, UI fixes');
    console.log('  • architect: System design, architecture patterns');
    console.log('  • pm: Project planning, timeline management');
    console.log('  • qa: Testing strategies, quality validation');
    console.log('  • ux-expert: User experience design, interface design');
    console.log('  • po: Requirements gathering, feature definition');
    console.log('  • sm: Sprint planning, agile workflows');
    console.log('  • analyst: Business analysis, research');
    process.exit(1);
  }
  
  routeTask(userInput);
}

module.exports = { routeTask };
