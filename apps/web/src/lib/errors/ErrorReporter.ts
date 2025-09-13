export interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  eventId?: string;
}

export interface ClientError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  type: ErrorType;
  severity: ErrorSeverity;
  context: ErrorContext;
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
  metadata: Record<string, any>;
}

export enum ErrorType {
  JAVASCRIPT_ERROR = 'javascript_error',
  PROMISE_REJECTION = 'promise_rejection',
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  RESOURCE_ERROR = 'resource_error',
  CHUNK_LOAD_ERROR = 'chunk_load_error',
  COMPONENT_ERROR = 'component_error',
  RENDER_ERROR = 'render_error',
  USER_INPUT_ERROR = 'user_input_error',
  PERFORMANCE_ERROR = 'performance_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  url: string;
  component?: string;
  action?: string;
  feature?: string;
  route?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
}

export interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorReportingConfig {
  maxBreadcrumbs: number;
  enableConsoleCapture: boolean;
  enableNetworkCapture: boolean;
  enableUserInteractionCapture: boolean;
  sampleRate: number;
  apiEndpoint?: string;
  beforeSend?: (error: ClientError) => ClientError | null;
  onError?: (error: ClientError) => void;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private config: ErrorReportingConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private errorQueue: ClientError[] = [];
  private isInitialized: boolean = false;
  private userId?: string;
  private sessionId: string;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      maxBreadcrumbs: 100,
      enableConsoleCapture: true,
      enableNetworkCapture: true,
      enableUserInteractionCapture: true,
      sampleRate: 1.0,
      enableLocalStorage: true,
      maxStoredErrors: 50,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
  }

  public static getInstance(config?: Partial<ErrorReportingConfig>): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter(config);
    }
    return ErrorReporter.instance;
  }

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupGlobalErrorHandlers();
    
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }
    
    if (this.config.enableNetworkCapture) {
      this.setupNetworkCapture();
    }
    
    if (this.config.enableUserInteractionCapture) {
      this.setupUserInteractionCapture();
    }

    this.loadStoredErrors();
    this.startPeriodicFlush();

    this.isInitialized = true;
    this.addBreadcrumb('system', 'Error reporter initialized');
  }

  public setUser(userId: string): void {
    this.userId = userId;
    this.addBreadcrumb('auth', `User set: ${userId}`);
  }

  public clearUser(): void {
    this.userId = undefined;
    this.addBreadcrumb('auth', 'User cleared');
  }

  public captureError(
    error: Error,
    context: Partial<ErrorContext> = {},
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ): string {
    const clientError = this.createClientError(error, ErrorType.JAVASCRIPT_ERROR, severity, context);
    return this.reportError(clientError);
  }

  public captureException(
    error: Error,
    errorInfo: ErrorInfo,
    context: Partial<ErrorContext> = {}
  ): string {
    const clientError = this.createClientError(
      error,
      ErrorType.COMPONENT_ERROR,
      ErrorSeverity.HIGH,
      {
        ...context,
        component: errorInfo.errorBoundary,
        componentStack: errorInfo.componentStack
      }
    );
    return this.reportError(clientError);
  }

  public captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {}
  ): string {
    const error = new Error(message);
    const clientError = this.createClientError(error, ErrorType.USER_INPUT_ERROR, level, context);
    return this.reportError(clientError);
  }

  public captureNetworkError(
    url: string,
    status: number,
    statusText: string,
    context: Partial<ErrorContext> = {}
  ): string {
    const error = new Error(`Network request failed: ${status} ${statusText} - ${url}`);
    const clientError = this.createClientError(
      error,
      ErrorType.NETWORK_ERROR,
      status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      { ...context, url }
    );
    
    clientError.metadata.networkError = { url, status, statusText };
    return this.reportError(clientError);
  }

  public captureApiError(
    endpoint: string,
    method: string,
    status: number,
    response: any,
    context: Partial<ErrorContext> = {}
  ): string {
    const error = new Error(`API request failed: ${method} ${endpoint} - ${status}`);
    const clientError = this.createClientError(
      error,
      ErrorType.API_ERROR,
      status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      { ...context, url: endpoint }
    );
    
    clientError.metadata.apiError = { endpoint, method, status, response };
    return this.reportError(clientError);
  }

  public capturePerformanceError(
    metric: string,
    value: number,
    threshold: number,
    context: Partial<ErrorContext> = {}
  ): string {
    const error = new Error(`Performance threshold exceeded: ${metric} (${value}ms > ${threshold}ms)`);
    const clientError = this.createClientError(
      error,
      ErrorType.PERFORMANCE_ERROR,
      ErrorSeverity.MEDIUM,
      context
    );
    
    clientError.metadata.performance = { metric, value, threshold };
    return this.reportError(clientError);
  }

  public addBreadcrumb(
    category: string,
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Trim breadcrumbs if too many
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  public addTag(key: string, value: string): void {
    // Tags will be added to all future errors
  }

  public setContext(key: string, value: any): void {
    // Context will be added to all future errors
  }

  public flush(): Promise<void> {
    return this.flushErrors();
  }

  public getStoredErrors(): ClientError[] {
    if (!this.config.enableLocalStorage) {
      return [];
    }

    try {
      const stored = localStorage.getItem('oppo_stored_errors');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve stored errors:', error);
      return [];
    }
  }

  public clearStoredErrors(): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    try {
      localStorage.removeItem('oppo_stored_errors');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  // Private methods
  private createClientError(
    error: Error,
    type: ErrorType,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>
  ): ClientError {
    const id = this.generateErrorId();
    
    return {
      id,
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId,
      type,
      severity,
      context: {
        url: window.location.href,
        route: window.location.pathname,
        ...context
      },
      tags: {},
      breadcrumbs: [...this.breadcrumbs],
      metadata: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      }
    };
  }

  private reportError(error: ClientError): string {
    // Apply sample rate
    if (Math.random() > this.config.sampleRate) {
      return error.id;
    }

    // Apply beforeSend filter
    if (this.config.beforeSend) {
      const filteredError = this.config.beforeSend(error);
      if (!filteredError) {
        return error.id;
      }
      error = filteredError;
    }

    // Add to queue
    this.errorQueue.push(error);

    // Store locally
    this.storeError(error);

    // Call onError callback
    if (this.config.onError) {
      try {
        this.config.onError(error);
      } catch (e) {
        console.warn('Error in onError callback:', e);
      }
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🐛 Error Captured: ${error.type}`);
      console.error('Message:', error.message);
      console.error('Context:', error.context);
      console.error('Stack:', error.stack);
      console.error('Breadcrumbs:', error.breadcrumbs);
      console.groupEnd();
    }

    return error.id;
  }

  private storeError(error: ClientError): void {
    if (!this.config.enableLocalStorage) {
      return;
    }

    try {
      const stored = this.getStoredErrors();
      stored.push(error);

      // Trim if too many
      const trimmed = stored.slice(-this.config.maxStoredErrors);
      
      localStorage.setItem('oppo_stored_errors', JSON.stringify(trimmed));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  private loadStoredErrors(): void {
    const stored = this.getStoredErrors();
    this.errorQueue.push(...stored);
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.config.apiEndpoint) {
      return;
    }

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors })
      });

      if (!response.ok) {
        throw new Error(`Failed to send errors: ${response.status}`);
      }

      // Clear stored errors on successful send
      this.clearStoredErrors();

    } catch (error) {
      // Re-queue errors for retry
      this.errorQueue.unshift(...errors);
      console.warn('Failed to flush errors:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      const context: ErrorContext = {
        url: window.location.href,
        feature: 'global_error_handler'
      };

      if (event.filename) {
        context.component = event.filename;
      }

      this.createClientError(error, ErrorType.JAVASCRIPT_ERROR, ErrorSeverity.HIGH, context);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      const context: ErrorContext = {
        url: window.location.href,
        feature: 'promise_rejection_handler'
      };

      this.reportError(
        this.createClientError(error, ErrorType.PROMISE_REJECTION, ErrorSeverity.HIGH, context)
      );
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        const resourceUrl = (target as any).src || (target as any).href;
        
        if (resourceUrl) {
          const error = new Error(`Failed to load resource: ${resourceUrl}`);
          const context: ErrorContext = {
            url: window.location.href,
            feature: 'resource_loading'
          };

          this.reportError(
            this.createClientError(error, ErrorType.RESOURCE_ERROR, ErrorSeverity.MEDIUM, context)
          );
        }
      }
    }, true);
  }

  private setupConsoleCapture(): void {
    console.error = (...args) => {
      this.addBreadcrumb('console', 'Console Error', 'error', { args });
      return this.originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addBreadcrumb('console', 'Console Warning', 'warning', { args });
      return this.originalConsoleWarn.apply(console, args);
    };
  }

  private setupNetworkCapture(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        this.addBreadcrumb('network', `Fetch: ${args[0]}`, 'info', {
          status: response.status,
          statusText: response.statusText,
          duration
        });

        // Capture network errors
        if (!response.ok) {
          this.captureNetworkError(
            String(args[0]),
            response.status,
            response.statusText
          );
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.addBreadcrumb('network', `Fetch Error: ${args[0]}`, 'error', {
          error: (error as Error).message,
          duration
        });

        this.captureNetworkError(
          String(args[0]),
          0,
          (error as Error).message
        );

        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      (this as any)._errorReporter = { method, url, startTime: Date.now() };
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      const data = (xhr as any)._errorReporter;

      if (data) {
        xhr.addEventListener('load', () => {
          const duration = Date.now() - data.startTime;
          
          ErrorReporter.instance.addBreadcrumb('network', `XHR: ${data.method} ${data.url}`, 'info', {
            status: xhr.status,
            statusText: xhr.statusText,
            duration
          });

          if (xhr.status >= 400) {
            ErrorReporter.instance.captureNetworkError(
              data.url,
              xhr.status,
              xhr.statusText
            );
          }
        });

        xhr.addEventListener('error', () => {
          const duration = Date.now() - data.startTime;
          
          ErrorReporter.instance.addBreadcrumb('network', `XHR Error: ${data.method} ${data.url}`, 'error', {
            duration
          });

          ErrorReporter.instance.captureNetworkError(
            data.url,
            0,
            'Network Error'
          );
        });
      }

      return originalXHRSend.apply(this, args);
    };
  }

  private setupUserInteractionCapture(): void {
    // Capture clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      let elementDescription = target.tagName.toLowerCase();
      
      if (target.id) {
        elementDescription += `#${target.id}`;
      }
      
      if (target.className) {
        elementDescription += `.${target.className.split(' ').join('.')}`;
      }

      this.addBreadcrumb('ui', `Click: ${elementDescription}`, 'info', {
        x: event.clientX,
        y: event.clientY
      });
    });

    // Capture navigation
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        this.addBreadcrumb('navigation', `Navigation: ${currentUrl} → ${window.location.href}`, 'info');
        currentUrl = window.location.href;
      }
    };

    // Check for URL changes periodically
    setInterval(checkUrlChange, 1000);

    // Also capture popstate events
    window.addEventListener('popstate', () => {
      this.addBreadcrumb('navigation', `Popstate: ${window.location.href}`, 'info');
    });
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushErrors();
    }, 30000); // Flush every 30 seconds

    // Also flush when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.flushErrors();
    });
  }

  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }
}

// Export singleton instance and types
export const errorReporter = ErrorReporter.getInstance();
export type { ErrorInfo };