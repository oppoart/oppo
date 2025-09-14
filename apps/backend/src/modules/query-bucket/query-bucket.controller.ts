import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Put,
  Body, 
  Param, 
  UseGuards, 
  Req,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { QueryBucketService, AddQueryRequest } from './query-bucket.service';

@ApiTags('query-bucket')
@Controller('query-bucket')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class QueryBucketController {
  private readonly logger = new Logger(QueryBucketController.name);

  constructor(private readonly queryBucketService: QueryBucketService) {}

  @Get()
  @ApiOperation({ summary: 'Get all queries in user\'s bucket' })
  @ApiResponse({ status: 200, description: 'Queries retrieved successfully' })
  async getQueries(@Req() request: Request) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const queries = await this.queryBucketService.getQueries(userId);
      
      return {
        success: true,
        queries,
      };
    } catch (error) {
      this.logger.error('Failed to get queries from bucket', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve queries from bucket',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Add query to bucket' })
  @ApiResponse({ status: 201, description: 'Query added successfully' })
  async addQuery(
    @Req() request: Request,
    @Body() body: AddQueryRequest
  ) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const query = await this.queryBucketService.addQuery(userId, body);
      
      return {
        success: true,
        message: 'Query added to bucket successfully',
        query,
      };
    } catch (error) {
      this.logger.error('Failed to add query to bucket', error);
      
      if (error.message === 'Query already exists in your bucket') {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to add query to bucket',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Remove query from bucket' })
  @ApiResponse({ status: 200, description: 'Query removed successfully' })
  async removeQuery(
    @Req() request: Request,
    @Body() body: { query: string }
  ) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      await this.queryBucketService.removeQuery(userId, body.query);
      
      return {
        success: true,
        message: 'Query removed from bucket successfully',
      };
    } catch (error) {
      this.logger.error('Failed to remove query from bucket', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to remove query from bucket',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all queries from bucket' })
  @ApiResponse({ status: 200, description: 'Bucket cleared successfully' })
  async clearBucket(@Req() request: Request) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      await this.queryBucketService.clearBucket(userId);
      
      return {
        success: true,
        message: 'Query bucket cleared successfully',
      };
    } catch (error) {
      this.logger.error('Failed to clear query bucket', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to clear query bucket',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update query tags' })
  @ApiResponse({ status: 200, description: 'Query updated successfully' })
  async updateQuery(
    @Req() request: Request,
    @Param('id') queryId: string,
    @Body() body: { tags: string[] }
  ) {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      await this.queryBucketService.updateQuery(userId, queryId, body.tags);
      
      return {
        success: true,
        message: 'Query updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update query', error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update query',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return { status: 'ok', module: 'query-bucket' };
  }
}
