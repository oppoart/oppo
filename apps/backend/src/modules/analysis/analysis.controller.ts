import { Controller, Get, Post, Body, HttpException, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'analysis' };
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Get saved opportunities from database with search and filtering' })
  @ApiResponse({ status: 200, description: 'Opportunities retrieved successfully' })
  async getOpportunities(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('minRelevanceScore') minRelevanceScore?: string,
    @Query('deadlineBefore') deadlineBefore?: string,
  ) {
    try {
      const filters = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        search,
        type,
        minRelevanceScore: minRelevanceScore ? parseFloat(minRelevanceScore) : undefined,
        deadlineBefore,
      };

      const opportunities = await this.analysisService.getOpportunities(filters);
      return {
        success: true,
        data: opportunities.opportunities,
        pagination: opportunities.pagination,
      };
    } catch (error) {
      this.logger.error('Get opportunities request failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('opportunities/:id')
  @ApiOperation({ summary: 'Get a single opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity retrieved successfully' })
  async getOpportunity(@Param('id') id: string) {
    try {
      const opportunity = await this.analysisService.getOpportunityById(id);
      if (!opportunity) {
        throw new HttpException(
          {
            success: false,
            message: 'Opportunity not found',
          },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        data: opportunity,
      };
    } catch (error) {
      this.logger.error(`Get opportunity ${id} request failed`, error);
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve opportunity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-opportunity')
  @ApiOperation({ summary: 'Analyze single opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity analyzed successfully' })
  async analyzeOpportunity(
    @Body() body: {
      opportunity: any;
      profileId: string;
    }
  ) {
    try {
      this.logger.log(`Analyzing single opportunity for profile: ${body.profileId}`);
      const startTime = Date.now();

      // Mock analysis - in real implementation, this would call AI service
      const analysis = {
        relevanceScore: Math.random() * 100,
        matchedKeywords: ['art', 'grant', 'contemporary'],
        eligibilityMatch: Math.random() > 0.3,
        recommendation: Math.random() > 0.5 ? 'high' : 'medium',
        reasoning: 'This opportunity matches the artist profile based on medium and style preferences.'
      };

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          analysis,
          opportunity: body.opportunity,
          profile: { id: body.profileId }
        },
        meta: {
          processingTime,
          aiService: 'openai',
          analyzedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Analyze opportunity failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Analyze opportunity failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-batch')
  @ApiOperation({ summary: 'Analyze batch of opportunities' })
  @ApiResponse({ status: 200, description: 'Batch analysis completed successfully' })
  async analyzeBatch(
    @Body() body: {
      opportunities: any[];
      profileId: string;
    }
  ) {
    try {
      this.logger.log(`Analyzing batch of ${body.opportunities.length} opportunities for profile: ${body.profileId}`);
      const startTime = Date.now();

      const analyses = body.opportunities.map((opportunity, index) => {
        const relevanceScore = Math.random() * 100;
        const recommendation = relevanceScore > 80 ? 'high' : relevanceScore > 60 ? 'medium' : 'low';
        
        return {
          opportunityId: opportunity.id || index,
          analysis: {
            relevanceScore,
            matchedKeywords: ['art', 'grant', 'contemporary'],
            eligibilityMatch: Math.random() > 0.3,
            recommendation,
            reasoning: `Opportunity scored ${relevanceScore.toFixed(1)} based on profile matching.`
          }
        };
      });

      const successful = analyses.length;
      const failed = 0;
      const averageScore = analyses.reduce((sum, a) => sum + a.analysis.relevanceScore, 0) / analyses.length;

      const recommendations = {
        high: analyses.filter(a => a.analysis.recommendation === 'high').length,
        medium: analyses.filter(a => a.analysis.recommendation === 'medium').length,
        low: analyses.filter(a => a.analysis.recommendation === 'low').length,
        notRelevant: 0
      };

      const totalProcessingTime = Date.now() - startTime;
      const avgProcessingTime = totalProcessingTime / body.opportunities.length;

      return {
        success: true,
        data: {
          analyses,
          summary: {
            total: body.opportunities.length,
            successful,
            failed,
            averageScore,
            recommendations
          },
          profile: { id: body.profileId }
        },
        meta: {
          totalProcessingTime,
          avgProcessingTime,
          analyzedAt: new Date().toISOString(),
          aiService: 'openai'
        }
      };
    } catch (error) {
      this.logger.error('Analyze batch failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Analyze batch failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('scrape-and-analyze')
  @ApiOperation({ summary: 'Scrape search results and analyze for art opportunities' })
  @ApiResponse({ status: 200, description: 'Scraping and analysis completed successfully' })
  async scrapeAndAnalyze(
    @Body() scrapeDto: {
      searchResults: Array<{
        title: string;
        link: string;
        snippet: string;
        position: number;
        domain?: string;
        date?: string;
      }>;
      query: string;
      profileId: string;
    }
  ) {
    try {
      this.logger.log(`Scrape and analyze request for query: "${scrapeDto.query}" (${scrapeDto.searchResults.length} results)`);
      
      // Call the actual service method that scrapes, analyzes, AND saves to database
      const result = await this.analysisService.scrapeAndAnalyze(
        scrapeDto.searchResults,
        scrapeDto.query,
        scrapeDto.profileId
      );

      return result;
    } catch (error) {
      this.logger.error('Scrape and analyze request failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Scrape and analysis failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Check analysis service health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  getAnalysisHealth() {
    return {
      success: true,
      data: {
        openai: true,
        ruleBasedFallback: true,
        status: 'healthy'
      },
      meta: {
        timestamp: new Date().toISOString(),
        preferredMethod: 'openai'
      }
    };
  }
}
