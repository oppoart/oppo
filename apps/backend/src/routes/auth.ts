import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { auth } from '../lib/better-auth';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import prisma from '../lib/prisma';

const router: Router = Router();

// Rate limiting for auth endpoints - more restrictive than general API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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

export default router;