"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorSchema = exports.refreshTokenSchema = exports.oauthCallbackSchema = exports.verifyEmailSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const validation_config_1 = require("../config/validation.config");
const validation_config_2 = require("../config/validation.config");
const passwordSchema = zod_1.z.string()
    .min(validation_config_1.PASSWORD_REQUIREMENTS.MIN_LENGTH, validation_config_2.VALIDATION_MESSAGES.MIN_LENGTH('Password', validation_config_1.PASSWORD_REQUIREMENTS.MIN_LENGTH))
    .max(validation_config_1.PASSWORD_REQUIREMENTS.MAX_LENGTH, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Password', validation_config_1.PASSWORD_REQUIREMENTS.MAX_LENGTH))
    .refine((password) => !validation_config_1.PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE || /[A-Z]/.test(password), { message: validation_config_2.VALIDATION_MESSAGES.PASSWORD_NO_UPPERCASE })
    .refine((password) => !validation_config_1.PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE || /[a-z]/.test(password), { message: validation_config_2.VALIDATION_MESSAGES.PASSWORD_NO_LOWERCASE })
    .refine((password) => !validation_config_1.PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS || /\d/.test(password), { message: validation_config_2.VALIDATION_MESSAGES.PASSWORD_NO_NUMBER })
    .refine((password) => !validation_config_1.PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHARS || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), { message: validation_config_2.VALIDATION_MESSAGES.PASSWORD_NO_SPECIAL });
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email(validation_config_2.VALIDATION_MESSAGES.INVALID_EMAIL)
        .max(validation_config_1.FIELD_LIMITS.EMAIL.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Email', validation_config_1.FIELD_LIMITS.EMAIL.MAX)),
    password: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Password')),
    rememberMe: zod_1.z.boolean().optional(),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email(validation_config_2.VALIDATION_MESSAGES.INVALID_EMAIL)
        .max(validation_config_1.FIELD_LIMITS.EMAIL.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Email', validation_config_1.FIELD_LIMITS.EMAIL.MAX)),
    password: passwordSchema,
    confirmPassword: zod_1.z.string(),
    name: zod_1.z.string()
        .min(validation_config_1.FIELD_LIMITS.NAME.MIN, validation_config_2.VALIDATION_MESSAGES.MIN_LENGTH('Name', validation_config_1.FIELD_LIMITS.NAME.MIN))
        .max(validation_config_1.FIELD_LIMITS.NAME.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Name', validation_config_1.FIELD_LIMITS.NAME.MAX)),
    acceptTerms: zod_1.z.boolean()
        .refine((val) => val === true, { message: 'You must accept the terms and conditions' }),
}).refine((data) => data.password === data.confirmPassword, {
    message: validation_config_2.VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email(validation_config_2.VALIDATION_MESSAGES.INVALID_EMAIL)
        .max(validation_config_1.FIELD_LIMITS.EMAIL.MAX, validation_config_2.VALIDATION_MESSAGES.MAX_LENGTH('Email', validation_config_1.FIELD_LIMITS.EMAIL.MAX)),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Token')),
    password: passwordSchema,
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: validation_config_2.VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Current password')),
    newPassword: passwordSchema,
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: validation_config_2.VALIDATION_MESSAGES.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Verification token')),
});
exports.oauthCallbackSchema = zod_1.z.object({
    code: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Authorization code')),
    state: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('State')),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string()
        .min(1, validation_config_2.VALIDATION_MESSAGES.REQUIRED_FIELD('Refresh token')),
});
exports.twoFactorSchema = zod_1.z.object({
    code: zod_1.z.string()
        .length(6, validation_config_2.VALIDATION_MESSAGES.EXACT_LENGTH('2FA code', 6))
        .regex(/^\d{6}$/, { message: '2FA code must be 6 digits' }),
});
//# sourceMappingURL=auth.schemas.js.map