import axios from 'axios';
import { ArtistProfile, CreateProfileRequest, UpdateProfileRequest } from '@/types/profile';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;