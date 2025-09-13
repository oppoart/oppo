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
    status: "pending" | "in_progress" | "completed" | "cancelled";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    description?: string | undefined;
    dueDate?: Date | undefined;
}, {
    status: "pending" | "in_progress" | "completed" | "cancelled";
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    description?: string | undefined;
    dueDate?: Date | undefined;
}>;
export declare const CreateTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    dueDate: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    title: string;
    priority: "low" | "medium" | "high" | "urgent";
    description?: string | undefined;
    dueDate?: Date | undefined;
}, {
    title: string;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    dueDate?: Date | undefined;
}>;
export declare const UpdateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
} & {
    status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "in_progress" | "completed" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    dueDate?: Date | undefined;
}, {
    status?: "pending" | "in_progress" | "completed" | "cancelled" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    priority?: "low" | "medium" | "high" | "urgent" | undefined;
    dueDate?: Date | undefined;
}>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}, {
    email: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const ApiResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    timestamp: string;
    error?: string | undefined;
    data?: unknown;
}, {
    success: boolean;
    timestamp: string;
    error?: string | undefined;
    data?: unknown;
}>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type TaskPriorityType = z.infer<typeof TaskPriority>;
export type User = z.infer<typeof UserSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
//# sourceMappingURL=types.d.ts.map