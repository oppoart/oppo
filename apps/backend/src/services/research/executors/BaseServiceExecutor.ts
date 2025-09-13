import { ServiceExecutor, ServiceExecutionOptions, ServiceExecutionResult } from '../types';

export abstract class BaseServiceExecutor implements ServiceExecutor {
  protected serviceId: string;

  constructor(serviceId: string) {
    this.serviceId = serviceId;
  }

  abstract execute(profileId: string, options?: ServiceExecutionOptions): Promise<ServiceExecutionResult>;

  validate(options?: ServiceExecutionOptions): boolean {
    // Basic validation - can be overridden by specific executors
    return true;
  }

  getServiceId(): string {
    return this.serviceId;
  }

  protected createResult(data: any, metadata?: any): ServiceExecutionResult {
    return {
      data,
      metadata: {
        executionTime: Date.now(),
        itemsProcessed: Array.isArray(data) ? data.length : 1,
        ...metadata
      }
    };
  }

  protected handleError(error: any, context?: string): ServiceExecutionResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`${this.serviceId} execution error${context ? ` (${context})` : ''}:`, error);
    
    return {
      data: [],
      metadata: {
        executionTime: Date.now(),
        itemsProcessed: 0,
        errors: [errorMessage]
      }
    };
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}