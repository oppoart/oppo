import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus, 
  Logger,
  Res
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LiaisonService } from './liaison.service';

@ApiTags('liaison')
@Controller('liaison')
export class LiaisonController {
  private readonly logger = new Logger(LiaisonController.name);

  constructor(private readonly liaisonService: LiaisonService) {}

  @Get('health')
  getHealth() {
    return {
      success: true,
      data: {
        status: 'healthy',
        details: {
          database: true,
          websocket: true,
          export: true,
        },
      },
    };
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Get opportunities with liaison-specific features' })
  @ApiResponse({ status: 200, description: 'Opportunities retrieved successfully' })
  async getOpportunities(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('organization') organization?: string,
    @Query('relevanceMinScore') relevanceMinScore?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const options = {
        status: status ? status.split(',') : undefined,
        type: type ? type.split(',') : undefined,
        organization,
        relevanceMinScore: relevanceMinScore ? parseFloat(relevanceMinScore) : undefined,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      };

      const result = await this.liaisonService.getOpportunities(options);

      return {
        success: true,
        data: result.opportunities,
        meta: {
          total: result.total,
          page: options.page,
          limit: options.limit,
          hasMore: result.total > (options.page * options.limit),
        },
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

  @Post('opportunities/:id/status')
  @ApiOperation({ summary: 'Update opportunity status' })
  @ApiResponse({ status: 200, description: 'Opportunity status updated successfully' })
  async updateOpportunityStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    try {
      const opportunity = await this.liaisonService.updateOpportunityStatus(id, body.status);

      return {
        success: true,
        data: opportunity,
        message: `Opportunity status updated to ${body.status}`,
      };
    } catch (error) {
      this.logger.error(`Update opportunity status failed for ${id}`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update opportunity status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Capture user feedback' })
  @ApiResponse({ status: 200, description: 'Feedback captured successfully' })
  async captureFeedback(
    @Body() feedback: {
      opportunityId: string;
      action: 'accepted' | 'rejected' | 'saved' | 'applied';
      reason?: string;
    }
  ) {
    try {
      await this.liaisonService.captureFeedback(feedback);

      return {
        success: true,
        message: 'Feedback captured successfully',
      };
    } catch (error) {
      this.logger.error('Capture feedback failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to capture feedback',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('export')
  @ApiOperation({ summary: 'Export opportunities' })
  @ApiResponse({ status: 200, description: 'Opportunities exported successfully' })
  async exportOpportunities(
    @Body() body: {
      filters: {
        status?: string[];
        type?: string[];
        organization?: string[];
        relevanceMinScore?: number;
        deadlineAfter?: string;
        deadlineBefore?: string;
      };
      options: {
        format: 'csv' | 'json';
        filename?: string;
        includeMetadata?: boolean;
      };
    },
    @Res() res: Response
  ) {
    try {
      const exportData = await this.liaisonService.exportOpportunities(
        body.filters,
        body.options
      );

      const filename = body.options.filename || `opportunities-export-${Date.now()}.${body.options.format}`;
      
      if (body.options.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(exportData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(JSON.stringify(exportData, null, 2));
      }
    } catch (error) {
      this.logger.error('Export opportunities failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to export opportunities',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('export/template/:format')
  @ApiOperation({ summary: 'Get export template' })
  @ApiResponse({ status: 200, description: 'Export template retrieved successfully' })
  async getExportTemplate(
    @Param('format') format: 'csv' | 'json',
    @Res() res: Response
  ) {
    try {
      const template = await this.liaisonService.getExportTemplate(format);
      
      const filename = `opportunities-template.${format}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(template);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(JSON.stringify(template, null, 2));
      }
    } catch (error) {
      this.logger.error(`Get export template failed for format ${format}`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get export template',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData() {
    try {
      const dashboardData = await this.liaisonService.getDashboardData();

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      this.logger.error('Get dashboard data failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get dashboard data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get liaison statistics' })
  @ApiResponse({ status: 200, description: 'Liaison statistics retrieved successfully' })
  async getStats() {
    try {
      const stats = await this.liaisonService.getStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Get liaison stats failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get liaison statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
