import { Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingsCard } from '../forms/SettingsCard';
import { FormSection } from '../forms/FormSection';
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

  return (
    <SettingsCard
      title="API Configuration"
      description="Configure API keys and integrations for OPPO to discover and apply to opportunities"
      icon={<Key className="h-5 w-5" />}
      onSave={handleSave}
      loading={loading}
      saveButtonText="Save API Settings"
    >
      <div className="space-y-2">
        <Label htmlFor="openai-key">OpenAI API Key</Label>
        <Input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={settings.apiKey}
          onChange={(e) => updateSetting('apiKey', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Required for AI-powered opportunity analysis and application generation
        </p>
      </div>

      <FormSection>
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
          <Input
            id="webhook-url"
            placeholder="https://your-app.com/webhook"
            value={settings.webhookUrl}
            onChange={(e) => updateSetting('webhookUrl', e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Receive notifications when new opportunities are found or applications are submitted
          </p>
        </div>
      </FormSection>
    </SettingsCard>
  );
}