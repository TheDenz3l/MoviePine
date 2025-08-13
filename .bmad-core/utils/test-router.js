#!/usr/bin/env node

/**
 * Test the BMad router delegation
 */

const { handleDelegation } = require('./agent-delegator.js');

function testRouting() {
  const testCases = [
    "I want to update search overlay on the live tv page to used the search overlay",
    "fix the search component",
    "debug the UI issue",
    "design the system architecture", 
    "create project timeline",
    "test the application",
    "improve user experience",
    "gather requirements for new feature"
  ];

  console.log('🧪 Testing BMad Router Delegation\n');

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase}"`);
    const result = handleDelegation(testCase);
    
    if (result.action === 'delegate') {
      console.log(`  ✅ Route to: ${result.targetAgent} (${result.agentName})`);
      console.log(`  📝 Reason: ${result.reason}`);
      console.log(`  🎯 Confidence: ${result.confidence}`);
    } else {
      console.log(`  ⚠️  No delegation: ${result.reason}`);
    }
    console.log('');
  });
}

if (require.main === module) {
  testRouting();
}

module.exports = { testRouting };
