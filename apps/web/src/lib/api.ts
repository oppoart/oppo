import axios, { AxiosError } from 'axios';
import { ArtistProfile, CreateProfileRequest, UpdateProfileRequest } from '@/types/profile';
import { handleApiError, isAuthError } from './error-handler';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle authentication errors globally
    if (isAuthError(error)) {
      // Redirect to login if not authenticated
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    // Process and enhance error
    const apiError = handleApiError(error, false); // Don't show toast here, let the component decide
    return Promise.reject(apiError);
  }
);

export const profileApi = {
  // Get all artist profiles for user
  getProfiles: async (): Promise<ArtistProfile[]> => {
    const response = await api.get('/api/profiles');
    return response.data.data; // Backend returns { success: true, data: [...] }
  },

  // Get specific artist profile
  getProfile: async (id: string): Promise<ArtistProfile> => {
    const response = await api.get(`/api/profiles/${id}`);
    return response.data.data; // Backend returns { success: true, data: {...} }
  },

  // Create new artist profile
  createProfile: async (profile: CreateProfileRequest): Promise<ArtistProfile> => {
    const response = await api.post('/api/profiles', profile);
    return response.data.data; // Backend returns { success: true, data: {...} }
  },

  // Update specific artist profile
  updateProfile: async (id: string, updates: UpdateProfileRequest): Promise<ArtistProfile> => {
    try {
      const response = await api.put(`/api/profiles/${id}`, updates);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error: any) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // Delete artist profile
  deleteProfile: async (id: string): Promise<void> => {
    await api.delete(`/api/profiles/${id}`);
  },
};

// User preferences API
export const userApi = {
  // Get current user info
  getMe: async () => {
    const response = await api.get('/api/users/me');
    return response.data.data;
  },

  // Get user preferences
  getPreferences: async () => {
    const response = await api.get('/api/users/me/preferences');
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (preferences: any) => {
    const response = await api.put('/api/users/me/preferences', { preferences });
    return response.data.data;
  },
};

export default api;