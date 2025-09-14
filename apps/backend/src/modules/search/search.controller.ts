import { Controller, Get, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchService, SearchQuotaExceededError, SearchCredentialsError, SerperSearchError } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'search' };
  }

  @Post('serper')
  @ApiOperation({ summary: 'Perform search using Serper.dev (primary provider)' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully via Serper.dev' })
  async serperSearch(
    @Body() searchDto: {
      query: string;
      num?: number;
      location?: string;
      hl?: string;
      gl?: string;
      start?: number;
    }
  ) {
    try {
      this.logger.log(`Serper search request: "${searchDto.query}"`);

      const searchResults = await this.searchService.searchArtOpportunities(
        searchDto.query,
        {
          num: searchDto.num || 10,
          location: searchDto.location,
          hl: searchDto.hl || 'en',
          gl: searchDto.gl || 'us',
          start: searchDto.start || 0,
        }
      );

      return {
        success: true,
        data: searchResults,
        provider: 'serper_with_fallback'
      };
    } catch (error) {
      this.logger.error('Serper search request failed', error);
      
      // Handle quota exceeded error
      if (error instanceof SearchQuotaExceededError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_QUOTA_EXCEEDED',
            error: 'Search quota exceeded',
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      // Handle credentials error
      if (error instanceof SearchCredentialsError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_CREDENTIALS_ERROR',
            error: 'Search service configuration error',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Handle Serper specific error
      if (error instanceof SerperSearchError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SERPER_SEARCH_ERROR',
            error: 'Serper search service error',
          },
          HttpStatus.BAD_GATEWAY
        );
      }
      
      // Handle other errors
      throw new HttpException(
        {
          success: false,
          message: 'Search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('google')
  @ApiOperation({ summary: 'Perform Google search' })
  @ApiResponse({ status: 200, description: 'Google search results retrieved successfully' })
  async googleSearch(
    @Body() searchDto: {
      query: string;
      num?: number;
      location?: string;
      hl?: string;
      gl?: string;
      start?: number;
    }
  ) {
    try {
      this.logger.log(`Google search request: "${searchDto.query}"`);

      const searchResults = await this.searchService.searchArtOpportunities(
        searchDto.query,
        {
          num: searchDto.num || 10,
          location: searchDto.location,
          hl: searchDto.hl || 'en',
          gl: searchDto.gl || 'us',
          start: searchDto.start || 0,
        }
      );

      return {
        success: true,
        data: searchResults,
      };
    } catch (error) {
      this.logger.error('Google search request failed', error);
      
      // Handle quota exceeded error
      if (error instanceof SearchQuotaExceededError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_QUOTA_EXCEEDED',
            error: 'Search quota exceeded',
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      // Handle credentials error
      if (error instanceof SearchCredentialsError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_CREDENTIALS_ERROR',
            error: 'Search service configuration error',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      
      // Handle other errors
      throw new HttpException(
        {
          success: false,
          message: 'Google search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('yandex')
  @ApiOperation({ summary: 'Perform Yandex search' })
  @ApiResponse({ status: 200, description: 'Yandex search results retrieved successfully' })
  async yandexSearch(
    @Body() searchDto: {
      query: string;
      num?: number;
      location?: string;
      hl?: string;
      start?: number;
    }
  ) {
    try {
      this.logger.log(`Yandex search request: "${searchDto.query}"`);

      // For now, return mock results as Yandex integration is not implemented
      const mockResults = {
        results: [],
        totalResults: 0,
        searchTime: 0,
        query: searchDto.query,
      };

      return {
        success: true,
        data: mockResults,
        message: 'Yandex search not implemented yet - returning mock results',
      };
    } catch (error) {
      this.logger.error('Yandex search request failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Yandex search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('bing')
  @ApiOperation({ summary: 'Perform Bing search' })
  @ApiResponse({ status: 200, description: 'Bing search results retrieved successfully' })
  async bingSearch(
    @Body() searchDto: {
      query: string;
      num?: number;
      location?: string;
      hl?: string;
      start?: number;
    }
  ) {
    try {
      this.logger.log(`Bing search request: "${searchDto.query}"`);

      // For now, return mock results as Bing integration is not implemented
      const mockResults = {
        results: [],
        totalResults: 0,
        searchTime: 0,
        query: searchDto.query,
      };

      return {
        success: true,
        data: mockResults,
        message: 'Bing search not implemented yet - returning mock results',
      };
    } catch (error) {
      this.logger.error('Bing search request failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Bing search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('google/multiple')
  @ApiOperation({ summary: 'Perform multiple Google searches' })
  @ApiResponse({ status: 200, description: 'Multiple search results retrieved successfully' })
  async searchMultipleQueries(
    @Body() searchDto: {
      queries: string[];
      num?: number;
      location?: string;
      hl?: string;
      gl?: string;
      artFocus?: boolean;
    }
  ) {
    try {
      this.logger.log(`Multiple search request for ${searchDto.queries.length} queries`);

      const results = [];
      let successfulQueries = 0;

      for (const query of searchDto.queries) {
        try {
          const searchResults = await this.searchService.searchArtOpportunities(
            query,
            {
              num: searchDto.num || 10,
              location: searchDto.location,
              hl: searchDto.hl || 'en',
              gl: searchDto.gl || 'us',
            }
          );
          results.push(searchResults);
          successfulQueries++;
        } catch (error) {
          this.logger.error(`Search failed for query: ${query}`, error);
          
          // For quota exceeded, credentials, or Serper errors, propagate the error type
          if (error instanceof SearchQuotaExceededError || error instanceof SearchCredentialsError || error instanceof SerperSearchError) {
            let errorCode = 'UNKNOWN_ERROR';
            if (error instanceof SearchQuotaExceededError) {
              errorCode = 'SEARCH_QUOTA_EXCEEDED';
            } else if (error instanceof SearchCredentialsError) {
              errorCode = 'SEARCH_CREDENTIALS_ERROR';
            } else if (error instanceof SerperSearchError) {
              errorCode = 'SERPER_SEARCH_ERROR';
            }
            
            results.push({ 
              query, 
              error: error.message, 
              errorType: error.name,
              code: errorCode
            });
          } else {
            results.push({ query, error: error.message });
          }
        }
      }

      return {
        success: true,
        data: {
          results,
          totalQueries: searchDto.queries.length,
          successfulQueries,
        },
      };
    } catch (error) {
      this.logger.error('Multiple search request failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Multiple search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('art-opportunities')
  @ApiOperation({ summary: 'Search for art opportunities using Serper.dev with Google fallback' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchArtOpportunities(
    @Body() searchDto: {
      query: string;
      num?: number;
      location?: string;
      hl?: string;
      gl?: string;
      start?: number;
    }
  ) {
    try {
      this.logger.log(`Search request: "${searchDto.query}" (${searchDto.num || 100} results)`);

      const searchResults = await this.searchService.searchArtOpportunities(
        searchDto.query,
        {
          num: searchDto.num || 100,
          location: searchDto.location,
          hl: searchDto.hl || 'en',
          gl: searchDto.gl || 'us',
          start: searchDto.start || 0,
        }
      );

      return {
        success: true,
        data: searchResults,
      };
    } catch (error) {
      this.logger.error('Search request failed', error);
      
      // Handle quota exceeded error
      if (error instanceof SearchQuotaExceededError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_QUOTA_EXCEEDED',
            error: 'Search quota exceeded',
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      // Handle credentials error
      if (error instanceof SearchCredentialsError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SEARCH_CREDENTIALS_ERROR',
            error: 'Search service configuration error',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Handle Serper specific error
      if (error instanceof SerperSearchError) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            code: 'SERPER_SEARCH_ERROR',
            error: 'Serper search service error',
          },
          HttpStatus.BAD_GATEWAY
        );
      }
      
      // Handle other errors
      throw new HttpException(
        {
          success: false,
          message: 'Search request failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
