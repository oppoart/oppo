/**
 * Authentication Validation Schemas
 * Centralized validation for authentication-related operations
 */

import { z } from 'zod';
import { VALIDATION_PATTERNS, FIELD_LIMITS, PASSWORD_REQUIREMENTS } from '../config/validation.config';
import { VALIDATION_MESSAGES } from '../config/validation.config';

// Password validation helper
const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.MIN_LENGTH, VALIDATION_MESSAGES.MIN_LENGTH('Password', PASSWORD_REQUIREMENTS.MIN_LENGTH))
  .max(PASSWORD_REQUIREMENTS.MAX_LENGTH, VALIDATION_MESSAGES.MAX_LENGTH('Password', PASSWORD_REQUIREMENTS.MAX_LENGTH))
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE || /[A-Z]/.test(password),
    { message: VALIDATION_MESSAGES.PASSWORD_NO_UPPERCASE }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE || /[a-z]/.test(password),
    { message: VALIDATION_MESSAGES.PASSWORD_NO_LOWERCASE }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS || /\d/.test(password),
    { message: VALIDATION_MESSAGES.PASSWORD_NO_NUMBER }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHARS || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    { message: VALIDATION_MESSAGES.PASSWORD_NO_SPECIAL }
  );

// Login schema
export const loginSchema = z.object({
  email: z.string()
    .email(VALIDATION_MESSAGES.INVALID_EMAIL)
    .max(FIELD_LIMITS.EMAIL.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Email', FIELD_LIMITS.EMAIL.MAX)),
  password: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Password')),
  rememberMe: z.boolean().optional(),
});

// Registration schema
export const registerSchema = z.object({
  email: z.string()
    .email(VALIDATION_MESSAGES.INVALID_EMAIL)
    .max(FIELD_LIMITS.EMAIL.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Email', FIELD_LIMITS.EMAIL.MAX)),
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string()
    .min(FIELD_LIMITS.NAME.MIN, VALIDATION_MESSAGES.MIN_LENGTH('Name', FIELD_LIMITS.NAME.MIN))
    .max(FIELD_LIMITS.NAME.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Name', FIELD_LIMITS.NAME.MAX)),
  acceptTerms: z.boolean()
    .refine((val) => val === true, { message: 'You must accept the terms and conditions' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
  path: ['confirmPassword'],
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email(VALIDATION_MESSAGES.INVALID_EMAIL)
    .max(FIELD_LIMITS.EMAIL.MAX, VALIDATION_MESSAGES.MAX_LENGTH('Email', FIELD_LIMITS.EMAIL.MAX)),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Token')),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
  path: ['confirmPassword'],
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Current password')),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Verification token')),
});

// OAuth callback schema
export const oauthCallbackSchema = z.object({
  code: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Authorization code')),
  state: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('State')),
});

// Session refresh schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED_FIELD('Refresh token')),
});

// Two-factor authentication schema
export const twoFactorSchema = z.object({
  code: z.string()
    .length(6, VALIDATION_MESSAGES.EXACT_LENGTH('2FA code', 6))
    .regex(/^\d{6}$/, { message: '2FA code must be 6 digits' }),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;