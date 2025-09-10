import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../lib/better-auth';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { authRateLimitConfig } from '../config/env';
import { validate } from '../middleware/validation';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router: Router = Router();

// Rate limiting for auth endpoints - more restrictive than general API
const authLimiter = rateLimit(authRateLimitConfig);

// Validation schemas
const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address').toLowerCase(),
});

/**
 * POST /api/auth/login
 * Email-only sign in (keeping original endpoint name for compatibility)
 */
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
      return;
    }

    // Find user by email directly in the database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or user not found.',
      });
      return;
    }

    // Create a session manually in the database
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: expiresAt,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null,
      },
    });

    // Set the session cookie
    res.cookie('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Sign out user
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get session token from cookie
    const sessionToken = req.cookies['better-auth.session_token'];

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    // Clear the session cookie
    res.clearCookie('better-auth.session_token');

    res.json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      });
      return;
    }

    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get user route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    res.json({
      success: true,
      authenticated: !!session,
      session: session || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({
      success: true,
      authenticated: false,
      session: null,
    });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request a password reset token (for future password-based auth)
 */
router.post('/request-password-reset', authLimiter, validate({ body: requestPasswordResetSchema }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any existing reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { 
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() }
      },
      data: { used: true },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Send email with reset token
    // For now, just log it (in production, you'd send an email)
    console.log(`Password reset requested for ${email}`);
    console.log(`Reset token: ${resetToken}`);
    console.log(`Reset URL: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request.',
    });
  }
});

/**
 * POST /api/auth/verify-reset-token
 * Verify if a password reset token is valid
 */
router.post('/verify-reset-token', authLimiter, validate({ body: resetPasswordSchema }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body;

    // Find the reset token
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetTokenRecord || 
        resetTokenRecord.used || 
        resetTokenRecord.expiresAt < new Date() ||
        resetTokenRecord.user.email !== email) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Reset token is valid.',
      user: {
        email: resetTokenRecord.user.email,
        name: resetTokenRecord.user.name,
      },
    });
  } catch (error) {
    console.error('Reset token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset token.',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token (placeholder for future password-based auth)
 */
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body;

    // Find and validate the reset token
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetTokenRecord || 
        resetTokenRecord.used || 
        resetTokenRecord.expiresAt < new Date() ||
        resetTokenRecord.user.email !== email) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.',
      });
      return;
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { used: true },
    });

    // For now, since we're using email-only auth, just create a new session
    // In a password-based system, you'd update the password here
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.session.create({
      data: {
        userId: resetTokenRecord.user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null,
      },
    });

    // Set session cookie
    res.cookie('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      success: true,
      message: 'Password reset successful. You are now logged in.',
      user: {
        id: resetTokenRecord.user.id,
        email: resetTokenRecord.user.email,
        name: resetTokenRecord.user.name,
        emailVerified: resetTokenRecord.user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
    });
  }
});

export default router;