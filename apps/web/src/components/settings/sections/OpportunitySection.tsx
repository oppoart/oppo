import { Target, DollarSign, MapPin, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SettingsCard } from '../forms/SettingsCard';
import { FormField } from '../forms/FormField';
import { FormSection } from '../forms/FormSection';
import { useSettingsApi } from '../hooks/useSettingsApi';
import { SettingsState } from '../hooks/useSettings';
import {
  APPLICATION_STYLES,
  MATCH_SCORE,
  COMMON_LOCATIONS,
  OPPORTUNITY_TYPES,
} from '@oppo/shared';

interface OpportunitySectionProps {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  toast: any;
}

export function OpportunitySection({
  settings,
  updateSetting,
  loading,
  setLoading,
  toast
}: OpportunitySectionProps) {
  const { saveSettings } = useSettingsApi(setLoading, toast);

  const handleSave = async () => {
    await saveSettings({
      minFundingAmount: settings.minFunding ? parseInt(settings.minFunding) : undefined,
      maxFundingAmount: settings.maxFunding ? parseInt(settings.maxFunding) : undefined,
      preferredLocations: settings.preferredLocations,
      opportunityTypes: settings.opportunityTypes,
      minimumMatchScore: settings.minimumMatchScore,
      enableAutoApplication: settings.enableAutoApplication,
      applicationStyle: settings.applicationStyle,
      includePortfolioLinks: settings.includePortfolioLinks,
    }, "Opportunity preferences saved successfully");
  };

  const toggleLocation = (location: string) => {
    const newLocations = settings.preferredLocations.includes(location)
      ? settings.preferredLocations.filter(l => l !== location)
      : [...settings.preferredLocations, location];
    updateSetting('preferredLocations', newLocations);
  };

  const toggleOpportunityType = (type: string) => {
    const newTypes = settings.opportunityTypes.includes(type)
      ? settings.opportunityTypes.filter(t => t !== type)
      : [...settings.opportunityTypes, type];
    updateSetting('opportunityTypes', newTypes);
  };

  return (
    <SettingsCard
      title="Opportunity Matching Preferences"
      description="Configure how OPPO's AI matches opportunities to your profiles and applies on your behalf"
      icon={<Target className="h-5 w-5" />}
      onSave={handleSave}
      loading={loading}
      saveButtonText="Save Opportunity Preferences"
    >
      {/* Funding Range */}
      <FormField
        label="Funding Range"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        description="Leave blank for no limits. OPPO will focus on opportunities within your specified range."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min-funding">Minimum Amount ($)</Label>
            <Input
              id="min-funding"
              type="number"
              placeholder="e.g., 1000"
              value={settings.minFunding}
              onChange={(e) => updateSetting('minFunding', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-funding">Maximum Amount ($)</Label>
            <Input
              id="max-funding"
              type="number"
              placeholder="e.g., 50000"
              value={settings.maxFunding}
              onChange={(e) => updateSetting('maxFunding', e.target.value)}
            />
          </div>
        </div>
      </FormField>

      <FormSection>
        {/* Preferred Locations */}
        <FormField
          label="Preferred Locations"
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {COMMON_LOCATIONS.map((location) => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={`location-${location}`}
                  checked={settings.preferredLocations.includes(location)}
                  onCheckedChange={() => toggleLocation(location)}
                />
                <Label 
                  htmlFor={`location-${location}`}
                  className="text-sm cursor-pointer"
                >
                  {location}
                </Label>
              </div>
            ))}
          </div>
        </FormField>
      </FormSection>

      <FormSection>
        {/* Opportunity Types */}
        <FormField
          label="Opportunity Types"
          icon={<Filter className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {OPPORTUNITY_TYPES.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={settings.opportunityTypes.includes(type)}
                  onCheckedChange={() => toggleOpportunityType(type)}
                />
                <Label 
                  htmlFor={`type-${type}`}
                  className="text-sm cursor-pointer capitalize"
                >
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </FormField>
      </FormSection>

      {/* AI Matching Settings */}
      <div className="space-y-4">
        <Label className="text-base font-medium">AI Matching Settings</Label>
        
        <div className="space-y-2">
          <Label htmlFor="match-score">
            Minimum Match Score: {(settings.minimumMatchScore * 100).toFixed(0)}%
          </Label>
          <input
            id="match-score"
            type="range"
            min={String(MATCH_SCORE.MIN)}
            max={String(MATCH_SCORE.MAX)}
            step={String(MATCH_SCORE.STEP)}
            value={settings.minimumMatchScore}
            onChange={(e) => updateSetting('minimumMatchScore', parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Only show opportunities that match your profiles with at least this confidence score
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-application">Enable Auto-Application</Label>
            <p className="text-sm text-muted-foreground">
              Automatically apply to high-matching opportunities ({Math.round(MATCH_SCORE.AUTO_APPLICATION_THRESHOLD * 100)}%+ match score)
            </p>
          </div>
          <Switch
            id="auto-application"
            checked={settings.enableAutoApplication}
            onCheckedChange={(checked) => updateSetting('enableAutoApplication', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="application-style">Application Style</Label>
          <Select 
            value={settings.applicationStyle} 
            onValueChange={(value: keyof typeof APPLICATION_STYLES) => updateSetting('applicationStyle', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={APPLICATION_STYLES.FORMAL}>Formal & Professional</SelectItem>
              <SelectItem value={APPLICATION_STYLES.CASUAL}>Casual & Conversational</SelectItem>
              <SelectItem value={APPLICATION_STYLES.ARTISTIC}>Creative & Artistic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="portfolio-links">Include Portfolio Links</Label>
            <p className="text-sm text-muted-foreground">
              Automatically include relevant portfolio links in applications
            </p>
          </div>
          <Switch
            id="portfolio-links"
            checked={settings.includePortfolioLinks}
            onCheckedChange={(checked) => updateSetting('includePortfolioLinks', checked)}
          />
        </div>
      </div>
    </SettingsCard>
  );
}