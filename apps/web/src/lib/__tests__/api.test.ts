import axios from 'axios';
import { profileApi } from '../api';
import { ArtistProfile } from '@/types/profile';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the axios instance
const mockedApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

// Mock axios.create to return our mocked instance
mockedAxios.create.mockReturnValue(mockedApi as any);

describe('Profile API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfiles', () => {
    it('should fetch profiles successfully', async () => {
      const mockProfiles: ArtistProfile[] = [
        {
          id: '1',
          userId: 'user1',
          name: 'Digital Art Portfolio',
          mediums: ['digital art'],
          bio: 'Test bio',
          skills: ['photoshop'],
          interests: ['ai art'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockedApi.get.mockResolvedValue({
        data: { success: true, data: mockProfiles },
      });

      const result = await profileApi.getProfiles();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/profiles');
      expect(result).toEqual(mockProfiles);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network Error');
      mockedApi.get.mockRejectedValue(error);

      await expect(profileApi.getProfiles()).rejects.toThrow('Network Error');
    });
  });

  describe('createProfile', () => {
    it('should create profile successfully', async () => {
      const newProfile = {
        name: 'New Portfolio',
        mediums: ['painting'] as any,
      };

      const mockResponse: ArtistProfile = {
        id: '2',
        userId: 'user1',
        name: 'New Portfolio',
        mediums: ['painting'],
        bio: null,
        skills: [],
        interests: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockedApi.post.mockResolvedValue({
        data: { success: true, data: mockResponse },
      });

      const result = await profileApi.createProfile(newProfile);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/profiles', newProfile);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const profileId = '1';
      const updates = { name: 'Updated Portfolio' };
      const mockResponse: ArtistProfile = {
        id: '1',
        userId: 'user1',
        name: 'Updated Portfolio',
        mediums: ['digital art'],
        bio: null,
        skills: [],
        interests: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockedApi.put.mockResolvedValue({
        data: { success: true, data: mockResponse },
      });

      const result = await profileApi.updateProfile(profileId, updates);

      expect(mockedApi.put).toHaveBeenCalledWith(`/api/profiles/${profileId}`, updates);
      expect(result).toEqual(mockResponse);
    });

    it('should log detailed error information on failure', async () => {
      const profileId = '1';
      const updates = { name: 'Updated Portfolio' };
      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Validation failed' },
        },
        message: 'Request failed',
      };

      mockedApi.put.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(profileApi.updateProfile(profileId, updates)).rejects.toEqual(error);

      expect(consoleSpy).toHaveBeenCalledWith('API Error details:', {
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Validation failed' },
        message: 'Request failed',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      const profileId = '1';

      mockedApi.delete.mockResolvedValue({
        data: { success: true },
      });

      await profileApi.deleteProfile(profileId);

      expect(mockedApi.delete).toHaveBeenCalledWith(`/api/profiles/${profileId}`);
    });
  });
});