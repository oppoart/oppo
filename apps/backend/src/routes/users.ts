import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// User preferences/settings schema
const preferencesSchema = z.object({
  // Opportunity matching preferences
  minFundingAmount: z.number().min(0).optional(),
  maxFundingAmount: z.number().min(0).optional(),
  preferredLocations: z.array(z.string()).default([]),
  opportunityTypes: z.array(z.string()).default([]),
  
  // Notification preferences
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  notificationFrequency: z.enum(['immediate', 'daily', 'weekly']).default('daily'),
  
  // AI matching preferences
  minimumMatchScore: z.number().min(0).max(1).default(0.7),
  enableAutoApplication: z.boolean().default(false),
  
  // Application preferences
  applicationStyle: z.enum(['formal', 'casual', 'artistic']).default('formal'),
  includePortfolioLinks: z.boolean().default(true),
  
  // API settings
  openaiApiKey: z.string().optional(),
  webhookUrl: z.string().url().optional(),
}).partial();

const updatePreferencesSchema = z.object({
  preferences: preferencesSchema
});

// Get current user's preferences
router.get('/me/preferences', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true,
        preferences: true,
        settings: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Default preferences structure
    const defaultPreferences = {
      minFundingAmount: undefined,
      maxFundingAmount: undefined,
      preferredLocations: [],
      opportunityTypes: [],
      emailNotifications: true,
      pushNotifications: false,
      notificationFrequency: 'daily' as const,
      minimumMatchScore: 0.7,
      enableAutoApplication: false,
      applicationStyle: 'formal' as const,
      includePortfolioLinks: true,
      
      // UX preferences
      dashboardLayout: 'default' as const,
    };

    // Merge stored preferences with defaults
    const preferences = user.preferences ? 
      { ...defaultPreferences, ...(user.preferences as any) } : 
      defaultPreferences;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        preferences,
        settings: user.settings || {}
      }
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user preferences'
    });
  }
});

// Update user preferences
router.put('/me/preferences', validate({ body: updatePreferencesSchema }), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { preferences } = req.body;

    // Get current user preferences to merge with new ones
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });

    const currentPreferences = (currentUser?.preferences as any) || {};
    const mergedPreferences = { ...currentPreferences, ...preferences };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: mergedPreferences,
        updatedAt: new Date()
      },
      select: { 
        id: true, 
        email: true, 
        name: true,
        preferences: true 
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
        },
        preferences: updatedUser.preferences
      },
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences'
    });
  }
});

// Get user profile with basic info
router.get('/me', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        profiles: {
          select: {
            id: true,
            name: true,
            mediums: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information'
    });
  }
});

export default router;