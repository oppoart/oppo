import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import prisma from '../../shared/prisma';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
