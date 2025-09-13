'use client';

import { TabsContent } from '@/components/ui/tabs';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { OpportunitySection } from '@/components/settings/sections/OpportunitySection';
import { AiConfigSection } from '@/components/settings/sections/AiConfigSection';
import { ApiSettingsSection } from '@/components/settings/sections/ApiSettingsSection';
import { NotificationSection } from '@/components/settings/sections/NotificationSection';
import { DataPrivacySection } from '@/components/settings/sections/DataPrivacySection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
import { useSettings } from '@/components/settings/hooks/useSettings';

export default function SettingsPage() {
  const { settings, updateSetting, loading, setLoading, initialLoading, toast } = useSettings();

  return (
    <SettingsLayout initialLoading={initialLoading}>
      <TabsContent value="opportunities">
        <OpportunitySection
          settings={settings}
          updateSetting={updateSetting}
          loading={loading}
          setLoading={setLoading}
          toast={toast}
        />
      </TabsContent>

      <TabsContent value="ai">
        <AiConfigSection
          settings={settings}
          updateSetting={updateSetting}
          loading={loading}
          setLoading={setLoading}
          toast={toast}
        />
      </TabsContent>

      <TabsContent value="api">
        <ApiSettingsSection
          settings={settings}
          updateSetting={updateSetting}
          loading={loading}
          setLoading={setLoading}
          toast={toast}
        />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationSection
          settings={settings}
          updateSetting={updateSetting}
          loading={loading}
          setLoading={setLoading}
          toast={toast}
        />
      </TabsContent>

      <TabsContent value="data">
        <DataPrivacySection />
      </TabsContent>

      <TabsContent value="appearance">
        <AppearanceSection />
      </TabsContent>
    </SettingsLayout>
  );
}