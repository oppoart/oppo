import { z } from 'zod';
export declare const TaskStatus: z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>;
export declare const TaskPriority: z.ZodEnum<["low", "medium", "high", "urgent"]>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>;
    priority: z.ZodEnum<["low", "medium", "high", "urgent"]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    dueDate: z.ZodOptional<z.ZodDate>;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description?: string;
    id?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    title?: string;
    status?: "completed" | "in_progress" | "pending" | "cancelled";
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}, {
    description?: string;
    id?: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    title?: string;
    status?: "completed" | "in_progress" | "pending" | "cancelled";
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}>;
export declare const CreateTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    dueDate: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    title?: string;
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}, {
    description?: string;
    title?: string;
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}>;
export declare const UpdateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    title?: string;
    status?: "completed" | "in_progress" | "pending" | "cancelled";
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}, {
    description?: string;
    title?: string;
    status?: "completed" | "in_progress" | "pending" | "cancelled";
    priority?: "high" | "medium" | "low" | "urgent";
    dueDate?: Date;
}>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    email?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    name?: string;
}, {
    email?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    name?: string;
}>;
export declare const ApiResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error?: string;
    data?: unknown;
    success?: boolean;
    timestamp?: string;
}, {
    error?: string;
    data?: unknown;
    success?: boolean;
    timestamp?: string;
}>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type TaskPriorityType = z.infer<typeof TaskPriority>;
export type User = z.infer<typeof UserSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
