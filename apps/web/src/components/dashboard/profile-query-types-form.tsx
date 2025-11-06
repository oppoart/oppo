'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from 'lucide-react';
import { ArtistProfile } from '@/types/profile';
import { QueryTemplateGroup } from '@/types/query-template';
import { queryTemplatesApi } from '@/lib/api';
import { generateExample } from '@/lib/query-template-utils';
import { QueryTemplateManager } from './query-template-manager';

interface ProfileQueryTypesFormProps {
  profile: ArtistProfile;
  onProfileUpdate: (profile: ArtistProfile) => void;
}

export function ProfileQueryTypesForm({ profile, onProfileUpdate }: ProfileQueryTypesFormProps) {
  const [groups, setGroups] = useState<QueryTemplateGroup[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showManager, setShowManager] = useState(false);

  // Load groups and user selections
  useEffect(() => {
    loadData();
  }, []);

  // Listen for global save event
  useEffect(() => {
    const handleSaveAll = () => {
      handleSave();
    };

    window.addEventListener('saveAllForms', handleSaveAll);
    return () => window.removeEventListener('saveAllForms', handleSaveAll);
  }, [selectedTemplateIds]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, userTemplates] = await Promise.all([
        queryTemplatesApi.getGroups(),
        queryTemplatesApi.getUserTemplates(),
      ]);

      setGroups(groupsData);
      setSelectedTemplateIds(userTemplates.map((t: any) => t.id));
    } catch (err) {
      console.error('Error loading query templates:', err);
      setError('Failed to load query templates');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await queryTemplatesApi.updateUserTemplates(selectedTemplateIds);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving query templates:', err);
      setError('Failed to save query templates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading query templates...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Query Types</CardTitle>
              <CardDescription>
                Select search query templates for finding opportunities
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManager(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{group.name}</h3>
                {group.description && (
                  <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.templates.map((template) => {
                  const example = generateExample(template, profile);
                  const isSelected = selectedTemplateIds.includes(template.id);

                  return (
                    <div
                      key={template.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        id={template.id}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleTemplate(template.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={template.id}
                          className="text-sm font-medium cursor-pointer block"
                        >
                          <code className="text-xs">{template.template}</code>
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          Example: "{example}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">Query templates saved successfully!</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>Selected: {selectedTemplateIds.length} templates</p>
          </div>
        </CardContent>
      </Card>

      {/* Query Template Manager Modal */}
      <QueryTemplateManager
        open={showManager}
        onOpenChange={setShowManager}
        onUpdate={loadData}
      />
    </>
  );
}
