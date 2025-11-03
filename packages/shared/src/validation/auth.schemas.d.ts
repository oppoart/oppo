import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    rememberMe?: boolean;
}, {
    email?: string;
    password?: string;
    rememberMe?: boolean;
}>;
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
    confirmPassword: z.ZodString;
    name: z.ZodString;
    acceptTerms: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    name?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
}, {
    email?: string;
    name?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
}>, {
    email?: string;
    name?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
}, {
    email?: string;
    name?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
}, {
    email?: string;
}>;
export declare const resetPasswordSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token?: string;
    password?: string;
    confirmPassword?: string;
}, {
    token?: string;
    password?: string;
    confirmPassword?: string;
}>, {
    token?: string;
    password?: string;
    confirmPassword?: string;
}, {
    token?: string;
    password?: string;
    confirmPassword?: string;
}>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}>, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}>, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}, {
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
}>;
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token?: string;
}, {
    token?: string;
}>;
export declare const oauthCallbackSchema: z.ZodObject<{
    code: z.ZodString;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code?: string;
    state?: string;
}, {
    code?: string;
    state?: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export declare const twoFactorSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code?: string;
}, {
    code?: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;
