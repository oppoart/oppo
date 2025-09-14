import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Req,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ResearchService } from './research.service';

// Decorator to make endpoints public
export const Public = () => SetMetadata('isPublic', true);

@ApiTags('research')
@Controller('research')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ResearchController {
  private readonly logger = new Logger(ResearchController.name);

  constructor(private readonly researchService: ResearchService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return { status: 'ok', module: 'research' };
  }

  @Get('sessions/:profileId')
  @Public()
  @ApiOperation({ summary: 'Get active research sessions for a profile' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully' })
  async getActiveSessions(
    @Param('profileId') profileId: string
  ) {
    try {
      const sessions = await this.researchService.getActiveSessions(profileId);
      
      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      this.logger.error('Failed to get active sessions', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get active sessions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('start')
  @Public()
  @ApiOperation({ summary: 'Start a research service' })
  @ApiResponse({ status: 201, description: 'Service started successfully' })
  async startService(
    @Body() body: {
      serviceId: string;
      profileId: string;
      options?: any;
    }
  ) {
    try {
      const result = await this.researchService.startService(
        body.serviceId,
        body.profileId,
        body.options || {}
      );
      
      return {
        success: true,
        message: 'Service started successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to start service', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to start service',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stop')
  @Public()
  @ApiOperation({ summary: 'Stop a research service' })
  @ApiResponse({ status: 200, description: 'Service stopped successfully' })
  async stopService(
    @Body() body: {
      serviceId: string;
      sessionId: string;
    }
  ) {
    try {
      await this.researchService.stopService(body.serviceId, body.sessionId);
      
      return {
        success: true,
        message: 'Service stopped successfully',
      };
    } catch (error) {
      this.logger.error('Failed to stop service', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to stop service',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status/:serviceId/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Get service status' })
  @ApiResponse({ status: 200, description: 'Service status retrieved successfully' })
  async getServiceStatus(
    @Param('serviceId') serviceId: string,
    @Param('sessionId') sessionId: string
  ) {
    try {
      const status = await this.researchService.getServiceStatus(serviceId, sessionId);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error('Failed to get service status', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get service status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('results/:serviceId/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Get service results' })
  @ApiResponse({ status: 200, description: 'Service results retrieved successfully' })
  async getServiceResults(
    @Param('serviceId') serviceId: string,
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const options = {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      const results = await this.researchService.getServiceResults(serviceId, sessionId, options);
      
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      this.logger.error('Failed to get service results', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get service results',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('fetch-opportunities')
  @ApiOperation({ summary: 'Fetch new opportunities from multiple sources' })
  @ApiResponse({ status: 200, description: 'New opportunities fetched successfully' })
  async fetchOpportunities(
    @Body() body: {
      searchTerms?: string;
      types?: string[];
      minRelevanceScore?: number;
      profileId?: string;
    }
  ) {
    try {
      // This endpoint doesn't require authentication for now since the frontend calls it directly
      const result = await this.researchService.fetchNewOpportunities({
        searchTerms: body.searchTerms || 'art opportunities grants residencies',
        types: body.types || [],
        minRelevanceScore: body.minRelevanceScore || 0.5,
        profileId: body.profileId || 'default-profile'
      });
      
      return {
        success: true,
        data: result.opportunities,
        meta: {
          totalFound: result.totalFound,
          newOpportunities: result.newOpportunities,
          duplicates: result.duplicates,
          duplicateUrls: result.duplicateUrls,
          message: result.message,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch new opportunities', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch new opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('export')
  @Public()
  @ApiOperation({ summary: 'Export research results' })
  @ApiResponse({ status: 200, description: 'Results exported successfully' })
  async exportResults(
    @Body() body: {
      profileId: string;
      serviceIds?: string[];
      format: 'json' | 'csv';
    }
  ) {
    try {
      const exportData = await this.researchService.exportResults(
        body.profileId,
        body.serviceIds,
        body.format
      );
      
      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      this.logger.error('Failed to export results', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to export results',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
