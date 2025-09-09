import { z } from 'zod';

// Task-related types
export const TaskStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent']);

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: TaskStatus,
  priority: TaskPriority,
  createdAt: z.date(),
  updatedAt: z.date(),
  dueDate: z.date().optional(),
  userId: z.string(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: TaskPriority.default('medium'),
  dueDate: z.date().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: TaskStatus.optional(),
});

// User-related types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API Response types
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// Export inferred TypeScript types
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type TaskPriorityType = z.infer<typeof TaskPriority>;
export type User = z.infer<typeof UserSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;