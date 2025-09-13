import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth } from '../../shared/auth/better-auth';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly configService: ConfigService) {}

  async validateSession(headers: any) {
    try {
      const session = await auth.api.getSession({ headers });
      return session;
    } catch (error) {
      this.logger.error('Session validation failed', error);
      return null;
    }
  }

  async getCurrentUser(headers: any) {
    const session = await this.validateSession(headers);
    return session?.user || null;
  }

  async signOut(headers: any) {
    try {
      await auth.api.signOut({ headers });
      return { success: true };
    } catch (error) {
      this.logger.error('Sign out failed', error);
      throw error;
    }
  }

  async signUp(data: { email: string; password: string; name?: string }, headers: any) {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name || data.email.split('@')[0],
        },
        headers,
      });
      this.logger.log('User signed up successfully', { email: data.email });
      return result;
    } catch (error) {
      this.logger.error('Sign up failed', error);
      throw error;
    }
  }

  async signIn(data: { email: string; password: string }, headers: any) {
    try {
      const result = await auth.api.signInEmail({
        body: {
          email: data.email,
          password: data.password,
        },
        headers,
      });
      this.logger.log('User signed in successfully', { email: data.email });
      return result;
    } catch (error) {
      this.logger.error('Sign in failed', error);
      throw error;
    }
  }
}
