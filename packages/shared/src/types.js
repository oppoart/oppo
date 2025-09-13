"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseSchema = exports.UserSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.TaskSchema = exports.TaskPriority = exports.TaskStatus = void 0;
const zod_1 = require("zod");
exports.TaskStatus = zod_1.z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
exports.TaskPriority = zod_1.z.enum(['low', 'medium', 'high', 'urgent']);
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    status: exports.TaskStatus,
    priority: exports.TaskPriority,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    dueDate: zod_1.z.date().optional(),
    userId: zod_1.z.string(),
});
exports.CreateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().optional(),
    priority: exports.TaskPriority.default('medium'),
    dueDate: zod_1.z.date().optional(),
});
exports.UpdateTaskSchema = exports.CreateTaskSchema.partial().extend({
    status: exports.TaskStatus.optional(),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.ApiResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown().optional(),
    error: zod_1.z.string().optional(),
    timestamp: zod_1.z.string(),
});
//# sourceMappingURL=types.js.map