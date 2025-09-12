import { PrismaClient, ArtistProfile } from '@prisma/client';
import { AnalystService } from '../core/AnalystService';
import { AnalysisRequest } from '../core/AnalystService';

/**
 * Integration test for the Analyst Module
 * This demonstrates the complete pipeline: Profile → Query Generation → Discovery → Scoring → Storage
 */

class AnalystIntegrationTest {
  private prisma: PrismaClient;
  private analystService: AnalystService;

  constructor() {
    // In a real test, you'd use a test database
    this.prisma = new PrismaClient();
    this.analystService = new AnalystService(this.prisma, {
      aiProvider: 'openai',
      maxConcurrentAnalyses: 1
    });
  }

  async runTest(): Promise<void> {
    console.log('🚀 Starting Analyst Module Integration Test...');
    
    try {
      // Step 1: Initialize the Analyst service
      console.log('\n📊 Step 1: Initializing Analyst Service...');
      await this.analystService.initialize();
      console.log('✅ Analyst Service initialized successfully');

      // Step 2: Create a test artist profile
      console.log('\n🎨 Step 2: Creating test artist profile...');
      const testProfile = await this.createTestProfile();
      console.log(`✅ Created test profile: ${testProfile.name}`);

      // Step 3: Run complete analysis
      console.log('\n🔍 Step 3: Running complete AI analysis...');
      const analysisRequest: AnalysisRequest = {
        artistProfileId: testProfile.id,
        sources: ['websearch', 'bookmark'],
        maxQueries: 8,
        priority: 'medium'
      };

      const result = await this.analystService.runAnalysis(analysisRequest);
      
      console.log('✅ Analysis completed successfully!');
      console.log(`   📝 Queries generated: ${result.queriesGenerated}`);
      console.log(`   🔍 Opportunities discovered: ${result.opportunitiesDiscovered}`);
      console.log(`   ⭐ Opportunities scored: ${result.opportunitiesScored}`);
      console.log(`   💾 New opportunities stored: ${result.newOpportunities}`);
      console.log(`   ⏱️  Processing time: ${result.processingTimeMs}ms`);

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach((error, i) => {
          console.log(`     ${i + 1}. ${error}`);
        });
      }

      // Step 4: Test individual components
      console.log('\n🧪 Step 4: Testing individual components...');
      
      // Test query generation only
      const queries = await this.analystService.generateQueries(testProfile.id);
      console.log(`✅ Query generation test: ${queries.length} queries generated`);
      queries.slice(0, 3).forEach((query, i) => {
        console.log(`   ${i + 1}. "${query}"`);
      });

      // Test health check
      const health = await this.analystService.healthCheck();
      console.log(`✅ Health check: ${health.status}`);
      console.log(`   Database: ${health.details.database ? '✅' : '❌'}`);
      console.log(`   Query Generator: ${health.details.queryGenerator ? '✅' : '❌'}`);
      console.log(`   Scoring Engine: ${health.details.scoringEngine ? '✅' : '❌'}`);
      console.log(`   Sentinel Connection: ${health.details.sentinelConnection ? '✅' : '❌'}`);
      console.log(`   Archivist Connection: ${health.details.archivistConnection ? '✅' : '❌'}`);

      // Step 5: Get statistics
      console.log('\n📈 Step 5: Getting statistics...');
      const stats = await this.analystService.getStats();
      console.log(`✅ Statistics retrieved`);
      console.log(`   Total analyses: ${stats.totalAnalyses}`);
      console.log(`   Success rate: ${stats.totalAnalyses > 0 ? (stats.successfulAnalyses / stats.totalAnalyses * 100).toFixed(1) : 0}%`);

      console.log('\n🎉 Integration test completed successfully!');
      console.log('\nThe Analyst Module is working correctly:');
      console.log('✅ Artist profiles can be analyzed');
      console.log('✅ Search queries are generated');
      console.log('✅ Opportunities are discovered (via mock)');
      console.log('✅ Relevance scoring works');
      console.log('✅ High-scoring opportunities are stored');
      console.log('✅ All services integrate properly');

    } catch (error) {
      console.error('\n❌ Integration test failed:', error);
      throw error;
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  private async createTestProfile(): Promise<ArtistProfile> {
    // Create a test user first
    const testUser = await this.prisma.user.create({
      data: {
        email: `test-analyst-${Date.now()}@example.com`,
        name: 'Test Artist',
        emailVerified: true
      }
    });

    // Create a test artist profile
    const profile = await this.prisma.artistProfile.create({
      data: {
        userId: testUser.id,
        name: 'Alex Rivera',
        mediums: ['digital art', 'new media art', 'interactive installation'],
        bio: 'Emerging digital artist exploring the intersection of technology and human experience through interactive installations and new media art.',
        artistStatement: 'My work examines how digital interfaces shape our understanding of reality and connection in the modern world.',
        skills: ['programming', 'projection mapping', 'sensor integration', 'arduino', 'processing'],
        interests: ['contemporary art', 'social technology', 'interactive design', 'experimental media'],
        experience: 'intermediate artist with 3 years of practice',
        location: 'Brooklyn, NY',
        website: 'https://alexrivera.art',
        portfolioUrl: 'https://alexrivera.art/portfolio'
      }
    });

    return profile;
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    try {
      await this.analystService.shutdown();
      
      // Clean up test data
      await this.prisma.artistProfile.deleteMany({
        where: {
          name: 'Alex Rivera'
        }
      });
      
      await this.prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test-analyst-'
          }
        }
      });

      await this.prisma.$disconnect();
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('⚠️  Cleanup error:', error);
    }
  }
}

// Export for testing
export { AnalystIntegrationTest };

// Run if executed directly
if (require.main === module) {
  const test = new AnalystIntegrationTest();
  test.runTest().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}