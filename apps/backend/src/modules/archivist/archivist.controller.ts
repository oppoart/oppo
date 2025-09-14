import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus, 
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ArchivistService } from './archivist.service';

@ApiTags('archivist')
@Controller('archivist')
export class ArchivistController {
  private readonly logger = new Logger(ArchivistController.name);

  constructor(private readonly archivistService: ArchivistService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'archivist' };
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Get all opportunities with filtering' })
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

      const opportunities = await this.archivistService.getOpportunities(filters);
      return {
        success: true,
        data: opportunities,
      };
    } catch (error) {
      this.logger.error('Get opportunities failed', error);
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

  @Get('opportunities/high-relevance')
  @ApiOperation({ summary: 'Get high relevance opportunities' })
  @ApiResponse({ status: 200, description: 'High relevance opportunities retrieved successfully' })
  async getHighRelevanceOpportunities(@Query('threshold') threshold?: string) {
    try {
      const thresholdValue = threshold ? parseFloat(threshold) : 0.7;
      const opportunities = await this.archivistService.getOpportunities({
        relevanceScore: { gte: thresholdValue }
      });
      
      return {
        success: true,
        data: opportunities,
      };
    } catch (error) {
      this.logger.error('Get high relevance opportunities failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve high relevance opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('opportunities/upcoming-deadlines')
  @ApiOperation({ summary: 'Get opportunities with upcoming deadlines' })
  @ApiResponse({ status: 200, description: 'Upcoming deadline opportunities retrieved successfully' })
  async getUpcomingDeadlines(@Query('days') days?: string) {
    try {
      const daysAhead = days ? parseInt(days) : 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const opportunities = await this.archivistService.getOpportunities({
        deadline: {
          gte: new Date(),
          lte: futureDate
        }
      });
      
      return {
        success: true,
        data: opportunities,
      };
    } catch (error) {
      this.logger.error('Get upcoming deadlines failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve upcoming deadline opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Get('opportunities/with-stats')
  @ApiOperation({ summary: 'Get opportunities with statistics' })
  @ApiResponse({ status: 200, description: 'Opportunities with stats retrieved successfully' })
  async getOpportunitiesWithStats() {
    try {
      const opportunities = await this.archivistService.getOpportunities();
      
      return {
        success: true,
        data: opportunities,
      };
    } catch (error) {
      this.logger.error('Get opportunities with stats failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve opportunities with stats',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('opportunities/:id')
  @ApiOperation({ summary: 'Get specific opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity retrieved successfully' })
  async getOpportunity(@Param('id') id: string) {
    try {
      const opportunity = await this.archivistService.getOpportunityById(id);
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
      this.logger.error(`Get opportunity ${id} failed`, error);
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

  @Post('opportunities')
  @ApiOperation({ summary: 'Create new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  async createOpportunity(@Body() opportunity: any) {
    try {
      const result = await this.archivistService.storeOpportunity(opportunity);
      return {
        success: true,
        data: result,
        message: 'Opportunity created successfully',
      };
    } catch (error) {
      this.logger.error('Create opportunity failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create opportunity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('opportunities/bulk')
  @ApiOperation({ summary: 'Bulk create opportunities' })
  @ApiResponse({ status: 201, description: 'Opportunities created successfully' })
  async bulkCreateOpportunities(@Body() body: { opportunities: any[] }) {
    try {
      const { opportunities } = body;
      let created = 0;
      let duplicates = 0;
      const errors: any[] = [];

      for (const opportunity of opportunities) {
        try {
          await this.archivistService.storeOpportunity(opportunity);
          created++;
        } catch (error) {
          if (error.message.includes('duplicate')) {
            duplicates++;
          } else {
            errors.push({ opportunity: opportunity.title, error: error.message });
          }
        }
      }

      return {
        success: true,
        data: {
          created,
          duplicates,
          errors,
        },
        message: `Bulk operation completed: ${created} created, ${duplicates} duplicates, ${errors.length} errors`,
      };
    } catch (error) {
      this.logger.error('Bulk create opportunities failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to bulk create opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('opportunities/:id')
  @ApiOperation({ summary: 'Update opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated successfully' })
  async updateOpportunity(@Param('id') id: string, @Body() updates: any) {
    try {
      const opportunity = await this.archivistService.updateOpportunity(id, updates);
      return {
        success: true,
        data: opportunity,
        message: 'Opportunity updated successfully',
      };
    } catch (error) {
      this.logger.error(`Update opportunity ${id} failed`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update opportunity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('opportunities/:id')
  @ApiOperation({ summary: 'Delete opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted successfully' })
  async deleteOpportunity(@Param('id') id: string) {
    try {
      await this.archivistService.deleteOpportunity(id);
      return {
        success: true,
        message: 'Opportunity deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Delete opportunity ${id} failed`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete opportunity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
