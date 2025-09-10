import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authApi from '@/lib/auth-api';

// Mock the auth API
jest.mock('@/lib/auth-api');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component to use the auth context
const TestComponent = () => {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div data-testid="error">{error.message}</div>;
  if (isAuthenticated) return <div data-testid="authenticated">User: {user?.email}</div>;
  return <div data-testid="not-authenticated">Not authenticated</div>;
};

const renderWithProvider = (children: React.ReactNode) => {
  return render(<AuthProvider>{children}</AuthProvider>);
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockedAuthApi.auth.me.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProvider(<TestComponent />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should authenticate user successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      image: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    };

    mockedAuthApi.auth.me.mockResolvedValue({
      success: true,
      message: 'Success',
      user: mockUser
    });

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
    });
  });

  it('should handle authentication failure', async () => {
    mockedAuthApi.auth.me.mockRejectedValue({
      response: { status: 401 }
    });

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('not-authenticated')).toBeInTheDocument();
    });
  });

  it('should handle network errors with retry functionality', async () => {
    const networkError = {
      code: 'NETWORK_ERROR'
    };

    mockedAuthApi.auth.me.mockRejectedValue(networkError);

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });
  });

  it('should retry on 5xx errors', async () => {
    mockedAuthApi.auth.me
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValue({
        success: true,
        message: 'Success',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          image: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      });

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });

    // Should have been called 3 times (original + 2 retries)
    expect(mockedAuthApi.auth.me).toHaveBeenCalledTimes(3);
  });
});