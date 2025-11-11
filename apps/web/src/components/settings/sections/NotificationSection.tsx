import { Bell } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsCard } from '../forms/SettingsCard';
import { FormSection } from '../forms/FormSection';
import { useSettingsApi } from '../hooks/useSettingsApi';
import { SettingsState } from '../hooks/useSettings';
import { NOTIFICATION_FREQUENCIES } from '@oppo/shared';

interface NotificationSectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  toast: any;
}

export function NotificationSection({
  settings,
  updateSetting,
  loading,
  setLoading,
  toast
}: NotificationSectionProps) {
  const { saveSettings } = useSettingsApi(setLoading, toast);

  const handleSave = async () => {
    await saveSettings({
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      notificationFrequency: settings.notificationFrequency,
    }, "Notification settings saved successfully");
  };

  return (
    <SettingsCard
      title="Notification Preferences"
      description="Choose how you want to be notified about new opportunities and application updates"
      icon={<Bell className="h-5 w-5" />}
      onSave={handleSave}
      loading={loading}
      saveButtonText="Save Notification Settings"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications">Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Receive email alerts for new opportunities and application status updates
          </p>
        </div>
        <Switch
          id="email-notifications"
          checked={settings.emailNotifications}
          onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
        />
      </div>

      <FormSection>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive browser notifications for urgent opportunities
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={settings.pushNotifications}
            onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
          />
        </div>
      </FormSection>

      <div className="space-y-2">
        <Label htmlFor="notification-frequency">Notification Frequency</Label>
        <Select
          value={settings.notificationFrequency}
          onValueChange={(value: keyof typeof NOTIFICATION_FREQUENCIES) => updateSetting('notificationFrequency', value.toLowerCase() as 'immediate' | 'daily' | 'weekly')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOTIFICATION_FREQUENCIES.IMMEDIATE}>Immediate</SelectItem>
            <SelectItem value={NOTIFICATION_FREQUENCIES.DAILY}>Daily Digest</SelectItem>
            <SelectItem value={NOTIFICATION_FREQUENCIES.WEEKLY}>Weekly Summary</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          How often you want to receive opportunity notifications
        </p>
      </div>
    </SettingsCard>
  );
}