import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface SettingsCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
  onSave: () => void;
  loading?: boolean;
  saveButtonText?: string;
}

export function SettingsCard({
  title,
  description,
  icon,
  children,
  onSave,
  loading = false,
  saveButtonText = "Save Settings"
}: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {saveButtonText}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}