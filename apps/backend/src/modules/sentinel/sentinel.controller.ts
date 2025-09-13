import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SentinelService } from './sentinel.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ScanSourceDto, AddSourceDto, UpdateSourceDto } from './dto';

@ApiTags('sentinel')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sentinel')
export class SentinelController {
  constructor(private readonly sentinelService: SentinelService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan all configured sources for opportunities' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scan completed successfully' })
  async scanAllSources(@Body() body: { sources?: string[] } = {}) {
    return {
      success: true,
      data: await this.sentinelService.scanAllSources(body.sources),
    };
  }

  @Post('scan/source')
  @ApiOperation({ summary: 'Scan a specific source' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source scanned successfully' })
  async scanSource(@Body() scanSourceDto: ScanSourceDto) {
    return {
      success: true,
      data: await this.sentinelService.scrapeSource(scanSourceDto),
    };
  }

  @Get('sources/status')
  @ApiOperation({ summary: 'Get status of all sources' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source status retrieved' })
  async getSourceStatus() {
    return {
      success: true,
      data: await this.sentinelService.getSources(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get scraping metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved successfully' })
  async getScrapingMetrics() {
    return {
      success: true,
      data: await this.sentinelService.getScrapingHistory(),
    };
  }

  @Post('sources')
  @ApiOperation({ summary: 'Add a new source' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Source added successfully' })
  async addSource(@Body() addSourceDto: AddSourceDto) {
    return {
      success: true,
      data: await this.sentinelService.addSource(addSourceDto),
    };
  }

  @Put('sources/:id')
  @ApiOperation({ summary: 'Update an existing source' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source updated successfully' })
  async updateSource(
    @Param('id') sourceId: string,
    @Body() updateSourceDto: UpdateSourceDto,
  ) {
    return {
      success: true,
      data: await this.sentinelService.updateSource(sourceId, updateSourceDto),
    };
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: 'Remove a source' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source removed successfully' })
  async removeSource(@Param('id') sourceId: string) {
    return {
      success: true,
      data: await this.sentinelService.removeSource(sourceId),
    };
  }
}
