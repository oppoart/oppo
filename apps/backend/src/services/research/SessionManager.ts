import { 
  ResearchSession, 
  SessionManagerOptions, 
  SessionMetrics,
  SessionStatusUpdate,
  ProgressCallback 
} from './types';
import { RESEARCH_SESSION_STATUSES } from '../../../../../packages/shared/src/constants/research.constants';

export class SessionManager {
  private sessions = new Map<string, ResearchSession>();
  private cleanupTimer?: NodeJS.Timeout;
  private options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions = {}) {
    this.options = {
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      maxSessions: options.maxSessions || 1000
    };

    this.startCleanupTimer();
  }

  /**
   * Create a new research session
   */
  createSession(
    serviceId: string, 
    profileId: string, 
    options?: Record<string, any>
  ): ResearchSession {
    // Check session limit
    if (this.sessions.size >= this.options.maxSessions) {
      this.cleanupExpiredSessions();
      if (this.sessions.size >= this.options.maxSessions) {
        throw new Error('Maximum number of sessions reached');
      }
    }

    const sessionId = `${serviceId}-${profileId}-${Date.now()}`;
    const session: ResearchSession = {
      id: sessionId,
      serviceId,
      profileId,
      status: RESEARCH_SESSION_STATUSES.RUNNING,
      progress: 0,
      results: [],
      startedAt: new Date(),
      updatedAt: new Date(),
      options
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session status
   */
  updateSessionStatus(
    sessionId: string,
    status: keyof typeof RESEARCH_SESSION_STATUSES,
    progress?: number,
    error?: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = status;
    session.updatedAt = new Date();
    
    if (progress !== undefined) {
      session.progress = progress;
    }
    
    if (error) {
      session.error = error;
    }

    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Update session progress
   */
  updateProgress(sessionId: string, progress: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.progress = progress;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Add results to session
   */
  addResults(sessionId: string, results: any[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.results.push(...results);
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Set session results (replace existing)
   */
  setResults(sessionId: string, results: any[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.results = results;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Stop a session
   */
  stopSession(sessionId: string): boolean {
    return this.updateSessionStatus(sessionId, RESEARCH_SESSION_STATUSES.STOPPED);
  }

  /**
   * Mark session as completed
   */
  completeSession(sessionId: string, results?: any[]): boolean {
    if (results) {
      this.setResults(sessionId, results);
    }
    return this.updateSessionStatus(sessionId, RESEARCH_SESSION_STATUSES.COMPLETED, 100);
  }

  /**
   * Mark session as failed
   */
  failSession(sessionId: string, error: string): boolean {
    return this.updateSessionStatus(sessionId, RESEARCH_SESSION_STATUSES.ERROR, undefined, error);
  }

  /**
   * Get all sessions for a profile
   */
  getProfileSessions(profileId: string): ResearchSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.profileId === profileId);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): ResearchSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.status === RESEARCH_SESSION_STATUSES.RUNNING);
  }

  /**
   * Get sessions by service ID
   */
  getServiceSessions(serviceId: string): ResearchSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.serviceId === serviceId);
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.updatedAt.getTime();
      
      // Remove sessions that are older than timeout and not running
      if (sessionAge > this.options.sessionTimeout && 
          session.status !== RESEARCH_SESSION_STATUSES.RUNNING) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get session metrics
   */
  getMetrics(): SessionMetrics {
    const sessions = Array.from(this.sessions.values());
    
    const completed = sessions.filter(s => s.status === RESEARCH_SESSION_STATUSES.COMPLETED);
    const failed = sessions.filter(s => s.status === RESEARCH_SESSION_STATUSES.ERROR);
    const active = sessions.filter(s => s.status === RESEARCH_SESSION_STATUSES.RUNNING);

    const completedWithDuration = completed.filter(s => s.startedAt && s.updatedAt);
    const averageExecutionTime = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, s) => 
          sum + (s.updatedAt.getTime() - s.startedAt.getTime()), 0) / completedWithDuration.length
      : 0;

    return {
      totalSessions: sessions.length,
      activeSessions: active.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      averageExecutionTime
    };
  }

  /**
   * Export sessions for a profile
   */
  exportProfileSessions(
    profileId: string, 
    serviceIds?: string[]
  ): ResearchSession[] {
    let sessions = this.getProfileSessions(profileId);
    
    if (serviceIds && serviceIds.length > 0) {
      sessions = sessions.filter(session => serviceIds.includes(session.serviceId));
    }
    
    return sessions;
  }

  /**
   * Create a status update callback for a session
   */
  createStatusUpdater(sessionId: string): SessionStatusUpdate {
    return (
      sessionId: string,
      status: keyof typeof RESEARCH_SESSION_STATUSES,
      progress?: number,
      error?: string
    ) => {
      this.updateSessionStatus(sessionId, status, progress, error);
    };
  }

  /**
   * Create a progress callback for a session
   */
  createProgressCallback(sessionId: string): ProgressCallback {
    return (sessionId: string, progress: number) => {
      this.updateProgress(sessionId, progress);
    };
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`SessionManager: Cleaned up ${cleaned} expired sessions`);
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get all session IDs (for debugging)
   */
  getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll(): void {
    this.sessions.clear();
  }
}