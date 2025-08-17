#!/usr/bin/env node

/**
 * Load test script for Phase 5 Security & Reliability Hardening
 * Tests rate limiting and performance under load
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  target: process.env.TEST_TARGET || 'http://localhost:3000',
  endpoints: [
    '/api/auth/send-magic-link',
    '/api/me/settings',
    '/api/config'
  ],
  requestsPerSecond: parseInt(process.env.RPS || '10'),
  duration: parseInt(process.env.DURATION || '30'), // seconds
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '5')
};

console.log('🚀 Starting Load Test for Security Features');
console.log('🎯 Target:', CONFIG.target);
console.log('⏱️  Duration:', CONFIG.duration, 'seconds');
console.log('👥 Concurrent Users:', CONFIG.concurrentUsers);
console.log('⚡ Requests per Second:', CONFIG.requestsPerSecond);

// Test results storage
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  rateLimitedRequests: 0,
  totalTime: 0,
  responseTimes: [],
  statusCodes: {},
  errors: []
};

// Create HTTP request
function makeRequest(endpoint, data = null) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, CONFIG.target);
    const startTime = performance.now();
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTest/1.0'
      }
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.totalRequests++;
        results.responseTimes.push(responseTime);
        
        if (!results.statusCodes[res.statusCode]) {
          results.statusCodes[res.statusCode] = 0;
        }
        results.statusCodes[res.statusCode]++;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successfulRequests++;
        } else if (res.statusCode === 429) {
          results.rateLimitedRequests++;
          console.log('🚨 Rate limited request to', endpoint);
        } else {
          results.failedRequests++;
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      results.totalRequests++;
      results.failedRequests++;
      results.responseTimes.push(responseTime);
      results.errors.push(error.message);
      
      console.log('❌ Request failed:', error.message);
      resolve({ error: error.message, responseTime });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Simulate a user making requests
async function simulateUser(userId) {
  console.log(`👤 User ${userId} started`);
  
  const endpointsToTest = [
    ...CONFIG.endpoints,
    ...Array(3).fill('/api/config') // Hit config more frequently
  ];
  
  for (let i = 0; i < endpointsToTest.length; i++) {
    const endpoint = endpointsToTest[i];
    const data = endpoint === '/api/auth/send-magic-link' ? 
      { email: `user${userId}_${i}@example.com` } : null;
    
    try {
      const result = await makeRequest(endpoint, data);
      if (result.statusCode === 429) {
        console.log(`⚠️  User ${userId} rate limited on ${endpoint}`);
      }
    } catch (error) {
      console.log(`❌ User ${userId} error on ${endpoint}:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`👤 User ${userId} finished`);
}

// Run load test
async function runLoadTest() {
  console.log('\n🏃 Starting load test...');
  const startTime = performance.now();
  
  // Create concurrent users
  const userPromises = [];
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    userPromises.push(simulateUser(i + 1));
  }
  
  // Run for specified duration
  setTimeout(() => {
    console.log('\n⏰ Load test duration completed');
  }, CONFIG.duration * 1000);
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  const endTime = performance.now();
  results.totalTime = (endTime - startTime) / 1000; // seconds
  
  // Print results
  printResults();
}

// Print test results
function printResults() {
  console.log('\n📊 === LOAD TEST RESULTS ===');
  console.log(`📈 Total Requests: ${results.totalRequests}`);
  console.log(`✅ Successful: ${results.successfulRequests}`);
  console.log(`❌ Failed: ${results.failedRequests}`);
  console.log(`🚨 Rate Limited: ${results.rateLimitedRequests}`);
  console.log(`⏱️  Total Time: ${results.totalTime.toFixed(2)}s`);
  
  if (results.responseTimes.length > 0) {
    const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    const minResponseTime = Math.min(...results.responseTimes);
    const maxResponseTime = Math.max(...results.responseTimes);
    
    console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`⏱️  Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`⏱️  Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
  }
  
  console.log('\n📊 Status Codes:');
  Object.entries(results.statusCodes).forEach(([code, count]) => {
    console.log(`   ${code}: ${count} requests`);
  });
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    const uniqueErrors = [...new Set(results.errors)];
    uniqueErrors.slice(0, 5).forEach(error => {
      const count = results.errors.filter(e => e === error).length;
      console.log(`   ${error} (${count} times)`);
    });
    if (uniqueErrors.length > 5) {
      console.log(`   ... and ${uniqueErrors.length - 5} more error types`);
    }
  }
  
  // Security assessment
  console.log('\n🛡️  === SECURITY ASSESSMENT ===');
  if (results.rateLimitedRequests > 0) {
    console.log('✅ Rate limiting is working -', results.rateLimitedRequests, 'requests were rate limited');
  } else {
    console.log('⚠️  No rate limiting detected - consider adjusting rate limit thresholds for testing');
  }
  
  const successRate = (results.successfulRequests / Math.max(1, results.totalRequests)) * 100;
  console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate > 80) {
    console.log('✅ System is handling load well');
  } else if (successRate > 50) {
    console.log('⚠️  System is under stress but still functional');
  } else {
    console.log('❌ System is struggling under load');
  }
  
  console.log('\n📋 Test completed at:', new Date().toISOString());
}

// Run the test
runLoadTest().catch(error => {
  console.error('💥 Load test failed:', error);
  process.exit(1);
});
