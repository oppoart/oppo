import { ServiceExecutor, ServiceExecutionOptions, ServiceHealth } from './types';
import { SessionManager } from './SessionManager';
import { 
  RESEARCH_SESSION_STATUSES,
  PROCESSING_DELAYS,
  PROGRESS_MILESTONES 
} from '../../../../../packages/shared/src/constants/research.constants';

export class ServiceOrchestrator {
  private executors = new Map<string, ServiceExecutor>();
  private sessionManager: SessionManager;
  private healthChecks = new Map<string, ServiceHealth>();

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Register a service executor
   */
  registerExecutor(executor: ServiceExecutor): void {
    this.executors.set(executor.getServiceId(), executor);
    this.initializeHealthCheck(executor.getServiceId());
  }

  /**
   * Get registered service IDs
   */
  getRegisteredServices(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Check if a service is registered
   */
  isServiceRegistered(serviceId: string): boolean {
    return this.executors.has(serviceId);
  }

  /**
   * Execute a service with proper orchestration
   */
  async executeService(
    serviceId: string,
    profileId: string,
    options?: ServiceExecutionOptions
  ): Promise<string> {
    const executor = this.executors.get(serviceId);
    if (!executor) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Validate options
    if (!executor.validate(options)) {
      throw new Error(`Invalid options for service: ${serviceId}`);
    }

    // Create session
    const session = this.sessionManager.createSession(serviceId, profileId, options);
    
    // Start background execution
    this.executeInBackground(session.id, executor, profileId, options);
    
    return session.id;
  }

  /**
   * Stop a service execution
   */
  stopService(sessionId: string): boolean {
    return this.sessionManager.stopSession(sessionId);
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceId: string): ServiceHealth | undefined {
    return this.healthChecks.get(serviceId);
  }

  /**
   * Get health status for all services
   */
  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Perform health check on a service
   */
  async performHealthCheck(serviceId: string): Promise<ServiceHealth> {
    const executor = this.executors.get(serviceId);
    if (!executor) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const startTime = Date.now();
    let health: ServiceHealth = {
      serviceId,
      status: 'down',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0
    };

    try {
      // Perform a lightweight validation test
      const isValid = executor.validate({});
      const responseTime = Date.now() - startTime;
      
      health = {
        serviceId,
        status: isValid ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0 // Would be calculated based on recent executions
      };
    } catch (error) {
      health.status = 'down';
      health.errorRate = 1;
    }

    this.healthChecks.set(serviceId, health);
    return health;
  }

  /**
   * Execute service in background with progress tracking
   */
  private async executeInBackground(
    sessionId: string,
    executor: ServiceExecutor,
    profileId: string,
    options?: ServiceExecutionOptions
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update progress: Started
      this.sessionManager.updateProgress(sessionId, PROGRESS_MILESTONES.STARTED);
      await this.sleep(PROCESSING_DELAYS.INITIAL_DELAY);

      // Update progress: Processing
      this.sessionManager.updateProgress(sessionId, PROGRESS_MILESTONES.PROCESSING);
      await this.sleep(PROCESSING_DELAYS.PROGRESS_UPDATE_DELAY);

      // Update progress: Analyzing
      this.sessionManager.updateProgress(sessionId, PROGRESS_MILESTONES.ANALYZING);

      // Execute the service
      const result = await executor.execute(profileId, options);
      
      // Update progress: Finalizing
      this.sessionManager.updateProgress(sessionId, PROGRESS_MILESTONES.FINALIZING);
      await this.sleep(PROCESSING_DELAYS.FINAL_DELAY);

      // Complete the session
      const resultData = Array.isArray(result.data) ? result.data : [result.data];
      this.sessionManager.completeSession(sessionId, resultData);

      // Update health status
      this.updateServiceHealth(executor.getServiceId(), true, Date.now() - startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sessionManager.failSession(sessionId, errorMessage);
      
      // Update health status
      this.updateServiceHealth(executor.getServiceId(), false, Date.now() - startTime);
      
      console.error(`Service execution failed for ${executor.getServiceId()}:`, error);
    }
  }

  /**
   * Update service health based on execution results
   */
  private updateServiceHealth(
    serviceId: string, 
    success: boolean, 
    responseTime: number
  ): void {
    const currentHealth = this.healthChecks.get(serviceId);
    if (!currentHealth) return;

    const updatedHealth: ServiceHealth = {
      ...currentHealth,
      status: success ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      responseTime,
      errorRate: success ? Math.max(0, currentHealth.errorRate - 0.1) : Math.min(1, currentHealth.errorRate + 0.1)
    };

    this.healthChecks.set(serviceId, updatedHealth);
  }

  /**
   * Initialize health check for a service
   */
  private initializeHealthCheck(serviceId: string): void {
    this.healthChecks.set(serviceId, {
      serviceId,
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0
    });
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution statistics
   */
  getExecutionStats() {
    const sessions = this.sessionManager.getMetrics();
    const services = this.getRegisteredServices();
    const healthyServices = Array.from(this.healthChecks.values())
      .filter(h => h.status === 'healthy').length;

    return {
      ...sessions,
      registeredServices: services.length,
      healthyServices,
      serviceHealth: this.getAllServiceHealth()
    };
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    this.executors.clear();
    this.healthChecks.clear();
  }
}