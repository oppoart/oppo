import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/lib/api';
import {
  NOTIFICATION_FREQUENCIES,
  APPLICATION_STYLES,
  AI_PROVIDERS,
  USER_AI_MODELS,
  QUERY_GENERATION_STYLES,
  AI_SETTINGS,
  MATCH_SCORE,
} from '@oppo/shared';

export interface SettingsState {
  // API Settings
  apiKey: string;
  webhookUrl: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: keyof typeof NOTIFICATION_FREQUENCIES;
  
  // Opportunity Preferences
  minFunding: string;
  maxFunding: string;
  preferredLocations: string[];
  opportunityTypes: string[];
  minimumMatchScore: number;
  enableAutoApplication: boolean;
  applicationStyle: keyof typeof APPLICATION_STYLES;
  includePortfolioLinks: boolean;

  // AI Configuration Settings
  aiProvider: keyof typeof AI_PROVIDERS;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  enableQueryCache: boolean;
  enableAnalysisCache: boolean;
  queryGenerationStyle: keyof typeof QUERY_GENERATION_STYLES;
}

export function useSettings() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const [settings, setSettings] = useState<SettingsState>({
    // API Settings
    apiKey: '',
    webhookUrl: '',
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: false,
    notificationFrequency: NOTIFICATION_FREQUENCIES.DAILY,
    
    // Opportunity Preferences
    minFunding: '',
    maxFunding: '',
    preferredLocations: [],
    opportunityTypes: [],
    minimumMatchScore: MATCH_SCORE.DEFAULT,
    enableAutoApplication: false,
    applicationStyle: APPLICATION_STYLES.FORMAL,
    includePortfolioLinks: true,

    // AI Configuration Settings
    aiProvider: AI_PROVIDERS.OPENAI,
    aiModel: USER_AI_MODELS.OPENAI.GPT_4,
    aiTemperature: AI_SETTINGS.TEMPERATURE.DEFAULT,
    aiMaxTokens: AI_SETTINGS.MAX_TOKENS.DEFAULT,
    enableQueryCache: true,
    enableAnalysisCache: true,
    queryGenerationStyle: QUERY_GENERATION_STYLES.DIVERSE,
  });

  const updateSetting = <K extends keyof SettingsState>(
    key: K, 
    value: SettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const loadPreferences = async () => {
    try {
      setInitialLoading(true);
      const data = await userApi.getPreferences();
      const prefs = data.preferences;
      
      setSettings({
        // API Settings
        apiKey: prefs.openaiApiKey || '',
        webhookUrl: prefs.webhookUrl || '',
        
        // Notifications
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
        notificationFrequency: prefs.notificationFrequency,
        
        // Opportunity Preferences
        minFunding: prefs.minFundingAmount?.toString() || '',
        maxFunding: prefs.maxFundingAmount?.toString() || '',
        preferredLocations: prefs.preferredLocations || [],
        opportunityTypes: prefs.opportunityTypes || [],
        minimumMatchScore: prefs.minimumMatchScore,
        enableAutoApplication: prefs.enableAutoApplication,
        applicationStyle: prefs.applicationStyle,
        includePortfolioLinks: prefs.includePortfolioLinks,

        // AI Configuration
        aiProvider: prefs.aiProvider || AI_PROVIDERS.OPENAI,
        aiModel: prefs.aiModel || USER_AI_MODELS.OPENAI.GPT_4,
        aiTemperature: prefs.aiTemperature || AI_SETTINGS.TEMPERATURE.DEFAULT,
        aiMaxTokens: prefs.aiMaxTokens || AI_SETTINGS.MAX_TOKENS.DEFAULT,
        enableQueryCache: prefs.enableQueryCache ?? true,
        enableAnalysisCache: prefs.enableAnalysisCache ?? true,
        queryGenerationStyle: prefs.queryGenerationStyle || QUERY_GENERATION_STYLES.DIVERSE,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return {
    settings,
    updateSetting,
    loading,
    setLoading,
    initialLoading,
    toast,
  };
}