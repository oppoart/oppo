import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface SettingsLayoutProps {
  children: ReactNode;
  defaultTab?: string;
  initialLoading?: boolean;
}

export function SettingsLayout({
  children,
  defaultTab = "opportunities",
  initialLoading = false
}: SettingsLayoutProps) {
  if (initialLoading) {
    return (
      <DashboardLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      currentPage="settings"
      title="Settings"
    >
      <div className="max-w-4xl">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6">
            <TabsTrigger value="opportunities" className="text-xs sm:text-sm">Opportunities</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs sm:text-sm">AI</TabsTrigger>
            <TabsTrigger value="api" className="text-xs sm:text-sm">API</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm">Privacy</TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">Theme</TabsTrigger>
          </TabsList>
          {children}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}