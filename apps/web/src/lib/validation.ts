import { z } from 'zod';

// Artist medium/category options
export const artistMediums = [
  'generative art',
  'textile art',
  'new media art',
  'AI art',
  'digital art',
  'traditional art',
  'fine art',
  'sculpture',
  'painting',
  'photography',
  'performance art',
  'installation art',
  'video art',
  'interactive art',
  'other',
] as const;

// Profile validation schemas matching backend
export const profileNameSchema = z
  .string()
  .min(1, 'Profile name is required')
  .max(100, 'Profile name must be less than 100 characters')
  .trim();

export const profileBioSchema = z
  .string()
  .max(3000, 'Bio must be less than 3000 characters')
  .optional();

export const profileStatementSchema = z
  .string()
  .max(5000, 'Artist statement must be less than 5000 characters')
  .optional();

export const profileSkillsSchema = z
  .array(z.string().min(1, 'Skill cannot be empty'))
  .max(20, 'Maximum 20 skills allowed')
  .default([]);

export const profileInterestsSchema = z
  .array(z.string().min(1, 'Interest cannot be empty'))
  .max(20, 'Maximum 20 interests allowed')
  .default([]);

export const profileExperienceSchema = z
  .string()
  .max(500, 'Experience must be less than 500 characters')
  .optional();

export const profileLocationSchema = z
  .string()
  .max(100, 'Location must be less than 100 characters')
  .optional();

export const profileWebsiteSchema = z
  .string()
  .url('Please enter a valid URL (e.g., https://example.com)')
  .or(z.literal(''))
  .optional();

export const profilePortfolioSchema = z
  .string()
  .url('Please enter a valid URL (e.g., https://example.com)')
  .or(z.literal(''))
  .optional();

export const profileMediumsSchema = z
  .array(z.enum(artistMediums))
  .min(1, 'At least one medium is required')
  .max(5, 'Maximum 5 mediums allowed');

// Complete profile creation schema
export const createProfileValidationSchema = z.object({
  name: profileNameSchema,
  mediums: profileMediumsSchema,
  bio: profileBioSchema,
  artistStatement: profileStatementSchema,
  skills: profileSkillsSchema,
  interests: profileInterestsSchema,
  experience: profileExperienceSchema,
  location: profileLocationSchema,
  website: profileWebsiteSchema,
  portfolioUrl: profilePortfolioSchema,
});

// Update profile schema (all fields optional)
export const updateProfileValidationSchema = createProfileValidationSchema.partial();

// Auth validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const loginValidationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional().default(false),
});

// Settings validation schemas
export const apiKeySchema = z
  .string()
  .min(1, 'API key is required')
  .regex(/^[a-zA-Z0-9-_]+$/, 'API key contains invalid characters');

export const settingsValidationSchema = z.object({
  openaiApiKey: apiKeySchema.optional(),
  firecrawlApiKey: apiKeySchema.optional(),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  notificationFrequency: z.enum(['instant', 'daily', 'weekly']).default('daily'),
  opportunityPreferences: z.object({
    minFunding: z.number().min(0).optional(),
    maxFunding: z.number().min(0).optional(),
    locations: z.array(z.string()).optional(),
    types: z.array(z.string()).optional(),
  }).optional(),
});

// Validation helper functions
export const validateField = <T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: boolean; error?: string; data?: T } => {
  try {
    const data = schema.parse(value);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors[0]?.message || 'Validation failed' 
      };
    }
    return { 
      success: false, 
      error: 'Validation failed' 
    };
  }
};

// Format validation errors for display
export const formatValidationError = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      errors[path] = err.message;
    }
  });
  
  return errors;
};

// Check if a URL is valid
export const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate and format skills/interests array
export const validateTagArray = (
  tags: string[], 
  maxCount = 20,
  fieldName = 'tags'
): { valid: boolean; error?: string; sanitized: string[] } => {
  // Remove empty strings and trim whitespace
  const sanitized = tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  // Check for duplicates
  const uniqueTags = [...new Set(sanitized)];
  if (uniqueTags.length !== sanitized.length) {
    return {
      valid: false,
      error: `Duplicate ${fieldName} are not allowed`,
      sanitized: uniqueTags,
    };
  }
  
  // Check count
  if (sanitized.length > maxCount) {
    return {
      valid: false,
      error: `Maximum ${maxCount} ${fieldName} allowed`,
      sanitized: sanitized.slice(0, maxCount),
    };
  }
  
  // Check individual tag length
  const invalidTag = sanitized.find(tag => tag.length > 50);
  if (invalidTag) {
    return {
      valid: false,
      error: `Each ${fieldName.slice(0, -1)} must be less than 50 characters`,
      sanitized,
    };
  }
  
  return {
    valid: true,
    sanitized,
  };
};

// Types derived from schemas
export type CreateProfileValidation = z.infer<typeof createProfileValidationSchema>;
export type UpdateProfileValidation = z.infer<typeof updateProfileValidationSchema>;
export type LoginValidation = z.infer<typeof loginValidationSchema>;
export type SettingsValidation = z.infer<typeof settingsValidationSchema>;