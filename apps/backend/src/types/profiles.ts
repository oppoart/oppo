import { z } from 'zod';

// Artist category validation
export const artistCategories = [
  'generative art',
  'textile art',
  'new media art',
  'AI art',
  'digital art',
  'traditional art',
  'sculpture',
  'painting',
  'photography',
  'performance art',
  'installation art',
  'video art',
  'interactive art',
  'other'
] as const;

export const artistCategorySchema = z.enum(artistCategories);

// Profile validation schemas
export const createProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(100, 'Profile name must be less than 100 characters'),
  mediums: z.array(artistCategorySchema).min(1, 'At least one medium is required').max(5, 'Maximum 5 mediums allowed'),
  bio: z.string().max(3000, 'Bio must be less than 3000 characters').optional(),
  artistStatement: z.string().max(5000, 'Artist statement must be less than 5000 characters').optional(),
  skills: z.array(z.string()).max(20, 'Maximum 20 skills allowed').default([]),
  interests: z.array(z.string()).max(20, 'Maximum 20 interests allowed').default([]),
  experience: z.string().max(500, 'Experience must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid portfolio URL').optional().or(z.literal('')),
});

export const updateProfileSchema = createProfileSchema.partial();

export const profileParamsSchema = z.object({
  id: z.string().cuid('Invalid profile ID'),
});

// Response schemas
export const profileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  mediums: z.array(z.string()), // Allow any string array for flexibility
  bio: z.string().nullable(),
  artistStatement: z.string().nullable(),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  experience: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  preferences: z.any().nullable(),
  settings: z.any().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Types derived from schemas
export type ArtistCategory = z.infer<typeof artistCategorySchema>;
export type CreateProfileRequest = z.infer<typeof createProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
export type ProfileParams = z.infer<typeof profileParamsSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

// API response types
export interface ProfileApiResponse {
  success: boolean;
  message: string;
  data?: ProfileResponse;
}

export interface ProfilesApiResponse {
  success: boolean;
  message: string;
  data?: ProfileResponse[];
}

export interface ProfileError {
  success: false;
  message: string;
  errors?: string[];
}