import { Controller, Get, Put, Body, UseGuards, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User profile retrieved successfully' })
  async getProfile(@Req() request: Request) {
    const userId = (request as any).user.id;
    const user = await this.usersService.findById(userId);
    
    return {
      success: true,
      data: user,
    };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Preferences updated successfully' })
  async updatePreferences(@Req() request: Request, @Body() preferences: any) {
    const userId = (request as any).user.id;
    const user = await this.usersService.updatePreferences(userId, preferences);
    
    return {
      success: true,
      message: 'Preferences updated successfully',
      data: user,
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated successfully' })
  async updateSettings(@Req() request: Request, @Body() settings: any) {
    const userId = (request as any).user.id;
    const user = await this.usersService.updateSettings(userId, settings);
    
    return {
      success: true,
      message: 'Settings updated successfully',
      data: user,
    };
  }
}
