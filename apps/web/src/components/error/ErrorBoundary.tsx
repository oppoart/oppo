'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error reporting service
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      userId: this.getUserId(),
    };

    try {
      // Multiple error reporting strategies
      await Promise.allSettled([
        this.reportToSentry(error, errorInfo),
        this.reportToCustomAPI(errorReport),
        this.reportToLocalStorage(errorReport),
      ]);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private reportToSentry = async (error: Error, errorInfo: ErrorInfo) => {
    // Check if Sentry is available (can be dynamically imported)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      Sentry.withScope((scope: any) => {
        scope.setTag('errorBoundary', true);
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }
  };

  private reportToCustomAPI = async (errorReport: any) => {
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        });
      } catch (apiError) {
        console.warn('Failed to report error to API:', apiError);
      }
    }
  };

  private reportToLocalStorage = (errorReport: any) => {
    try {
      if (typeof window !== 'undefined') {
        const key = `error_${Date.now()}`;
        const errors = JSON.parse(localStorage.getItem('errorReports') || '[]');
        errors.push({ key, ...errorReport });
        
        // Keep only last 10 errors to prevent storage overflow
        const recentErrors = errors.slice(-10);
        localStorage.setItem('errorReports', JSON.stringify(recentErrors));
      }
    } catch (storageError) {
      console.warn('Failed to store error locally:', storageError);
    }
  };

  private getUserId = (): string | null => {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // Check localStorage/sessionStorage for user data
      try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          return user?.id || user?.email || null;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    return null;
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. The issue has been logged and we'll look into it.
              </CardDescription>
            </CardHeader>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-mono text-muted-foreground">
                      {this.state.error.toString()}
                    </p>
                  </div>
                  
                  {this.state.error.stack && (
                    <details className="cursor-pointer">
                      <summary className="text-sm text-muted-foreground hover:text-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <details className="cursor-pointer">
                      <summary className="text-sm text-muted-foreground hover:text-foreground">
                        View component stack
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            )}
            
            <CardFooter className="flex gap-2">
              <Button 
                onClick={this.handleReset}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use with hooks
export const ErrorBoundaryWrapper: React.FC<Props> = ({ children, ...props }) => {
  const router = useRouter();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Custom error handling logic
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary {...props} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;