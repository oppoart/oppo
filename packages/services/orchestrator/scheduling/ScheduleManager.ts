import { CronJob } from 'cron';
import { ScheduledTask, TaskFrequency, TaskPriority } from '../types';

export class ScheduleManager {
  private scheduledTasks: Map<string, CronJob> = new Map();
  private taskDefinitions: Map<string, ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor() {}

  // Task Management
  async scheduleTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRun' | 'nextRun'>): Promise<string> {
    const id = this.generateTaskId();
    const cronExpression = this.frequencyToCron(task.frequency);
    
    const fullTask: ScheduledTask = {
      ...task,
      id,
      cronExpression,
      createdAt: new Date(),
      nextRun: this.getNextRunTime(cronExpression)
    };

    this.taskDefinitions.set(id, fullTask);

    if (fullTask.enabled && this.isRunning) {
      await this.startTask(fullTask);
    }

    return id;
  }

  async unscheduleTask(taskId: string): Promise<boolean> {
    const cronJob = this.scheduledTasks.get(taskId);
    if (cronJob) {
      cronJob.stop();
      cronJob.destroy();
      this.scheduledTasks.delete(taskId);
    }

    const task = this.taskDefinitions.get(taskId);
    if (task) {
      this.taskDefinitions.delete(taskId);
      return true;
    }

    return false;
  }

  async updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<boolean> {
    const task = this.taskDefinitions.get(taskId);
    if (!task) return false;

    // Stop existing task if it's running
    await this.stopTask(taskId);

    // Update task definition
    const updatedTask: ScheduledTask = {
      ...task,
      ...updates,
      id: taskId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    // Recalculate cron expression if frequency changed
    if (updates.frequency) {
      updatedTask.cronExpression = this.frequencyToCron(updates.frequency);
      updatedTask.nextRun = this.getNextRunTime(updatedTask.cronExpression);
    }

    this.taskDefinitions.set(taskId, updatedTask);

    // Restart task if it's enabled
    if (updatedTask.enabled && this.isRunning) {
      await this.startTask(updatedTask);
    }

    return true;
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.taskDefinitions.get(taskId);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.taskDefinitions.values());
  }

  getActiveTasks(): ScheduledTask[] {
    return Array.from(this.taskDefinitions.values())
      .filter(task => task.enabled);
  }

  // Schedule Control
  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('Starting Schedule Manager...');
    this.isRunning = true;

    // Start all enabled tasks
    const enabledTasks = this.getActiveTasks();
    for (const task of enabledTasks) {
      await this.startTask(task);
    }

    console.log(`Started ${enabledTasks.length} scheduled tasks`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping Schedule Manager...');
    this.isRunning = false;

    // Stop all running tasks
    for (const [taskId, cronJob] of this.scheduledTasks.entries()) {
      cronJob.stop();
      cronJob.destroy();
    }

    this.scheduledTasks.clear();
    console.log('All scheduled tasks stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  // Task Execution
  private async startTask(task: ScheduledTask): Promise<void> {
    if (this.scheduledTasks.has(task.id)) {
      // Task already scheduled
      return;
    }

    try {
      const cronJob = new CronJob(
        task.cronExpression,
        async () => {
          await this.executeTask(task);
        },
        null, // onComplete callback
        false, // start immediately = false (we'll start manually)
        'UTC', // timezone
        null, // context
        true // runOnInit = true for immediate execution if needed
      );

      this.scheduledTasks.set(task.id, cronJob);
      cronJob.start();

      console.log(`Scheduled task: ${task.name} (${task.cronExpression})`);
    } catch (error) {
      console.error(`Failed to schedule task ${task.name}:`, error);
      throw error;
    }
  }

  private async stopTask(taskId: string): Promise<void> {
    const cronJob = this.scheduledTasks.get(taskId);
    if (cronJob) {
      cronJob.stop();
      cronJob.destroy();
      this.scheduledTasks.delete(taskId);
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing scheduled task: ${task.name}`);
      
      // Update last run time
      const updatedTask = {
        ...task,
        lastRun: new Date(),
        nextRun: this.getNextRunTime(task.cronExpression),
        runCount: (task.runCount || 0) + 1
      };
      this.taskDefinitions.set(task.id, updatedTask);

      // Execute the task action
      await this.performTaskAction(task);

      // Update success metrics
      const duration = Date.now() - startTime;
      updatedTask.lastDuration = duration;
      updatedTask.lastSuccess = new Date();
      this.taskDefinitions.set(task.id, updatedTask);

      console.log(`Task ${task.name} completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`Task ${task.name} failed after ${duration}ms:`, error);
      
      // Update failure metrics
      const updatedTask = {
        ...this.taskDefinitions.get(task.id)!,
        lastDuration: duration,
        lastError: error instanceof Error ? error.message : String(error),
        errorCount: (task.errorCount || 0) + 1
      };
      this.taskDefinitions.set(task.id, updatedTask);

      // Optionally disable task after too many failures
      if (updatedTask.errorCount >= 5) {
        console.warn(`Disabling task ${task.name} due to repeated failures`);
        await this.updateTask(task.id, { enabled: false });
      }
    }
  }

  private async performTaskAction(task: ScheduledTask): Promise<void> {
    switch (task.action) {
      case 'scan_sources':
        // This would trigger a source scanning workflow
        console.log('Triggering source scan...');
        break;

      case 'check_deadlines':
        // This would trigger deadline checking
        console.log('Checking deadlines...');
        break;

      case 'cleanup_data':
        // This would trigger data cleanup
        console.log('Cleaning up old data...');
        break;

      case 'generate_reports':
        // This would trigger report generation
        console.log('Generating reports...');
        break;

      case 'backup_data':
        // This would trigger data backup
        console.log('Backing up data...');
        break;

      case 'custom':
        // Custom action - would need to be handled by the orchestrator
        console.log(`Executing custom action: ${task.name}`);
        break;

      default:
        throw new Error(`Unknown task action: ${task.action}`);
    }
  }

  // Frequency Conversion
  private frequencyToCron(frequency: TaskFrequency): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour at minute 0
      case 'daily':
        return '0 0 * * *'; // Every day at midnight
      case 'weekly':
        return '0 0 * * 0'; // Every Sunday at midnight
      case 'monthly':
        return '0 0 1 * *'; // First day of every month at midnight
      case 'every_6_hours':
        return '0 */6 * * *'; // Every 6 hours
      case 'every_12_hours':
        return '0 */12 * * *'; // Every 12 hours
      case 'twice_daily':
        return '0 0,12 * * *'; // Twice daily at midnight and noon
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  private getNextRunTime(cronExpression: string): Date {
    try {
      const cronJob = new CronJob(cronExpression, () => {}, null, false);
      return cronJob.nextDate().toDate();
    } catch (error) {
      console.error(`Failed to calculate next run time for: ${cronExpression}`, error);
      return new Date(Date.now() + 60 * 60 * 1000); // Default to 1 hour from now
    }
  }

  // Predefined Task Templates
  createSourceScanTask(priority: TaskPriority = 'medium'): Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRun' | 'nextRun'> {
    return {
      name: 'Source Scanning',
      description: 'Scans art opportunity sources for new listings',
      action: 'scan_sources',
      frequency: 'every_6_hours',
      priority,
      enabled: true,
      timeout: 300000, // 5 minutes
      maxRetries: 2,
      cronExpression: '' // Will be set automatically
    };
  }

  createDeadlineCheckTask(priority: TaskPriority = 'high'): Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRun' | 'nextRun'> {
    return {
      name: 'Deadline Monitoring',
      description: 'Checks for upcoming application deadlines',
      action: 'check_deadlines',
      frequency: 'daily',
      priority,
      enabled: true,
      timeout: 60000, // 1 minute
      maxRetries: 1,
      cronExpression: '' // Will be set automatically
    };
  }

  createCleanupTask(priority: TaskPriority = 'low'): Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRun' | 'nextRun'> {
    return {
      name: 'Data Cleanup',
      description: 'Removes old execution logs and temporary data',
      action: 'cleanup_data',
      frequency: 'weekly',
      priority,
      enabled: true,
      timeout: 180000, // 3 minutes
      maxRetries: 1,
      cronExpression: '' // Will be set automatically
    };
  }

  createReportTask(priority: TaskPriority = 'medium'): Omit<ScheduledTask, 'id' | 'createdAt' | 'lastRun' | 'nextRun'> {
    return {
      name: 'Weekly Reports',
      description: 'Generates weekly opportunity summary reports',
      action: 'generate_reports',
      frequency: 'weekly',
      priority,
      enabled: true,
      timeout: 120000, // 2 minutes
      maxRetries: 1,
      cronExpression: '' // Will be set automatically
    };
  }

  // Task Analytics
  getScheduleStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byPriority: Record<TaskPriority, number>;
    byFrequency: Record<TaskFrequency, number>;
    recentExecutions: {
      successful: number;
      failed: number;
      avgDuration: number;
    };
  } {
    const tasks = Array.from(this.taskDefinitions.values());
    
    const enabled = tasks.filter(t => t.enabled).length;
    const disabled = tasks.length - enabled;
    
    const byPriority: Record<TaskPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const byFrequency: Record<TaskFrequency, number> = {
      hourly: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      every_6_hours: 0,
      every_12_hours: 0,
      twice_daily: 0
    };

    tasks.forEach(task => {
      byPriority[task.priority]++;
      byFrequency[task.frequency]++;
    });

    // Calculate recent execution stats
    const tasksWithExecutions = tasks.filter(t => t.runCount && t.runCount > 0);
    const successful = tasksWithExecutions.filter(t => t.lastSuccess && (!t.lastError || t.lastSuccess > new Date(t.lastError))).length;
    const failed = tasksWithExecutions.length - successful;
    
    const avgDuration = tasksWithExecutions.length > 0
      ? tasksWithExecutions.reduce((sum, t) => sum + (t.lastDuration || 0), 0) / tasksWithExecutions.length
      : 0;

    return {
      total: tasks.length,
      enabled,
      disabled,
      byPriority,
      byFrequency,
      recentExecutions: {
        successful,
        failed,
        avgDuration: Math.round(avgDuration)
      }
    };
  }

  // Helper Methods
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isTaskRunning(taskId: string): boolean {
    const cronJob = this.scheduledTasks.get(taskId);
    return cronJob ? cronJob.running : false;
  }

  getRunningTasks(): ScheduledTask[] {
    return Array.from(this.taskDefinitions.values())
      .filter(task => this.isTaskRunning(task.id));
  }

  async createDefaultTasks(): Promise<string[]> {
    const templates = [
      this.createSourceScanTask('medium'),
      this.createDeadlineCheckTask('high'),
      this.createCleanupTask('low'),
      this.createReportTask('medium')
    ];

    const ids: string[] = [];
    for (const template of templates) {
      const id = await this.scheduleTask(template);
      ids.push(id);
    }

    return ids;
  }
}