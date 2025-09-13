import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsCard } from '../forms/SettingsCard';
import { FormSection } from '../forms/FormSection';

export function DataPrivacySection() {
  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Exporting data...');
  };

  const handleClearCache = () => {
    // TODO: Implement cache clearing
    console.log('Clearing cache...');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Data & Privacy</span>
        </CardTitle>
        <CardDescription>
          Manage your data, privacy settings, and export options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Export Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Download all your profile data in JSON format
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleExportData}>
                Export Profiles
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clear Cache</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Clear stored opportunity data and application cache
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleClearCache}>
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </div>

        <FormSection>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Privacy Settings</h3>
            <p className="text-sm text-muted-foreground">
              OPPO processes your data locally and only sends anonymized information to opportunity sources. 
              Your personal information and artist profiles are stored securely and never shared without your consent.
            </p>
          </div>
        </FormSection>
      </CardContent>
    </Card>
  );
}