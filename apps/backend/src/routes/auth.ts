import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
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
      path: '/',
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
    // Get session token from cookie
    const sessionToken = req.cookies['better-auth.session_token'];

    if (!sessionToken) {
      res.json({
        success: true,
        authenticated: false,
        session: null,
      });
      return;
    }

    // Verify session directly from database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      res.json({
        success: true,
        authenticated: false,
        session: null,
      });
      return;
    }

    res.json({
      success: true,
      authenticated: true,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          emailVerified: session.user.emailVerified,
          image: session.user.image,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
        }
      },
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

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user.name);

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
      path: '/',
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

/**
 * Send password reset email using multiple providers with fallback
 */
async function sendPasswordResetEmail(email: string, resetToken: string, userName?: string | null): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const emailContent = {
    to: email,
    subject: 'Reset Your OPPO Password',
    html: generatePasswordResetEmailHTML(resetUrl, userName),
    text: generatePasswordResetEmailText(resetUrl, userName)
  };

  const providers = [
    () => sendWithSendGrid(emailContent),
    () => sendWithResend(emailContent),
    () => sendWithNodemailer(emailContent),
    () => sendWithConsoleLog(emailContent) // Fallback for development
  ];

  let lastError: Error | null = null;
  
  for (const provider of providers) {
    try {
      await provider();
      console.log(`Password reset email sent successfully to ${email} using provider`);
      return;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Email provider failed:`, error);
      continue;
    }
  }
  
  // If all providers fail, still don't throw to prevent the API from failing
  console.error('All email providers failed:', lastError);
}

/**
 * SendGrid email provider
 */
async function sendWithSendGrid(emailContent: any): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }
  
  // Dynamic import to avoid requiring SendGrid in development
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
      ...emailContent,
      from: process.env.FROM_EMAIL || 'noreply@oppo.com',
    });
  } catch (error) {
    throw new Error(`SendGrid failed: ${error}`);
  }
}

/**
 * Resend email provider
 */
async function sendWithResend(emailContent: any): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured');
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...emailContent,
        from: process.env.FROM_EMAIL || 'OPPO <noreply@oppo.com>',
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Resend failed: ${error}`);
  }
}

/**
 * Nodemailer with SMTP (generic provider)
 */
async function sendWithNodemailer(emailContent: any): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration not complete');
  }
  
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      ...emailContent,
      from: process.env.FROM_EMAIL || 'OPPO <noreply@oppo.com>',
    });
  } catch (error) {
    throw new Error(`Nodemailer failed: ${error}`);
  }
}

/**
 * Console log fallback (development)
 */
async function sendWithConsoleLog(emailContent: any): Promise<void> {
  console.log('\n=== PASSWORD RESET EMAIL ===');
  console.log(`To: ${emailContent.to}`);
  console.log(`Subject: ${emailContent.subject}`);
  console.log(`Content:\n${emailContent.text}`);
  console.log('===============================\n');
}

/**
 * Generate HTML email template
 */
function generatePasswordResetEmailHTML(resetUrl: string, userName?: string | null): string {
  const name = userName || 'User';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset Your OPPO Password</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Reset Your Password</h1>
            </div>
            <div class="content">
                <p>Hello ${name},</p>
                <p>We received a request to reset your password for your OPPO account.</p>
                <p>Click the button below to reset your password:</p>
                <p><a href="${resetUrl}" class="button">Reset Password</a></p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p><strong>This link will expire in 15 minutes.</strong></p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>Best regards,<br>The OPPO Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email template
 */
function generatePasswordResetEmailText(resetUrl: string, userName?: string | null): string {
  const name = userName || 'User';
  
  return `
Hello ${name},

We received a request to reset your password for your OPPO account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
The OPPO Team

---
This is an automated email. Please do not reply to this message.
  `.trim();
}

export default router;