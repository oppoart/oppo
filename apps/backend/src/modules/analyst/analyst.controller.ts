import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('analyst')
@Controller('analyst')
export class AnalystController {
  @Get('health')
  getHealth() {
    return { status: 'ok', module: 'analyst' };
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
