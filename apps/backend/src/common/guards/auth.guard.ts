import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import prisma from '../../shared/prisma';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // Extract session token from cookies
      const sessionToken = request.cookies?.['better-auth.session_token'];
      
      if (!sessionToken) {
        this.logger.warn('Authentication failed: No session token found');
        throw new UnauthorizedException('Authentication required');
      }

      // Look up session directly in the database
      const session = await prisma.session.findFirst({
        where: {
          token: sessionToken,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!session?.user) {
        this.logger.warn('Authentication failed: No valid session found');
        throw new UnauthorizedException('Authentication required');
      }

      // Attach user to request for use in controllers
      (request as any).user = session.user;
      
      return true;
    } catch (error) {
      this.logger.error('Authentication error:', error);
      throw new UnauthorizedException('Invalid session');
    }
  }
}
