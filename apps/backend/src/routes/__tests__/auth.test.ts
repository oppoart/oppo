import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth';
import { errorHandler } from '../../middleware/error-handler';

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../lib/prisma', () => mockPrisma);

// Mock crypto
const mockCrypto = {
  randomUUID: jest.fn(() => 'mock-uuid'),
};
global.crypto = mockCrypto as any;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'mock-uuid',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should reject login with invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or user not found.');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'better-auth.session_token=test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful.');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should request password reset successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordResetToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'mock-uuid',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });

    it('should handle non-existent user gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link');
    });
  });

  describe('POST /api/auth/verify-reset-token', () => {
    it('should verify valid reset token', async () => {
      const mockResetToken = {
        id: 'token-1',
        token: 'valid-token',
        used: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);

      const response = await request(app)
        .post('/api/auth/verify-reset-token')
        .send({ 
          token: 'valid-token',
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject expired reset token', async () => {
      const mockResetToken = {
        id: 'token-1',
        token: 'expired-token',
        used: false,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);

      const response = await request(app)
        .post('/api/auth/verify-reset-token')
        .send({ 
          token: 'expired-token',
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired reset token.');
    });
  });
});