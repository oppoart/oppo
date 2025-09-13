import { Controller, Get, Post, UseGuards, Req, Body, All, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { auth } from '../../shared/auth/better-auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'Current user retrieved successfully' })
  async getCurrentUser(@Req() request: Request) {
    return {
      success: true,
      data: (request as any).user,
    };
  }

  @Post('signout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Sign out current user' })
  @ApiResponse({ status: 200, description: 'User signed out successfully' })
  async signOut(@Req() request: Request) {
    await this.authService.signOut(request.headers);
    return {
      success: true,
      message: 'Signed out successfully',
    };
  }

  @Get('session')
  @ApiOperation({ summary: 'Check session status' })
  @ApiResponse({ status: 200, description: 'Session status retrieved' })
  async getSession(@Req() request: Request) {
    const session = await this.authService.validateSession(request.headers);
    return {
      success: true,
      data: {
        isAuthenticated: !!session,
        user: session?.user || null,
      },
    };
  }

  @Post('sign-up')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async signUp(@Body() signUpDto: { email: string; password: string; name?: string }, @Req() request: Request) {
    const result = await this.authService.signUp(signUpDto, request.headers);
    return {
      success: true,
      data: result,
    };
  }

  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in user' })
  @ApiResponse({ status: 200, description: 'User signed in successfully' })
  async signIn(@Body() signInDto: { email: string; password: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signIn(signInDto, request.headers);
    
    // Set the Better Auth session cookies manually
    if (result.token) {
      response.cookie('better-auth.session_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
    }
    
    return {
      success: true,
      data: result,
    };
  }
}
