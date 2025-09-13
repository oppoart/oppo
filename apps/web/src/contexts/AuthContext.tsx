'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, User } from '@/lib/auth-api';

interface AuthError {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  retryCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkAuth = async (attempt: number = 0): Promise<void> => {
    try {
      setIsLoading(true);
      clearError();
      
      const response = await auth.me();
      if (response.success && response.data) {
        setUser(response.data);
        setRetryCount(0);
      } else {
        setUser(null);
        if (response.message && response.message !== 'Authentication required. Please log in.') {
          setError({
            message: response.message,
            code: 'AUTH_FAILED'
          });
        }
      }
    } catch (err: any) {
      console.log('Auth check failed:', err);
      setUser(null);
      
      const isNetworkError = !err.response || err.code === 'NETWORK_ERROR';
      const is5xxError = err.response?.status >= 500;
      
      if ((isNetworkError || is5xxError) && attempt < MAX_RETRY_ATTEMPTS) {
        setRetryCount(attempt + 1);
        await sleep(RETRY_DELAY * Math.pow(2, attempt)); // Exponential backoff
        return checkAuth(attempt + 1);
      }
      
      if (err.response?.status === 401) {
        // Normal unauthenticated state - don't show as error
        return;
      }
      
      setError({
        message: isNetworkError 
          ? 'Unable to connect to the server. Please check your internet connection.' 
          : err.response?.data?.message || 'Authentication verification failed.',
        code: isNetworkError ? 'NETWORK_ERROR' : 'AUTH_ERROR',
        retry: () => checkAuth(0)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const response = await auth.login(email, password);
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      }
      return { 
        success: false, 
        error: response.message || 'Login failed. Please try again.' 
      };
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError({
        message: errorMessage,
        code: 'LOGIN_FAILED'
      });
      return { success: false, error: errorMessage };
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await auth.logout();
    } catch (error: any) {
      console.error('Logout failed:', error);
      // Don't show logout errors to user since we'll clear state anyway
    } finally {
      // Always clear user state regardless of API call result
      setUser(null);
    }
  };

  const refresh = useCallback(() => {
    return checkAuth(0);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    retryCount,
    login,
    logout: handleLogout,
    clearError,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}