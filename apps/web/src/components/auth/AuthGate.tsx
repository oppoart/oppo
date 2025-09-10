'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGateProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGate({ children, fallback }: AuthGateProps) {
  const { isAuthenticated, isLoading, error, retryCount, clearError, refresh } = useAuth();
  const pathname = usePathname();

  // Track page visits for analytics/debugging
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !error) {
      console.log(`Redirecting from ${pathname} - user not authenticated`);
    }
  }, [isLoading, isAuthenticated, pathname, error]);

  // Show loading spinner during auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner className="mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading OPPO</h2>
            <p className="text-muted-foreground">
              {retryCount > 0 
                ? `Retrying connection... (${retryCount}/3)`
                : 'Verifying your authentication...'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (error && error.code !== 'LOGIN_FAILED') {
    const isNetworkError = error.code === 'NETWORK_ERROR';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            {isNetworkError ? (
              <WifiOff className="h-8 w-8 text-destructive" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {isNetworkError ? 'Connection Problem' : 'Authentication Error'}
            </h2>
            <p className="text-muted-foreground">{error.message}</p>
          </div>

          <div className="space-y-3">
            {error.retry && (
              <Button 
                onClick={() => error.retry!()} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={clearError}
              className="w-full"
            >
              Continue to Login
            </Button>
          </div>

          {isNetworkError && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Make sure you're connected to the internet</p>
              <p>Check if the server is running on port 3001</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show login form or custom fallback if not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginForm />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}