import { Controller, Get, Post, Param, Body, UseGuards, Req, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { QueryGenerationService } from '../query-generation/query-generation.service';
import { AnalystService } from './analyst.service';

@ApiTags('analyst')
@Controller('analyst')
export class AnalystController {
  private readonly logger = new Logger(AnalystController.name);

  constructor(
    private readonly queryGenerationService: QueryGenerationService,
    private readonly analystService: AnalystService,
  ) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'analyst' };
  }

  @Post('generate-queries')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate search queries for an artist profile' })
  @ApiResponse({ status: 200, description: 'Queries generated successfully' })
  async generateQueries(
    @Req() request: Request,
    @Body() body: {
      artistProfileId: string;
      maxQueries?: number;
      sourceTypes?: string[];
    }
  ) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.queryGenerationService.generateQueries({
        profileId: body.artistProfileId,
        maxQueries: body.maxQueries || 10,
        strategy: 'semantic',
      });

      return {
        success: true,
        message: 'Queries generated successfully',
        data: {
          queries: result.data.queries.map(q => q.query),
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate queries', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate queries',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze profile quality and completeness' })
  @ApiResponse({ status: 200, description: 'Profile analyzed successfully' })
  async analyzeProfile(
    @Req() request: Request,
    @Body() body: { artistProfileId: string }
  ) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.analystService.analyzeProfileQuality(body.artistProfileId);

      return {
        success: true,
        message: 'Profile analyzed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to analyze profile', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to analyze profile',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats/:profileId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analyst stats for a profile' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getStats(@Param('profileId') profileId: string) {
    // For now, return mock stats
    // TODO: Implement actual analyst stats calculation
    return {
      success: true,
      message: 'Stats retrieved successfully',
      data: {
        profileId,
        totalOpportunities: 0,
        matchedOpportunities: 0,
        successRate: 0,
        lastAnalysis: null,
        recommendations: [],
      },
    };
  }
}
