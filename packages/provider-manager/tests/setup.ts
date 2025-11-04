/**
 * Test setup
 * Runs before all tests
 */

import { config } from 'dotenv';

// Load environment variables from .env
config();

// Check if API keys are available
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasSerper = !!process.env.SERPER_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_SEARCH_API_KEY;

console.log('🔧 Test Environment Setup:');
console.log(`  OpenAI API Key: ${hasOpenAI ? '✅' : '❌'}`);
console.log(`  Serper API Key: ${hasSerper ? '✅' : '❌'}`);
console.log(`  Anthropic API Key: ${hasAnthropic ? '✅' : '❌'}`);
console.log(`  Google Search API Key: ${hasGoogle ? '✅' : '❌'}`);
console.log('');
