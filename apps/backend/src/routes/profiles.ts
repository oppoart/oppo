import express, { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
import {
  createProfileSchema,
  updateProfileSchema,
  profileParamsSchema,
  ProfileApiResponse,
  ProfilesApiResponse,
  ProfileError,
} from '../types/profiles';
import { z } from 'zod';

const router: Router = express.Router();

/**
 * GET /api/profiles - Get all artist profiles for authenticated user
 */
router.get(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response<ProfilesApiResponse | ProfileError>) => {
    try {
      const userId = req.user!.id;

      const profiles = await prisma.artistProfile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        message: 'Profiles retrieved successfully',
        data: profiles,
      });
    } catch (error) {
      console.error('Error fetching profiles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profiles',
      });
    }
  }
);

/**
 * GET /api/profiles/:id - Get specific artist profile
 */
router.get(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response<ProfileApiResponse | ProfileError>) => {
    try {
      const userId = req.user!.id;
      
      // Validate profile ID parameter
      const parseResult = profileParamsSchema.safeParse(req.params);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile ID',
          errors: parseResult.error.errors.map(err => err.message),
        });
        return;
      }

      const { id } = parseResult.data;

      const profile = await prisma.artistProfile.findUnique({
        where: { 
          id,
          userId, // Ensure user can only access their own profiles
        },
      });

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: profile,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
      });
    }
  }
);

/**
 * POST /api/profiles - Create new artist profile
 */
router.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response<ProfileApiResponse | ProfileError>) => {
    try {
      const userId = req.user!.id;

      // Validate request body
      const parseResult = createProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile data',
          errors: parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        });
        return;
      }

      const profileData = parseResult.data;

      // Check if user already has a profile with the same name
      const existingProfile = await prisma.artistProfile.findFirst({
        where: {
          userId,
          name: profileData.name,
        },
      });

      if (existingProfile) {
        res.status(409).json({
          success: false,
          message: 'A profile with this name already exists',
        });
        return;
      }

      // Create new profile
      const newProfile = await prisma.artistProfile.create({
        data: {
          userId,
          name: profileData.name,
          mediums: profileData.mediums,
          bio: profileData.bio || null,
          artistStatement: profileData.artistStatement || null,
          skills: profileData.skills,
          interests: profileData.interests,
          experience: profileData.experience || null,
          location: profileData.location || null,
          website: profileData.website || null,
          portfolioUrl: profileData.portfolioUrl || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: newProfile,
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create profile',
      });
    }
  }
);

/**
 * PUT /api/profiles/:id - Update specific artist profile
 */
router.put(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response<ProfileApiResponse | ProfileError>) => {
    try {
      const userId = req.user!.id;

      // Validate profile ID parameter
      const paramsResult = profileParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile ID',
          errors: paramsResult.error.errors.map(err => err.message),
        });
        return;
      }

      const { id } = paramsResult.data;

      // Validate request body
      const parseResult = updateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile data',
          errors: parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        });
        return;
      }

      const profileData = parseResult.data;

      // Check if profile exists and belongs to user
      const existingProfile = await prisma.artistProfile.findUnique({
        where: { id },
      });

      if (!existingProfile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found',
        });
        return;
      }

      if (existingProfile.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only update your own profiles',
        });
        return;
      }

      // Check for name conflicts if name is being updated
      if (profileData.name && profileData.name !== existingProfile.name) {
        const nameConflict = await prisma.artistProfile.findFirst({
          where: {
            userId,
            name: profileData.name,
            id: { not: id }, // Exclude current profile
          },
        });

        if (nameConflict) {
          res.status(409).json({
            success: false,
            message: 'A profile with this name already exists',
          });
          return;
        }
      }

      // Prepare update data, only include defined fields
      const updateData: any = {};
      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.mediums !== undefined) updateData.mediums = profileData.mediums;
      if (profileData.bio !== undefined) updateData.bio = profileData.bio || null;
      if (profileData.artistStatement !== undefined) updateData.artistStatement = profileData.artistStatement || null;
      if (profileData.skills !== undefined) updateData.skills = profileData.skills;
      if (profileData.interests !== undefined) updateData.interests = profileData.interests;
      if (profileData.experience !== undefined) updateData.experience = profileData.experience || null;
      if (profileData.location !== undefined) updateData.location = profileData.location || null;
      if (profileData.website !== undefined) updateData.website = profileData.website === '' ? null : profileData.website;
      if (profileData.portfolioUrl !== undefined) updateData.portfolioUrl = profileData.portfolioUrl === '' ? null : profileData.portfolioUrl;

      // Update profile
      const updatedProfile = await prisma.artistProfile.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
);

/**
 * DELETE /api/profiles/:id - Delete artist profile
 */
router.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response<Omit<ProfileApiResponse, 'data'> | ProfileError>) => {
    try {
      const userId = req.user!.id;

      // Validate profile ID parameter
      const parseResult = profileParamsSchema.safeParse(req.params);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid profile ID',
          errors: parseResult.error.errors.map(err => err.message),
        });
        return;
      }

      const { id } = parseResult.data;

      // Check if profile exists and belongs to user
      const existingProfile = await prisma.artistProfile.findUnique({
        where: { id },
      });

      if (!existingProfile) {
        res.status(404).json({
          success: false,
          message: 'Profile not found',
        });
        return;
      }

      if (existingProfile.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own profiles',
        });
        return;
      }

      // Delete profile
      await prisma.artistProfile.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Profile deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete profile',
      });
    }
  }
);

export default router;