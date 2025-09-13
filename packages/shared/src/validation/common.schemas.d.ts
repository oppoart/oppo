import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const urlSchema: z.ZodString;
export declare const phoneSchema: z.ZodOptional<z.ZodString>;
export declare const slugSchema: z.ZodString;
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    endDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
}, "strip", z.ZodTypeAny, {
    startDate?: string | Date;
    endDate?: string | Date;
}, {
    startDate?: string | Date;
    endDate?: string | Date;
}>, {
    startDate?: string | Date;
    endDate?: string | Date;
}, {
    startDate?: string | Date;
    endDate?: string | Date;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}, {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}>;
export declare const searchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
}, {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
}>;
export declare const fileUploadSchema: z.ZodEffects<z.ZodObject<{
    filename: z.ZodString;
    mimetype: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename?: string;
    mimetype?: string;
    size?: number;
}, {
    filename?: string;
    mimetype?: string;
    size?: number;
}>, {
    filename?: string;
    mimetype?: string;
    size?: number;
}, {
    filename?: string;
    mimetype?: string;
    size?: number;
}>;
export declare const imageUploadSchema: z.ZodEffects<z.ZodObject<{
    filename: z.ZodString;
    mimetype: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename?: string;
    mimetype?: string;
    size?: number;
}, {
    filename?: string;
    mimetype?: string;
    size?: number;
}>, {
    filename?: string;
    mimetype?: string;
    size?: number;
}, {
    filename?: string;
    mimetype?: string;
    size?: number;
}>;
export declare const tagsSchema: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
export declare const idArraySchema: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodString]>, "many">;
export declare const batchOperationSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodString]>, "many">;
    operation: z.ZodEnum<["delete", "archive", "restore", "update"]>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    data?: Record<string, any>;
    ids?: string[];
    operation?: "update" | "delete" | "archive" | "restore";
}, {
    data?: Record<string, any>;
    ids?: string[];
    operation?: "update" | "delete" | "archive" | "restore";
}>;
export declare const coordinateSchema: z.ZodObject<{
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    latitude?: number;
    longitude?: number;
}, {
    latitude?: number;
    longitude?: number;
}>;
export declare const addressSchema: z.ZodObject<{
    street: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    coordinates: z.ZodOptional<z.ZodObject<{
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        latitude?: number;
        longitude?: number;
    }, {
        latitude?: number;
        longitude?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    state?: string;
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
}, {
    state?: string;
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
        latitude?: number;
        longitude?: number;
    };
}>;
export declare const moneySchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount?: number;
    currency?: string;
}, {
    amount?: number;
    currency?: string;
}>;
export declare const percentageSchema: z.ZodNumber;
export declare const scoreSchema: z.ZodNumber;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type TagsInput = z.infer<typeof tagsSchema>;
export type BatchOperationInput = z.infer<typeof batchOperationSchema>;
export type CoordinateInput = z.infer<typeof coordinateSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type MoneyInput = z.infer<typeof moneySchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
