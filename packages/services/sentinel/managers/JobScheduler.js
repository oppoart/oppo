"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScheduler = void 0;
const cron = __importStar(require("node-cron"));
const crypto_1 = require("crypto");
class JobScheduler {
    jobs = new Map();
    isInitialized = false;
    onJobExecute;
    async initialize() {
        console.log('JobScheduler initialized');
        this.isInitialized = true;
    }
    setJobExecuteCallback(callback) {
        this.onJobExecute = callback;
    }
    scheduleJob(discovererName, schedule, context, enabled = true) {
        if (!this.isInitialized) {
            throw new Error('JobScheduler is not initialized');
        }
        if (!cron.validate(schedule)) {
            throw new Error(`Invalid cron expression: ${schedule}`);
        }
        const jobId = (0, crypto_1.randomUUID)();
        const scheduledJob = {
            id: jobId,
            discovererName,
            schedule,
            enabled,
            context
        };
        let task = null;
        if (enabled) {
            task = cron.schedule(schedule, async () => {
                await this.executeJob(jobId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
            scheduledJob.nextRun = this.getNextRunTime(schedule);
        }
        const wrapper = {
            job: scheduledJob,
            task,
            isRunning: false
        };
        this.jobs.set(jobId, wrapper);
        console.log(`Scheduled job: ${discovererName} with schedule ${schedule}`);
        return jobId;
    }
    updateJobSchedule(jobId, newSchedule) {
        if (!cron.validate(newSchedule)) {
            throw new Error(`Invalid cron expression: ${newSchedule}`);
        }
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            throw new Error(`Job not found: ${jobId}`);
        }
        if (wrapper.task) {
            wrapper.task.stop();
            wrapper.task.destroy();
        }
        wrapper.job.schedule = newSchedule;
        wrapper.job.nextRun = this.getNextRunTime(newSchedule);
        if (wrapper.job.enabled) {
            wrapper.task = cron.schedule(newSchedule, async () => {
                await this.executeJob(jobId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
        }
        console.log(`Updated job schedule: ${jobId} to ${newSchedule}`);
    }
    toggleJob(jobId, enabled) {
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            throw new Error(`Job not found: ${jobId}`);
        }
        wrapper.job.enabled = enabled;
        if (enabled && !wrapper.task) {
            wrapper.task = cron.schedule(wrapper.job.schedule, async () => {
                await this.executeJob(jobId);
            }, {
                scheduled: true,
                timezone: 'UTC'
            });
            wrapper.job.nextRun = this.getNextRunTime(wrapper.job.schedule);
        }
        else if (!enabled && wrapper.task) {
            wrapper.task.stop();
            wrapper.task.destroy();
            wrapper.task = null;
            wrapper.job.nextRun = undefined;
        }
        console.log(`${enabled ? 'Enabled' : 'Disabled'} job: ${jobId}`);
    }
    removeJob(jobId) {
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            throw new Error(`Job not found: ${jobId}`);
        }
        if (wrapper.task) {
            wrapper.task.stop();
            wrapper.task.destroy();
        }
        this.jobs.delete(jobId);
        console.log(`Removed job: ${jobId}`);
    }
    getScheduledJobs() {
        return Array.from(this.jobs.values()).map(wrapper => ({
            ...wrapper.job,
            nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
        }));
    }
    getScheduledJob(jobId) {
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            return null;
        }
        return {
            ...wrapper.job,
            nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
        };
    }
    getJobsForDiscoverer(discovererName) {
        return Array.from(this.jobs.values())
            .filter(wrapper => wrapper.job.discovererName === discovererName)
            .map(wrapper => ({
            ...wrapper.job,
            nextRun: wrapper.job.enabled ? this.getNextRunTime(wrapper.job.schedule) : undefined
        }));
    }
    async executeJobManually(jobId) {
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            throw new Error(`Job not found: ${jobId}`);
        }
        if (wrapper.isRunning) {
            throw new Error(`Job is already running: ${jobId}`);
        }
        await this.executeJob(jobId);
    }
    getJobStatistics() {
        const jobs = Array.from(this.jobs.values());
        return {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(wrapper => wrapper.job.enabled).length,
            runningJobs: jobs.filter(wrapper => wrapper.isRunning).length,
            lastExecutions: jobs.map(wrapper => ({
                jobId: wrapper.job.id,
                discovererName: wrapper.job.discovererName,
                lastRun: wrapper.job.lastRun
            }))
        };
    }
    addDefaultSchedules() {
        this.scheduleJob('firecrawl', '0 */4 * * *', {
            searchTerms: ['artist grants', 'art residencies', 'art opportunities'],
            maxResults: 50
        });
        this.scheduleJob('perplexity', '30 */4 * * *', {
            searchTerms: ['artist grants 2024', 'art competitions', 'creative fellowships'],
            maxResults: 30
        });
        this.scheduleJob('brave', '0 8,20 * * *', {
            searchTerms: ['art grants', 'artist opportunities'],
            maxResults: 40
        });
        this.scheduleJob('artconnect', '0 10,22 * * *', {
            maxResults: 25
        });
        console.log('Added default discovery schedules');
    }
    async shutdown() {
        console.log('Shutting down JobScheduler...');
        for (const [jobId, wrapper] of Array.from(this.jobs.entries())) {
            if (wrapper.task) {
                wrapper.task.stop();
                wrapper.task.destroy();
            }
        }
        this.jobs.clear();
        this.isInitialized = false;
        console.log('JobScheduler shutdown complete');
    }
    async executeJob(jobId) {
        const wrapper = this.jobs.get(jobId);
        if (!wrapper) {
            console.error(`Job not found during execution: ${jobId}`);
            return;
        }
        if (wrapper.isRunning) {
            console.warn(`Job already running, skipping: ${jobId}`);
            return;
        }
        const job = wrapper.job;
        try {
            wrapper.isRunning = true;
            job.lastRun = new Date();
            job.nextRun = this.getNextRunTime(job.schedule);
            console.log(`Executing scheduled job: ${job.discovererName}`);
            if (this.onJobExecute) {
                await this.onJobExecute(job.discovererName, job.context);
            }
            else {
                console.warn('No job execute callback registered');
            }
            console.log(`Completed scheduled job: ${job.discovererName}`);
        }
        catch (error) {
            console.error(`Error executing job ${jobId}:`, error);
        }
        finally {
            wrapper.isRunning = false;
        }
    }
    getNextRunTime(schedule) {
        try {
            const task = cron.schedule(schedule, () => { }, { scheduled: false });
            return new Date(Date.now() + 60 * 60 * 1000);
        }
        catch (error) {
            return new Date(Date.now() + 60 * 60 * 1000);
        }
    }
}
exports.JobScheduler = JobScheduler;
//# sourceMappingURL=JobScheduler.js.map