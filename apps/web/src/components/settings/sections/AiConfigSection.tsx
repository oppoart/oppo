import { Bot } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsCard } from '../forms/SettingsCard';
import { FormSection } from '../forms/FormSection';
import { useSettingsApi } from '../hooks/useSettingsApi';
import { SettingsState } from '../hooks/useSettings';
import {
  AI_PROVIDERS,
  USER_AI_MODELS,
  QUERY_GENERATION_STYLES,
  AI_SETTINGS,
} from '@oppo/shared';

interface AiConfigSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  toast: any;
}

export function AiConfigSection({
  settings,
  updateSetting,
  loading,
  setLoading,
  toast
}: AiConfigSectionProps) {
  const { saveSettings } = useSettingsApi(setLoading, toast);

  const handleSave = async () => {
    await saveSettings({
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      aiTemperature: settings.aiTemperature,
      aiMaxTokens: settings.aiMaxTokens,
      enableQueryCache: settings.enableQueryCache,
      enableAnalysisCache: settings.enableAnalysisCache,
      queryGenerationStyle: settings.queryGenerationStyle,
    }, "AI settings saved successfully");
  };

  return (
    <SettingsCard
      title="AI Configuration"
      description="Configure AI models and behavior for opportunity analysis and query generation"
      icon={<Bot className="h-5 w-5" />}
      onSave={handleSave}
      loading={loading}
      saveButtonText="Save AI Settings"
    >
      {/* AI Provider Selection */}
      <div className="space-y-4">
        <Label className="text-base font-medium">AI Provider</Label>
        <Select 
          value={settings.aiProvider} 
          onValueChange={(value: keyof typeof AI_PROVIDERS) => updateSetting('aiProvider', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select AI Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AI_PROVIDERS.OPENAI}>OpenAI</SelectItem>
            <SelectItem value={AI_PROVIDERS.ANTHROPIC}>Anthropic Claude</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose your preferred AI provider for analysis and query generation
        </p>
      </div>

      <FormSection>
        {/* AI Model Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">AI Model</Label>
          <Select 
            value={settings.aiModel} 
            onValueChange={(value) => updateSetting('aiModel', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {settings.aiProvider === AI_PROVIDERS.OPENAI ? (
                <>
                  <SelectItem value={USER_AI_MODELS.OPENAI.GPT_4}>GPT-4 (Recommended)</SelectItem>
                  <SelectItem value={USER_AI_MODELS.OPENAI.GPT_3_5_TURBO}>GPT-3.5 Turbo (Faster)</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value={USER_AI_MODELS.ANTHROPIC.CLAUDE_3_SONNET}>Claude 3 Sonnet (Recommended)</SelectItem>
                  <SelectItem value={USER_AI_MODELS.ANTHROPIC.CLAUDE_3_HAIKU}>Claude 3 Haiku (Faster)</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Higher-tier models provide better analysis but cost more
          </p>
        </div>
      </FormSection>

      {/* Generation Settings */}
      <div className="space-y-6">
        <Label className="text-base font-medium">Generation Settings</Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ai-temperature">Creativity Level: {settings.aiTemperature}</Label>
            <input
              id="ai-temperature"
              type="range"
              min={String(AI_SETTINGS.TEMPERATURE.MIN)}
              max={String(AI_SETTINGS.TEMPERATURE.MAX)}
              step={String(AI_SETTINGS.TEMPERATURE.STEP)}
              value={settings.aiTemperature}
              onChange={(e) => updateSetting('aiTemperature', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Lower = more focused, Higher = more creative
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-max-tokens">Max Response Length: {settings.aiMaxTokens}</Label>
            <input
              id="ai-max-tokens"
              type="range"
              min={String(AI_SETTINGS.MAX_TOKENS.MIN)}
              max={String(AI_SETTINGS.MAX_TOKENS.MAX)}
              step={String(AI_SETTINGS.MAX_TOKENS.STEP)}
              value={settings.aiMaxTokens}
              onChange={(e) => updateSetting('aiMaxTokens', Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Longer responses provide more detail but cost more
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Query Generation Style</Label>
          <Select 
            value={settings.queryGenerationStyle} 
            onValueChange={(value: keyof typeof QUERY_GENERATION_STYLES) => updateSetting('queryGenerationStyle', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Generation Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUERY_GENERATION_STYLES.FOCUSED}>Focused - Precise, targeted queries</SelectItem>
              <SelectItem value={QUERY_GENERATION_STYLES.DIVERSE}>Diverse - Balanced variety of queries</SelectItem>
              <SelectItem value={QUERY_GENERATION_STYLES.CREATIVE}>Creative - Experimental, broader queries</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <FormSection>
        {/* Caching Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Performance & Caching</Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-query-cache">Enable Query Caching</Label>
                <p className="text-sm text-muted-foreground">Cache generated queries to save costs</p>
              </div>
              <Switch
                id="enable-query-cache"
                checked={settings.enableQueryCache}
                onCheckedChange={(checked) => updateSetting('enableQueryCache', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-analysis-cache">Enable Analysis Caching</Label>
                <p className="text-sm text-muted-foreground">Cache opportunity analysis results</p>
              </div>
              <Switch
                id="enable-analysis-cache"
                checked={settings.enableAnalysisCache}
                onCheckedChange={(checked) => updateSetting('enableAnalysisCache', checked)}
              />
            </div>
          </div>
        </div>
      </FormSection>
    </SettingsCard>
  );
}