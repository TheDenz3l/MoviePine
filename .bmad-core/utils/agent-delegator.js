#!/usr/bin/env node

/**
 * BMad Agent Delegation Handler
 * Automatically routes tasks to the appropriate BMad specialist agent
 */

const agentCapabilities = {
  dev: {
    name: 'Development Specialist',
    triggers: ['debug', 'fix', 'code', 'implement', 'refactor', 'error', 'bug', 'test', 'update', 'modify', 'change', 'overlay', 'component', 'search', 'ui', 'interface'],
    expertise: 'Code implementation, debugging, testing, technical problem solving',
    when: 'Use for all hands-on development work, debugging, and technical implementation'
  },
  qa: {
    name: 'QA Specialist', 
    triggers: ['test', 'testing', 'quality', 'validation', 'verify', 'check', 'qa', 'plan'],
    expertise: 'Test planning, quality assurance, validation strategies',
    when: 'Use for testing strategies, quality validation, and bug verification'
  },
  architect: {
    name: 'System Architect',
    triggers: ['design', 'architecture', 'structure', 'pattern', 'scalability'],
    expertise: 'System design, architecture patterns, scalability planning',
    when: 'Use for system design, architecture decisions, and technical planning'
  },
  pm: {
    name: 'Project Manager',
    triggers: ['plan', 'project', 'timeline', 'milestone', 'coordinate'],
    expertise: 'Project planning, timeline management, resource coordination',
    when: 'Use for project planning, timeline creation, and resource management'
  },
  'ux-expert': {
    name: 'UX Expert',
    triggers: ['ui', 'ux', 'design', 'interface', 'user', 'experience'],
    expertise: 'User experience design, interface design, usability',
    when: 'Use for UI/UX design, user experience optimization, and interface planning'
  },
  po: {
    name: 'Product Owner',
    triggers: ['requirements', 'features', 'backlog', 'story', 'acceptance', 'gather', 'requirement', 'feature'],
    expertise: 'Requirements gathering, feature definition, backlog management',
    when: 'Use for feature requirements, user story creation, and product planning'
  },
  sm: {
    name: 'Scrum Master',
    triggers: ['sprint', 'agile', 'workflow', 'process', 'coordination'],
    expertise: 'Sprint planning, agile workflows, team coordination',
    when: 'Use for sprint planning, workflow optimization, and team coordination'
  },
  analyst: {
    name: 'Business Analyst',
    triggers: ['analyze', 'research', 'investigate', 'study', 'evaluate'],
    expertise: 'Business analysis, research, investigation, evaluation',
    when: 'Use for business analysis, research tasks, and evaluation studies'
  }
};

function analyzeRequest(input) {
  const text = input.toLowerCase();
  const scores = {};
  
  // Score each agent based on trigger words
  for (const [agentId, agent] of Object.entries(agentCapabilities)) {
    scores[agentId] = 0;
    
    agent.triggers.forEach(trigger => {
      if (text.includes(trigger)) {
        scores[agentId] += 1;
      }
    });
  }
  
  // Find the highest scoring agent
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return null; // No clear match
  }
  
  const recommendedAgent = Object.keys(scores).find(agent => scores[agent] === maxScore);
  return {
    agent: recommendedAgent,
    confidence: maxScore,
    description: agentCapabilities[recommendedAgent]
  };
}

function handleDelegation(userInput) {
  const recommendation = analyzeRequest(userInput);
  
  if (recommendation) {
    return {
      action: 'delegate',
      targetAgent: recommendation.agent,
      agentName: recommendation.description.name,
      reason: `Based on keywords matching ${recommendation.description.expertise.toLowerCase()}`,
      command: `*agent ${recommendation.agent}`,
      confidence: recommendation.confidence
    };
  }
  
  return {
    action: 'orchestrate',
    reason: 'No clear specialist match - staying in orchestrator mode',
    suggestion: 'Use *help to see available agents or *agent [name] to switch manually'
  };
}

// CLI interface
if (require.main === module) {
  const userInput = process.argv.slice(2).join(' ');
  
  if (!userInput) {
    console.log('Usage: node agent-delegator.js "your request here"');
    console.log('\nAvailable agents:');
    Object.entries(agentCapabilities).forEach(([id, agent]) => {
      console.log(`  ${id}: ${agent.name} - ${agent.when}`);
    });
    process.exit(1);
  }
  
  const result = handleDelegation(userInput);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { analyzeRequest, handleDelegation, agentCapabilities };
