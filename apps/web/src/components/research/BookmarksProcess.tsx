'use client';

import { useState } from 'react';
import { Play, Pause, Clock, Settings, BarChart3, Globe, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface BookmarkedSite {
  id: string;
  name: string;
  url: string;
  category: string;
  addedDate: Date;
  lastChecked: Date | null;
  status: 'active' | 'inactive' | 'checking';
}

interface BookmarksProcessProps {
  bookmarkedSites: BookmarkedSite[];
  selectedSites: string[];
  onUpdateSiteStatus: (id: string, status: BookmarkedSite['status']) => void;
}

export function BookmarksProcess({ bookmarkedSites, selectedSites, onUpdateSiteStatus }: BookmarksProcessProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState('hourly');
  const [monitoringProgress, setMonitoringProgress] = useState<{
    currentSite: string;
    currentStep: string;
    sitesChecked: number;
    totalSites: number;
    newOpportunities: number;
    monitoringLog: Array<{
      site: string;
      status: 'success' | 'failed' | 'no-changes';
      opportunities: number;
      timestamp: Date;
    }>;
  } | null>(null);
  const [monitoringCompleted, setMonitoringCompleted] = useState(false);

  const selectedSitesList = bookmarkedSites.filter(site => selectedSites.includes(site.id));

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setMonitoringCompleted(false);
    setMonitoringProgress({
      currentSite: '',
      currentStep: 'Initializing bookmark monitoring...',
      sitesChecked: 0,
      totalSites: selectedSitesList.length,
      newOpportunities: 0,
      monitoringLog: []
    });

    // Simulate monitoring process
    let siteIndex = 0;
    let stepIndex = 0;
    const steps = [
      'Connecting to website...',
      'Checking for updates...',
      'Scanning for opportunities...',
      'Extracting new content...',
      'Analyzing changes...',
      'Saving to database...'
    ];

    const processSite = () => {
      if (siteIndex >= selectedSitesList.length) {
        setIsMonitoring(false);
        setMonitoringCompleted(true);
        setMonitoringProgress(prev => prev ? {
          ...prev,
          currentStep: 'Monitoring completed!',
          currentSite: ''
        } : null);
        return;
      }

      const currentSite = selectedSitesList[siteIndex];
      const currentStep = steps[stepIndex];
      
      // Update site status to checking
      if (stepIndex === 0) {
        onUpdateSiteStatus(currentSite.id, 'checking');
      }
      
      setMonitoringProgress(prev => prev ? {
        ...prev,
        currentSite: currentSite.name,
        currentStep,
        sitesChecked: siteIndex
      } : null);

      // Simulate step progression
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setTimeout(processSite, 400 + Math.random() * 600);
      } else {
        // Site completed
        const status = Math.random() > 0.1 ? 'success' : 'failed';
        const opportunities = status === 'success' ? Math.floor(Math.random() * 5) : 0;
        
        // Update site status
        onUpdateSiteStatus(currentSite.id, status === 'success' ? 'active' : 'inactive');
        
        setMonitoringProgress(prev => prev ? {
          ...prev,
          sitesChecked: siteIndex + 1,
          newOpportunities: prev.newOpportunities + opportunities,
          monitoringLog: [...prev.monitoringLog, {
            site: currentSite.name,
            status: opportunities > 0 ? 'success' : status === 'failed' ? 'failed' : 'no-changes',
            opportunities,
            timestamp: new Date()
          }]
        } : null);
        
        siteIndex++;
        stepIndex = 0;
        setTimeout(processSite, 300);
      }
    };

    // Start the process
    setTimeout(processSite, 500);
  };

  const handleResetMonitoring = () => {
    setIsMonitoring(false);
    setMonitoringCompleted(false);
    setMonitoringProgress(null);
  };

  return (
    <div className="flex-1">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Bookmarks Monitor</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Monitoring {selectedSites.length} of {bookmarkedSites.length} sites
            </span>
          </div>
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Monitor Status and Controls */}
        <div className="mb-4 space-y-3">
          {/* Schedule Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Schedule:</span>
              <span className={`text-sm font-medium ${scheduleEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {scheduleEnabled ? `${scheduleFrequency} checks` : 'Paused'}
              </span>
            </div>
            <button
              onClick={() => setScheduleEnabled(!scheduleEnabled)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                scheduleEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {scheduleEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {scheduleEnabled ? 'Pause' : 'Resume'}
            </button>
          </div>

          {/* Sites Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Selected Sites:</span>
              <span className="text-sm font-medium">{selectedSites.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="text-xs border rounded px-2 py-1"
                disabled={!scheduleEnabled}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <button className="p-1 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Monitor Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-50 rounded-md p-4">
            {selectedSites.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔖</div>
                <h4 className="text-lg font-semibold mb-2">No Sites Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Select bookmarked sites to start monitoring for opportunities
                </p>
              </div>
            ) : monitoringCompleted && monitoringProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h4 className="text-2xl font-bold text-green-600 mb-2">Monitoring Completed!</h4>
                  <p className="text-muted-foreground">
                    Checked {monitoringProgress.sitesChecked} sites for new opportunities
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {monitoringProgress.newOpportunities} New Opportunities
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">All sites checked successfully</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Sites Checked</div>
                      <div className="text-xl font-bold text-blue-600">{monitoringProgress.sitesChecked}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">New Opportunities</div>
                      <div className="text-xl font-bold text-blue-600">{monitoringProgress.newOpportunities}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">
                        {Math.round((monitoringProgress.monitoringLog.filter(l => l.status !== 'failed').length / monitoringProgress.monitoringLog.length) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monitor Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Monitoring Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {monitoringProgress.monitoringLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1">{log.site}</div>
                            <div className="flex items-center gap-2">
                              {log.status === 'success' && (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600 font-medium">{log.opportunities} new opportunities</span>
                                </>
                              )}
                              {log.status === 'no-changes' && (
                                <>
                                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs text-yellow-600 font-medium">No new content</span>
                                </>
                              )}
                              {log.status === 'failed' && (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">Connection failed</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2 justify-center">
                  <button 
                    onClick={handleResetMonitoring}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Run New Monitor Check
                  </button>
                  <button 
                    onClick={() => {/* TODO: Navigate to opportunities */}}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View Opportunities
                  </button>
                </div>
              </div>
            ) : isMonitoring && monitoringProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Monitoring in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {monitoringProgress.sitesChecked} / {monitoringProgress.totalSites} sites
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(monitoringProgress.sitesChecked / monitoringProgress.totalSites) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Site & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-primary">Current Site:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{monitoringProgress.currentSite}</p>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="animate-spin h-3 w-3 text-primary" />
                    <span className="text-sm text-gray-600">{monitoringProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">New Opportunities Found:</span>
                    <span className="text-lg font-bold text-blue-600">{monitoringProgress.newOpportunities}</span>
                  </div>
                </div>

                {/* Monitor Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Monitoring Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {monitoringProgress.monitoringLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{log.site}</div>
                            <div className="text-xs text-gray-500">
                              {log.status === 'success' && `${log.opportunities} opportunities found`}
                              {log.status === 'no-changes' && 'No new content'}
                              {log.status === 'failed' && 'Failed to connect'}
                            </div>
                          </div>
                          {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {log.status === 'no-changes' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      ))}
                      {monitoringProgress.monitoringLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No sites checked yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔍</div>
                <h4 className="text-lg font-semibold mb-2">
                  Ready to Monitor
                </h4>
                <p className="text-muted-foreground mb-4">
                  {scheduleEnabled 
                    ? `Will check ${selectedSites.length} sites ${scheduleFrequency}`
                    : `Ready to check ${selectedSites.length} bookmarked sites`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartMonitoring}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Start Monitoring
                  </button>
                  {!scheduleEnabled && (
                    <button 
                      onClick={() => setScheduleEnabled(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                    >
                      Enable Schedule
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}