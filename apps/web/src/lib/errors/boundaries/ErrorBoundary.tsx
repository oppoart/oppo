import React, { Component, ReactNode, ErrorInfo } from 'react';
import { errorReporter, ErrorSeverity } from '../ErrorReporter';

interface Props {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'component' | 'feature';
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  resetError: () => void;
  level: string;
}

type ComponentType<P = {}> = React.ComponentType<P>;

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = errorReporter.captureException(error, errorInfo, {
      component: this.props.name || 'ErrorBoundary',
      feature: this.props.level || 'component',
    });

    this.setState({
      errorInfo,
      errorId,
    });

    // Add breadcrumb for error boundary catch
    errorReporter.addBreadcrumb(
      'error_boundary',
      `Error caught by boundary: ${this.props.name || 'Unknown'}`,
      'error',
      {
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      }
    );

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for component-level errors
    if (this.props.level === 'component' && this.state.retryCount < 3) {
      this.scheduleRetry();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetOnPropsChange !== resetOnPropsChange) {
      if (resetOnPropsChange) {
        this.resetError();
      }
    }

    if (hasError && resetKeys && prevProps.resetKeys !== resetKeys) {
      if (resetKeys.some((key, index) => prevProps.resetKeys?.[index] !== key)) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
    });

    errorReporter.addBreadcrumb(
      'error_boundary',
      `Error boundary reset: ${this.props.name || 'Unknown'}`,
      'info'
    );
  };

  private scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff, max 10s

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: prevState.retryCount + 1,
      }));

      errorReporter.addBreadcrumb(
        'error_boundary',
        `Auto-retry attempt ${this.state.retryCount + 1}`,
        'info',
        { delay }
      );
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          resetError={this.resetError}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  retryCount,
  resetError,
  level,
}) => {
  const handleReportError = () => {
    if (error && errorId) {
      // Additional reporting or feedback collection
      errorReporter.addBreadcrumb(
        'user_action',
        'User clicked report error button',
        'info',
        { errorId }
      );
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const isPageLevel = level === 'page';
  const isFeatureLevel = level === 'feature';

  return (
    <div 
      className={`error-boundary-fallback ${level}-level`}
      style={{
        padding: isPageLevel ? '2rem' : '1rem',
        margin: isPageLevel ? '0' : '0.5rem',
        border: isPageLevel ? 'none' : '1px solid #e0e0e0',
        borderRadius: isPageLevel ? '0' : '8px',
        backgroundColor: isPageLevel ? '#f9f9f9' : '#fff',
        textAlign: 'center',
        minHeight: isPageLevel ? '50vh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ maxWidth: '500px' }}>
        {/* Error Icon */}
        <div style={{ fontSize: isPageLevel ? '3rem' : '2rem', marginBottom: '1rem' }}>
          {isPageLevel ? '😵' : '⚠️'}
        </div>

        {/* Error Title */}
        <h2 style={{ 
          fontSize: isPageLevel ? '1.5rem' : '1.2rem',
          color: '#d32f2f',
          marginBottom: '1rem'
        }}>
          {isPageLevel 
            ? 'Something went wrong'
            : isFeatureLevel 
              ? 'Feature temporarily unavailable'
              : 'Component error'
          }
        </h2>

        {/* Error Message */}
        <p style={{ 
          color: '#666',
          marginBottom: '1.5rem',
          lineHeight: '1.5'
        }}>
          {isPageLevel
            ? 'We apologize for the inconvenience. The page encountered an unexpected error.'
            : isFeatureLevel
              ? 'This feature is temporarily unavailable. Please try again later.'
              : 'This component encountered an error and cannot be displayed.'
          }
        </p>

        {/* Error ID for debugging */}
        {process.env.NODE_ENV === 'development' && errorId && (
          <p style={{ 
            fontSize: '0.8rem',
            color: '#999',
            marginBottom: '1rem',
            fontFamily: 'monospace'
          }}>
            Error ID: {errorId}
          </p>
        )}

        {/* Retry information */}
        {retryCount > 0 && (
          <p style={{ 
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '1rem'
          }}>
            Retry attempts: {retryCount}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ 
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {!isPageLevel && (
            <button
              onClick={resetError}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Try Again
            </button>
          )}

          {isPageLevel && (
            <button
              onClick={handleRefresh}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Refresh Page
            </button>
          )}

          <button
            onClick={handleReportError}
            style={{
              padding: isPageLevel ? '0.75rem 1.5rem' : '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: isPageLevel ? '1rem' : '0.9rem'
            }}
          >
            Report Issue
          </button>
        </div>

        {/* Help text */}
        <p style={{ 
          fontSize: '0.8rem',
          color: '#999',
          marginTop: '1.5rem',
          lineHeight: '1.4'
        }}>
          If this problem persists, please{' '}
          <a 
            href="/contact" 
            style={{ color: '#1976d2', textDecoration: 'none' }}
          >
            contact support
          </a>
          {' '}with the error ID above.
        </p>
      </div>
    </div>
  );
};

// Specialized error boundaries for different use cases

// Page-level error boundary
export const PageErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => (
  <ErrorBoundary
    level="page"
    name="PageErrorBoundary"
    onError={onError}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

// Feature-level error boundary
export const FeatureErrorBoundary: React.FC<{
  children: ReactNode;
  featureName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, featureName, onError }) => (
  <ErrorBoundary
    level="feature"
    name={`Feature_${featureName}`}
    onError={onError}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

// Component-level error boundary with auto-retry
export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  componentName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}> = ({ children, componentName, onError, resetKeys }) => (
  <ErrorBoundary
    level="component"
    name={`Component_${componentName}`}
    onError={onError}
    resetKeys={resetKeys}
    resetOnPropsChange={true}
  >
    {children}
  </ErrorBoundary>
);

// Async boundary for handling promise rejections in components
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      errorReporter.captureError(error, {
        feature: 'async_boundary'
      }, ErrorSeverity.HIGH);

      if (onError) {
        onError(error, { componentStack: 'Async operation' });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  return (
    <ErrorBoundary
      level="component"
      name="AsyncErrorBoundary"
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}