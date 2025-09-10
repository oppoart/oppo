import axios from 'axios';

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export const auth = {
  login: async (email: string): Promise<AuthResponse> => {
    const response = await authApi.post('/api/auth/login', { email });
    return response.data;
  },

  logout: async (): Promise<AuthResponse> => {
    const response = await authApi.post('/api/auth/logout');
    return response.data;
  },

  me: async (): Promise<AuthResponse> => {
    const response = await authApi.get('/api/auth/me');
    return response.data;
  },

  status: async (): Promise<{ success: boolean; authenticated: boolean; session: any }> => {
    const response = await authApi.get('/api/auth/status');
    return response.data;
  },
};

export default authApi;