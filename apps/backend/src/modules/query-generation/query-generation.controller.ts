import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Req,
  Logger,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { QueryGenerationService } from './query-generation.service';
import {
  QueryGenerationRequest,
  QueryGenerationResponse,
  QueryTemplate,
  QueryGenerationError,
  validateQueryGenerationRequest,
} from '../../types/query-generation';
import { 
  QUERY_TYPES, 
  QUERY_STRATEGIES,
  QueryType,
  QueryStrategy 
} from '../../constants/query.constants';

@Controller('query-generation')
@UseGuards(AuthGuard)
export class QueryGenerationController {
  private readonly logger = new Logger(QueryGenerationController.name);

  constructor(private readonly queryGenerationService: QueryGenerationService) {}

  @Post('generate')
  async generateQueries(
    @Req() request: Request,
    @Body() generateDto: {
      profileId: string;
      queryTypes?: QueryType[];
      strategy?: QueryStrategy;
      maxQueries?: number;
      location?: string;
      locationModifier?: string;
      careerStage?: string;
      customKeywords?: string[];
      excludeKeywords?: string[];
    }
  ): Promise<QueryGenerationResponse> {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      // Validate the request
      const validatedRequest = validateQueryGenerationRequest(generateDto);

      // Verify user owns the profile
      // This should be handled by the service, but we can add a check here too
      
      this.logger.log(`Generating queries for profile ${generateDto.profileId} by user ${userId}`);

      const result = await this.queryGenerationService.generateQueries(validatedRequest);
      
      this.logger.log(`Generated ${result.data.totalQueries} queries in ${result.data.processingTimeMs}ms`);
      
      return result;

    } catch (error) {
      this.logger.error('Query generation failed', error);
      
      if (error instanceof QueryGenerationError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: error.code,
            details: error.details,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Query generation failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('templates')
  async getQueryTemplates(): Promise<{
    success: boolean;
    data: QueryTemplate[];
  }> {
    try {
      const templates = await this.queryGenerationService.getQueryTemplates();
      
      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      this.logger.error('Failed to get query templates', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get query templates',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('types')
  async getQueryTypes(): Promise<{
    success: boolean;
    data: {
      types: typeof QUERY_TYPES;
      strategies: typeof QUERY_STRATEGIES;
    };
  }> {
    return {
      success: true,
      data: {
        types: QUERY_TYPES,
        strategies: QUERY_STRATEGIES,
      },
    };
  }

  @Post('profile/:profileId/quick-generate')
  async quickGenerateQueries(
    @Req() request: Request,
    @Param('profileId') profileId: string,
    @Query('strategy') strategy?: QueryStrategy,
    @Query('maxQueries') maxQueries?: string
  ): Promise<QueryGenerationResponse> {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const quickRequest: QueryGenerationRequest = {
        profileId,
        strategy: strategy || 'semantic',
        maxQueries: maxQueries ? parseInt(maxQueries, 10) : 10,
      };

      return await this.queryGenerationService.generateQueries(quickRequest);

    } catch (error) {
      this.logger.error('Quick query generation failed', error);
      
      if (error instanceof QueryGenerationError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: error.code,
            details: error.details,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Quick query generation failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('profile/:profileId/targeted-generate')
  async targetedGenerateQueries(
    @Req() request: Request,
    @Param('profileId') profileId: string,
    @Body() targetedDto: {
      queryTypes: QueryType[];
      location?: string;
      careerStage?: string;
      customKeywords?: string[];
    }
  ): Promise<QueryGenerationResponse> {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const targetedRequest: QueryGenerationRequest = {
        profileId,
        queryTypes: targetedDto.queryTypes,
        strategy: 'targeted',
        location: targetedDto.location,
        careerStage: targetedDto.careerStage as any,
        customKeywords: targetedDto.customKeywords,
        maxQueries: 15,
      };

      return await this.queryGenerationService.generateQueries(targetedRequest);

    } catch (error) {
      this.logger.error('Targeted query generation failed', error);
      
      if (error instanceof QueryGenerationError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: error.code,
            details: error.details,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Targeted query generation failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}