import { Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormCard, FormField } from '@/components/ui/shared';
import { useSettingsApi } from '../hooks/useSettingsApi';
import { SettingsState } from '../hooks/useSettings';

interface ApiSettingsSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  toast: any;
}

export function ApiSettingsSection({
  settings,
  updateSetting,
  loading,
  setLoading,
  toast
}: ApiSettingsSectionProps) {
  const { saveSettings } = useSettingsApi(setLoading, toast);

  const handleSave = async () => {
    await saveSettings({
      openaiApiKey: settings.apiKey || undefined,
      webhookUrl: settings.webhookUrl || undefined,
    }, "API settings saved successfully");
  };

  const validateApiKey = (key: string) => {
    if (!key) return { state: 'idle' as const };
    if (!key.startsWith('sk-')) return { state: 'invalid' as const, error: 'API key must start with "sk-"' };
    if (key.length < 20) return { state: 'invalid' as const, error: 'API key appears to be too short' };
    return { state: 'valid' as const, success: 'API key format looks correct' };
  };

  const validateWebhookUrl = (url: string) => {
    if (!url) return { state: 'idle' as const };
    try {
      new URL(url);
      return { state: 'valid' as const, success: 'Valid URL format' };
    } catch {
      return { state: 'invalid' as const, error: 'Please enter a valid URL' };
    }
  };

  const apiKeyValidation = validateApiKey(settings.apiKey || '');
  const webhookValidation = validateWebhookUrl(settings.webhookUrl || '');

  const hasValidationErrors = apiKeyValidation.state === 'invalid' || webhookValidation.state === 'invalid';

  return (
    <FormCard
      title="API Configuration"
      description="Configure API keys and integrations for OPPO to discover and apply to opportunities"
      icon={<Key className="h-5 w-5" />}
      onSave={handleSave}
      loading={loading}
      saveButtonText="Save API Settings"
      validationState={hasValidationErrors ? 'invalid' : apiKeyValidation.state === 'valid' ? 'valid' : 'idle'}
    >
      <FormField
        label="OpenAI API Key"
        description="Your OpenAI API key for AI-powered opportunity analysis and matching"
        required
        validationState={apiKeyValidation.state}
        errorMessage={apiKeyValidation.error}
        successMessage={apiKeyValidation.success}
        helpText="Keep your API key secure and never share it publicly"
        htmlFor="openai-key"
      >
        <Input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={settings.apiKey}
          onChange={(e) => updateSetting('apiKey', e.target.value)}
        />
      </FormField>

      <FormField
        label="Webhook URL"
        description="Optional webhook endpoint for receiving opportunity notifications"
        validationState={webhookValidation.state}
        errorMessage={webhookValidation.error}
        successMessage={webhookValidation.success}
        helpText="This will be called when new opportunities are found"
        htmlFor="webhook-url"
      >
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://your-app.com/webhook"
          value={settings.webhookUrl}
          onChange={(e) => updateSetting('webhookUrl', e.target.value)}
        />
      </FormField>
    </FormCard>
  );
}