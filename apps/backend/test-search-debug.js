#!/usr/bin/env node

/**
 * Quick test script to check why search is returning mock data
 * This will help us debug the Google API credential issue
 */

const axios = require('axios');

async function testSearchAPI() {
  console.log('🧪 Testing Search API to debug mock data issue...\n');
  
  try {
    const response = await axios.post('http://localhost:3001/api/search/art-opportunities', {
      query: 'artist grants test',
      num: 3
    });
    
    const results = response.data.data.results;
    
    console.log('📊 Search Results:');
    results.slice(0, 2).forEach((result, i) => {
      console.log(`  ${i + 1}. Title: ${result.title.substring(0, 50)}...`);
      console.log(`     Domain: ${result.domain}`);
      console.log(`     URL: ${result.link.substring(0, 50)}...`);
    });
    
    // Check if these are mock results
    const isMockData = results.some(r => 
      r.domain?.includes('artscouncil.org') || 
      r.domain?.includes('artistsnetwork.com') ||
      r.snippet?.includes('Discover exciting')
    );
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   Mock Data Detected: ${isMockData ? '❌ YES' : '✅ NO'}`);
    console.log(`   Total Results: ${results.length}`);
    console.log(`   Search Time: ${response.data.data.searchTime}ms`);
    
    if (isMockData) {
      console.log('\n❌ ISSUE: Still returning mock data!');
      console.log('   Check server logs for debug information');
      console.log('   Look for "🔍 Google Search Config Debug:" messages');
    } else {
      console.log('\n✅ SUCCESS: Real Google search results!');
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is the backend running? (npm run dev)');
    console.log('2. Check if server is on port 3001');
    console.log('3. Verify API endpoint: POST /api/search/art-opportunities');
  }
}

testSearchAPI();