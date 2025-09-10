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
import { asyncHandler, NotFoundError, ConflictError, ForbiddenError } from '../middleware/error-handler';
import { validate } from '../middleware/validation';

const router: Router = express.Router();

/**
 * GET /api/profiles - Get all artist profiles for authenticated user
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ProfilesApiResponse>) => {
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
  })
);

/**
 * GET /api/profiles/:id - Get specific artist profile
 */
router.get(
  '/:id',
  requireAuth,
  validate({ params: profileParamsSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ProfileApiResponse>) => {
    const userId = req.user!.id;
    const { id } = req.params as z.infer<typeof profileParamsSchema>;

    const profile = await prisma.artistProfile.findUnique({
      where: { 
        id,
        userId, // Ensure user can only access their own profiles
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile');
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  })
);

/**
 * POST /api/profiles - Create new artist profile
 */
router.post(
  '/',
  requireAuth,
  validate({ body: createProfileSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ProfileApiResponse>) => {
    const userId = req.user!.id;
    const profileData = req.body as z.infer<typeof createProfileSchema>;

    // Check if user already has a profile with the same name
    const existingProfile = await prisma.artistProfile.findFirst({
      where: {
        userId,
        name: profileData.name,
      },
    });

    if (existingProfile) {
      throw new ConflictError('A profile with this name already exists');
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
  })
);

/**
 * PUT /api/profiles/:id - Update specific artist profile
 */
router.put(
  '/:id',
  requireAuth,
  validate({ 
    params: profileParamsSchema,
    body: updateProfileSchema 
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ProfileApiResponse>) => {
    const userId = req.user!.id;
    const { id } = req.params as z.infer<typeof profileParamsSchema>;
    const profileData = req.body as z.infer<typeof updateProfileSchema>;

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.artistProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new NotFoundError('Profile');
    }

    if (existingProfile.userId !== userId) {
      throw new ForbiddenError('Access denied: You can only update your own profiles');
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
        throw new ConflictError('A profile with this name already exists');
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
  })
);

/**
 * DELETE /api/profiles/:id - Delete artist profile
 */
router.delete(
  '/:id',
  requireAuth,
  validate({ params: profileParamsSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<Omit<ProfileApiResponse, 'data'>>) => {
    const userId = req.user!.id;
    const { id } = req.params as z.infer<typeof profileParamsSchema>;

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.artistProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new NotFoundError('Profile');
    }

    if (existingProfile.userId !== userId) {
      throw new ForbiddenError('Access denied: You can only delete your own profiles');
    }

    // Delete profile
    await prisma.artistProfile.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  })
);

export default router;