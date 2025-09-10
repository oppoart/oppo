export interface UserPreferences {
  // Opportunity matching preferences
  minFundingAmount?: number;
  maxFundingAmount?: number;
  preferredLocations: string[];
  opportunityTypes: string[];
  
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  
  // AI matching preferences
  minimumMatchScore: number;
  enableAutoApplication: boolean;
  
  // Application preferences
  applicationStyle: 'formal' | 'casual' | 'artistic';
  includePortfolioLinks: boolean;
  
  // API settings
  openaiApiKey?: string;
  webhookUrl?: string;
}

export interface UserSettings {
  // General app settings
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  profiles?: {
    id: string;
    name: string;
    mediums: string[];
  }[];
}

export interface UserWithPreferences {
  user: User;
  preferences: UserPreferences;
  settings: UserSettings;
}

export const OPPORTUNITY_TYPES = [
  'grant',
  'residency',
  'exhibition',
  'commission',
  'competition',
  'fellowship',
  'award',
  'workshop',
  'mentorship',
  'collaboration'
] as const;

export const COMMON_LOCATIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Italy',
  'Spain',
  'Japan',
  'South Korea',
  'International',
  'Online'
] as const;