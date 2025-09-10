'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Key, Database, Bell, Palette, Target, DollarSign, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UserPreferences, OPPORTUNITY_TYPES, COMMON_LOCATIONS } from '@/types/user';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();
  
  // API Settings
  const [apiKey, setApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [notificationFrequency, setNotificationFrequency] = useState<'immediate' | 'daily' | 'weekly'>('daily');
  
  // Opportunity Preferences
  const [minFunding, setMinFunding] = useState<string>('');
  const [maxFunding, setMaxFunding] = useState<string>('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>([]);
  const [minimumMatchScore, setMinimumMatchScore] = useState(0.7);
  const [enableAutoApplication, setEnableAutoApplication] = useState(false);
  const [applicationStyle, setApplicationStyle] = useState<'formal' | 'casual' | 'artistic'>('formal');
  const [includePortfolioLinks, setIncludePortfolioLinks] = useState(true);

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setInitialLoading(true);
      const data = await userApi.getPreferences();
      const prefs = data.preferences;
      
      // API Settings
      setApiKey(prefs.openaiApiKey || '');
      setWebhookUrl(prefs.webhookUrl || '');
      
      // Notifications
      setEmailNotifications(prefs.emailNotifications);
      setPushNotifications(prefs.pushNotifications);
      setNotificationFrequency(prefs.notificationFrequency);
      
      // Opportunity Preferences
      setMinFunding(prefs.minFundingAmount?.toString() || '');
      setMaxFunding(prefs.maxFundingAmount?.toString() || '');
      setPreferredLocations(prefs.preferredLocations || []);
      setOpportunityTypes(prefs.opportunityTypes || []);
      setMinimumMatchScore(prefs.minimumMatchScore);
      setEnableAutoApplication(prefs.enableAutoApplication);
      setApplicationStyle(prefs.applicationStyle);
      setIncludePortfolioLinks(prefs.includePortfolioLinks);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSaveApiSettings = async () => {
    setLoading(true);
    try {
      await userApi.updatePreferences({
        openaiApiKey: apiKey || undefined,
        webhookUrl: webhookUrl || undefined,
      });
      toast({
        title: "Success",
        description: "API settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setLoading(true);
    try {
      await userApi.updatePreferences({
        emailNotifications,
        pushNotifications,
        notificationFrequency,
      });
      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpportunityPreferences = async () => {
    setLoading(true);
    try {
      await userApi.updatePreferences({
        minFundingAmount: minFunding ? parseInt(minFunding) : undefined,
        maxFundingAmount: maxFunding ? parseInt(maxFunding) : undefined,
        preferredLocations,
        opportunityTypes,
        minimumMatchScore,
        enableAutoApplication,
        applicationStyle,
        includePortfolioLinks,
      });
      toast({
        title: "Success",
        description: "Opportunity preferences saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save opportunity preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (location: string) => {
    setPreferredLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const toggleOpportunityType = (type: string) => {
    setOpportunityTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

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
        <Tabs defaultValue="opportunities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="opportunities" className="text-xs sm:text-sm">Opportunities</TabsTrigger>
            <TabsTrigger value="api" className="text-xs sm:text-sm">API</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm">Privacy</TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs sm:text-sm">Theme</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Opportunity Matching Preferences</span>
                </CardTitle>
                <CardDescription>
                  Configure how OPPO's AI matches opportunities to your profiles and applies on your behalf
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Funding Range */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">Funding Range</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min-funding">Minimum Amount ($)</Label>
                      <Input
                        id="min-funding"
                        type="number"
                        placeholder="e.g., 1000"
                        value={minFunding}
                        onChange={(e) => setMinFunding(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-funding">Maximum Amount ($)</Label>
                      <Input
                        id="max-funding"
                        type="number"
                        placeholder="e.g., 50000"
                        value={maxFunding}
                        onChange={(e) => setMaxFunding(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Leave blank for no limits. OPPO will focus on opportunities within your specified range.
                  </p>
                </div>

                <Separator />

                {/* Preferred Locations */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">Preferred Locations</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {COMMON_LOCATIONS.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location}`}
                          checked={preferredLocations.includes(location)}
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
                </div>

                <Separator />

                {/* Opportunity Types */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-base font-medium">Opportunity Types</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {OPPORTUNITY_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={opportunityTypes.includes(type)}
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
                </div>

                <Separator />

                {/* AI Matching Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">AI Matching Settings</Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="match-score">Minimum Match Score: {(minimumMatchScore * 100).toFixed(0)}%</Label>
                    <input
                      id="match-score"
                      type="range"
                      min="0.3"
                      max="0.95"
                      step="0.05"
                      value={minimumMatchScore}
                      onChange={(e) => setMinimumMatchScore(parseFloat(e.target.value))}
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
                        Automatically apply to high-matching opportunities (95%+ match score)
                      </p>
                    </div>
                    <Switch
                      id="auto-application"
                      checked={enableAutoApplication}
                      onCheckedChange={setEnableAutoApplication}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="application-style">Application Style</Label>
                    <Select value={applicationStyle} onValueChange={(value: 'formal' | 'casual' | 'artistic') => setApplicationStyle(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal & Professional</SelectItem>
                        <SelectItem value="casual">Casual & Conversational</SelectItem>
                        <SelectItem value="artistic">Creative & Artistic</SelectItem>
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
                      checked={includePortfolioLinks}
                      onCheckedChange={setIncludePortfolioLinks}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveOpportunityPreferences} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Opportunity Preferences
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>API Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure API keys and integrations for OPPO to discover and apply to opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Required for AI-powered opportunity analysis and application generation
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-app.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when new opportunities are found or applications are submitted
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveApiSettings} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save API Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about new opportunities and application updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for new opportunities and application status updates
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive browser notifications for urgent opportunities
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="notification-frequency">Notification Frequency</Label>
                  <Select value={notificationFrequency} onValueChange={(value: 'immediate' | 'daily' | 'weekly') => setNotificationFrequency(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    How often you want to receive opportunity notifications
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Notification Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
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
                      <Button variant="outline" size="sm" className="w-full">
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
                      <Button variant="outline" size="sm" className="w-full">
                        Clear Cache
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Privacy Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    OPPO processes your data locally and only sends anonymized information to opportunity sources. 
                    Your personal information and artist profiles are stored securely and never shared without your consent.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Appearance</span>
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your OPPO dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Theme Customization</h3>
                  <p>Dark mode and theme customization coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}