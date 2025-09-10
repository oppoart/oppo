import request from 'supertest';
import express from 'express';
import profileRoutes from '../profiles';
import { requireAuth } from '../../middleware/auth';
import { errorHandler } from '../../middleware/error-handler';

// Mock prisma
const mockPrisma = {
  artistProfile: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../lib/prisma', () => mockPrisma);

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    };
    next();
  },
}));

describe('Profile Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/profiles', profileRoutes);
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });

  describe('GET /api/profiles', () => {
    it('should get all profiles for authenticated user', async () => {
      const mockProfiles = [
        {
          id: 'profile-1',
          userId: 'user-1',
          name: 'Digital Art Portfolio',
          mediums: ['digital art'],
          bio: 'Test bio',
          skills: ['photoshop'],
          interests: ['ai art'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.artistProfile.findMany.mockResolvedValue(mockProfiles);

      const response = await request(app)
        .get('/api/profiles');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfiles);
      expect(mockPrisma.artistProfile.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('POST /api/profiles', () => {
    it('should create profile successfully', async () => {
      const profileData = {
        name: 'New Portfolio',
        mediums: ['painting'],
      };

      const mockCreatedProfile = {
        id: 'profile-2',
        userId: 'user-1',
        ...profileData,
        bio: null,
        skills: [],
        interests: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.artistProfile.create.mockResolvedValue(mockCreatedProfile);

      const response = await request(app)
        .post('/api/profiles')
        .send(profileData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Portfolio');
      expect(mockPrisma.artistProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          ...profileData,
        },
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({
          mediums: ['painting'], // Missing name
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/profiles/:id', () => {
    it('should update profile successfully', async () => {
      const profileId = 'profile-1';
      const updates = {
        name: 'Updated Portfolio',
        bio: 'Updated bio',
      };

      const mockExistingProfile = {
        id: profileId,
        userId: 'user-1',
      };

      const mockUpdatedProfile = {
        ...mockExistingProfile,
        ...updates,
        updatedAt: new Date(),
      };

      mockPrisma.artistProfile.findUnique.mockResolvedValue(mockExistingProfile);
      mockPrisma.artistProfile.update.mockResolvedValue(mockUpdatedProfile);

      const response = await request(app)
        .put(`/api/profiles/${profileId}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Portfolio');
    });

    it('should return 404 for non-existent profile', async () => {
      const profileId = 'non-existent';
      
      mockPrisma.artistProfile.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/profiles/${profileId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized profile access', async () => {
      const profileId = 'profile-1';
      
      const mockProfile = {
        id: profileId,
        userId: 'other-user', // Different user
      };

      mockPrisma.artistProfile.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .put(`/api/profiles/${profileId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/profiles/:id', () => {
    it('should delete profile successfully', async () => {
      const profileId = 'profile-1';
      
      const mockProfile = {
        id: profileId,
        userId: 'user-1',
      };

      mockPrisma.artistProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.artistProfile.delete.mockResolvedValue(mockProfile);

      const response = await request(app)
        .delete(`/api/profiles/${profileId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.artistProfile.delete).toHaveBeenCalledWith({
        where: { id: profileId },
      });
    });
  });
});