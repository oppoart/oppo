import { z } from 'zod';
import { Request } from 'express';
import { BetterAuthSession, BetterAuthUser } from '../lib/better-auth';

// Validation schemas
export const emailSignInSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  emailVerified: z.boolean(),
  image: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Types derived from schemas
export type EmailSignInRequest = z.infer<typeof emailSignInSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;

// Authentication response types
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  session?: BetterAuthSession;
}

export interface AuthError {
  success: false;
  message: string;
  errors?: string[];
}

// Request interface extensions
export interface AuthenticatedRequest extends Omit<Request, 'session'> {
  user?: {
    id: string;
    email: string;
    name?: string | null | undefined;
    emailVerified: boolean;
    image?: string | null | undefined;
    createdAt: Date;
    updatedAt: Date;
  };
  betterAuthSession?: BetterAuthSession;
}