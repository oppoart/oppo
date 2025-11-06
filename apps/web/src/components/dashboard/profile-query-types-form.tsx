'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArtistProfile, UpdateProfileRequest } from '@/types/profile';
import { QueryTemplateGroup } from '@/types/query-template';
import { queryTemplatesApi, profileApi } from '@/lib/api';
import { generateExample } from '@/lib/query-template-utils';
import { QueryTemplateManager } from './query-template-manager';

interface ProfileQueryTypesFormProps {
  profile: ArtistProfile;
  onProfileUpdate: (profile: ArtistProfile) => void;
}

export function ProfileQueryTypesForm({ profile, onProfileUpdate }: ProfileQueryTypesFormProps) {
  const [groups, setGroups] = useState<QueryTemplateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showManager, setShowManager] = useState(false);

  // Query parameters state
  const [locations, setLocations] = useState<string[]>(profile.locations || []);
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(profile.opportunityTypes || []);
  const [amountRanges, setAmountRanges] = useState<string[]>(profile.amountRanges || []);
  const [themes, setThemes] = useState<string[]>(profile.themes || []);

  // Input state for adding new items
  const [newLocation, setNewLocation] = useState('');
  const [newOpportunityType, setNewOpportunityType] = useState('');
  const [newAmountRange, setNewAmountRange] = useState('');
  const [newTheme, setNewTheme] = useState('');

  // Load groups
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
  }, [locations, opportunityTypes, amountRanges, themes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const groupsData = await queryTemplatesApi.getGroups();
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading query templates:', err);
      setError('Failed to load query templates');
    } finally {
      setLoading(false);
    }
  };

  // Tag management helpers
  const addTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, currentTags: string[]) => {
    const trimmed = value.trim();
    if (trimmed && !currentTags.includes(trimmed)) {
      setter([...currentTags, trimmed]);
      return true;
    }
    return false;
  };

  const removeTag = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, currentTags: string[]) => {
    setter(currentTags.filter(tag => tag !== value));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const hasChanges = () => {
    return JSON.stringify(locations.sort()) !== JSON.stringify((profile.locations || []).sort()) ||
           JSON.stringify(opportunityTypes.sort()) !== JSON.stringify((profile.opportunityTypes || []).sort()) ||
           JSON.stringify(amountRanges.sort()) !== JSON.stringify((profile.amountRanges || []).sort()) ||
           JSON.stringify(themes.sort()) !== JSON.stringify((profile.themes || []).sort());
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const request: UpdateProfileRequest = {
        locations,
        opportunityTypes,
        amountRanges,
        themes,
      };

      const updatedProfile = await profileApi.updateProfile(profile.id, request);
      onProfileUpdate(updatedProfile);
      setSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving query parameters:', err);
      setError('Failed to save query parameters');
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
      <div className="space-y-6">
        {/* Query Parameters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Query Parameters</CardTitle>
            <CardDescription>
              Define your search preferences to generate targeted queries for finding opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Locations */}
            <div>
              <Label className="text-base font-medium">Locations</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Add geographic locations where you're looking for opportunities (e.g., "New York", "Europe", "Online")
              </p>

              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="e.g., New York, Berlin, Remote..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, () => {
                    if (addTag(newLocation, setLocations, locations)) {
                      setNewLocation('');
                    }
                  })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (addTag(newLocation, setLocations, locations)) {
                      setNewLocation('');
                    }
                  }}
                  disabled={!newLocation.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {locations.map((location, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {location}
                    <button
                      onClick={() => removeTag(location, setLocations, locations)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {locations.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No locations added yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Opportunity Types */}
            <div>
              <Label className="text-base font-medium">Opportunity Types</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select types of opportunities you're interested in (e.g., "grant", "residency", "exhibition")
              </p>

              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="e.g., grant, residency, exhibition, award..."
                  value={newOpportunityType}
                  onChange={(e) => setNewOpportunityType(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, () => {
                    if (addTag(newOpportunityType, setOpportunityTypes, opportunityTypes)) {
                      setNewOpportunityType('');
                    }
                  })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (addTag(newOpportunityType, setOpportunityTypes, opportunityTypes)) {
                      setNewOpportunityType('');
                    }
                  }}
                  disabled={!newOpportunityType.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {opportunityTypes.map((type, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {type}
                    <button
                      onClick={() => removeTag(type, setOpportunityTypes, opportunityTypes)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {opportunityTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No opportunity types added yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Amount Ranges */}
            <div>
              <Label className="text-base font-medium">Amount Ranges</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Specify funding ranges you're targeting (e.g., "$1k-5k", "$10k+", "any")
              </p>

              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="e.g., $1k-5k, $10k-20k, $50k+..."
                  value={newAmountRange}
                  onChange={(e) => setNewAmountRange(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, () => {
                    if (addTag(newAmountRange, setAmountRanges, amountRanges)) {
                      setNewAmountRange('');
                    }
                  })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (addTag(newAmountRange, setAmountRanges, amountRanges)) {
                      setNewAmountRange('');
                    }
                  }}
                  disabled={!newAmountRange.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {amountRanges.map((range, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {range}
                    <button
                      onClick={() => removeTag(range, setAmountRanges, amountRanges)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {amountRanges.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No amount ranges added yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Themes & Subjects */}
            <div>
              <Label className="text-base font-medium">Themes & Subjects</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Add thematic interests or subjects for your work (e.g., "sustainability", "identity", "technology")
              </p>

              <div className="flex space-x-2 mb-3">
                <Input
                  placeholder="e.g., sustainability, identity, urban art..."
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, () => {
                    if (addTag(newTheme, setThemes, themes)) {
                      setNewTheme('');
                    }
                  })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (addTag(newTheme, setThemes, themes)) {
                      setNewTheme('');
                    }
                  }}
                  disabled={!newTheme.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {themes.map((theme, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {theme}
                    <button
                      onClick={() => removeTag(theme, setThemes, themes)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {themes.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No themes added yet</p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">Query parameters saved successfully!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Templates Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Query Templates</CardTitle>
                <CardDescription>
                  Available search query templates. Your parameters above will be used to generate specific queries.
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
                <h3 className="text-sm font-semibold text-gray-900">{group.name}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.templates.map((template) => {
                    const example = generateExample(template, profile);
                    return (
                      <div
                        key={template.id}
                        className="bg-gray-50 p-3 rounded-md border border-gray-200"
                      >
                        <code className="text-xs block mb-2 font-mono text-gray-800">
                          {template.template}
                        </code>
                        <p className="text-xs text-gray-600">
                          Example: "{example}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No query templates available
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowManager(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Create Templates
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Query Template Manager Modal */}
      <QueryTemplateManager
        open={showManager}
        onOpenChange={setShowManager}
        onUpdate={loadData}
      />
    </>
  );
}
