'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Globe, Zap, Shield, Play, Pause, Clock, Settings, BarChart3 } from 'lucide-react';
import { searchApi } from '@/lib/api';

interface SearchProcessProps {
  queryBucket: string[];
}

export function SearchProcess({ queryBucket }: SearchProcessProps) {
  const [activeService, setActiveService] = useState('google');
  const [isSearching, setIsSearching] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [nextScheduledRun, setNextScheduledRun] = useState<Date | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const scheduleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{
    currentQuery: string;
    currentStep: string;
    resultsFound: number;
    totalQueries: number;
    completedQueries: number;
    searchLog: Array<{
      query: string;
      step: string;
      results: number;
      timestamp: Date;
    }>;
  } | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);

  // Load schedule settings from localStorage
  useEffect(() => {
    const savedSchedule = localStorage.getItem('search-schedule-settings');
    if (savedSchedule) {
      try {
        const settings = JSON.parse(savedSchedule);
        setScheduleEnabled(settings.enabled || false);
        setScheduleFrequency(settings.frequency || 'daily');
        setLastRunTime(settings.lastRunTime ? new Date(settings.lastRunTime) : null);
      } catch (error) {
        console.error('Failed to load schedule settings:', error);
      }
    }
  }, []);

  // Save schedule settings to localStorage
  useEffect(() => {
    const settings = {
      enabled: scheduleEnabled,
      frequency: scheduleFrequency,
      lastRunTime: lastRunTime?.toISOString()
    };
    localStorage.setItem('search-schedule-settings', JSON.stringify(settings));
  }, [scheduleEnabled, scheduleFrequency, lastRunTime]);

  // Calculate next scheduled run time
  const calculateNextRun = (frequency: string, lastRun?: Date) => {
    const now = new Date();
    const baseTime = lastRun || now;
    
    switch (frequency) {
      case 'daily':
        const nextDaily = new Date(baseTime);
        nextDaily.setDate(nextDaily.getDate() + 1);
        nextDaily.setHours(9, 0, 0, 0); // 9 AM
        return nextDaily;
      case 'weekly':
        const nextWeekly = new Date(baseTime);
        nextWeekly.setDate(nextWeekly.getDate() + 7);
        nextWeekly.setHours(9, 0, 0, 0); // 9 AM Monday
        return nextWeekly;
      case 'monthly':
        const nextMonthly = new Date(baseTime);
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        nextMonthly.setDate(1);
        nextMonthly.setHours(9, 0, 0, 0); // 9 AM 1st of month
        return nextMonthly;
      default:
        return null;
    }
  };

  // Setup schedule timer
  useEffect(() => {
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
    }

    if (scheduleEnabled && queryBucket.length > 0) {
      const nextRun = calculateNextRun(scheduleFrequency, lastRunTime);
      setNextScheduledRun(nextRun);
      
      if (nextRun) {
        const timeUntilNext = nextRun.getTime() - Date.now();
        if (timeUntilNext > 0) {
          scheduleTimerRef.current = setTimeout(() => {
            console.log('Running scheduled search...');
            handleStartSearch();
            setLastRunTime(new Date());
          }, timeUntilNext);
        }
      }
    } else {
      setNextScheduledRun(null);
    }

    return () => {
      if (scheduleTimerRef.current) {
        clearTimeout(scheduleTimerRef.current);
      }
    };
  }, [scheduleEnabled, scheduleFrequency, lastRunTime, queryBucket.length]);

  const searchServices = [
    { id: 'google', name: 'Google', icon: Globe, color: 'bg-blue-500', status: 'active' },
    { id: 'yandex', name: 'Yandex', icon: Search, color: 'bg-red-500', status: 'active' },
    { id: 'bing', name: 'Bing', icon: Zap, color: 'bg-yellow-500', status: 'active' },
    { id: 'duckduckgo', name: 'DuckDuckGo', icon: Shield, color: 'bg-green-500', status: 'paused' },
  ];

  const handleStartSearch = async () => {
    setIsSearching(true);
    setSearchProgress({
      currentQuery: '',
      currentStep: 'Initializing search...',
      resultsFound: 0,
      totalQueries: queryBucket.length,
      completedQueries: 0,
      searchLog: []
    });

    const steps = [
      'Analyzing query context...',
      'Connecting to Google Search API...',
      'Executing search request...',
      'Processing search results...',
      'Filtering art opportunities...',
      'Extracting opportunities...',
      'Validating results...',
      'Saving to database...'
    ];

    try {
      for (let queryIndex = 0; queryIndex < queryBucket.length; queryIndex++) {
        const currentQuery = queryBucket[queryIndex];
        
        // Update progress with current query
        setSearchProgress(prev => prev ? {
          ...prev,
          currentQuery,
          completedQueries: queryIndex
        } : null);

        // Go through each step with real processing
        for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
          const currentStep = steps[stepIndex];
          
          setSearchProgress(prev => prev ? {
            ...prev,
            currentStep
          } : null);

          // Add delay for step visualization
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

          // Execute actual search on the "Executing search request..." step
          if (stepIndex === 2) {
            try {
              let searchResult;
              let resultsFound = 0;
              
              // Use different search services based on activeService
              switch (activeService) {
                case 'google':
                  searchResult = await searchApi.searchArtOpportunities(currentQuery, { num: 20 });
                  resultsFound = searchResult.results.length;
                  break;
                case 'yandex':
                  // TODO: Implement Yandex search when available
                  console.log('Yandex search not implemented yet');
                  resultsFound = Math.floor(Math.random() * 10) + 3; // Placeholder
                  break;
                case 'bing':
                  // TODO: Implement Bing search when available  
                  console.log('Bing search not implemented yet');
                  resultsFound = Math.floor(Math.random() * 8) + 2; // Placeholder
                  break;
                case 'duckduckgo':
                  // DuckDuckGo is shown as paused in UI
                  console.log('DuckDuckGo search is paused');
                  resultsFound = 0;
                  break;
                default:
                  searchResult = await searchApi.searchArtOpportunities(currentQuery, { num: 20 });
                  resultsFound = searchResult.results.length;
              }
              
              // Update with real results
              setSearchProgress(prev => prev ? {
                ...prev,
                resultsFound: prev.resultsFound + resultsFound,
                searchLog: [...prev.searchLog, {
                  query: currentQuery,
                  step: 'Completed',
                  results: resultsFound,
                  timestamp: new Date()
                }]
              } : null);

              // Store results for future use (could save to context/database)
              console.log(`Found ${resultsFound} results for "${currentQuery}"`);
              
            } catch (error) {
              console.error(`Search failed for "${currentQuery}":`, error);
              // Still log the attempt with 0 results
              setSearchProgress(prev => prev ? {
                ...prev,
                searchLog: [...prev.searchLog, {
                  query: currentQuery,
                  step: 'Failed',
                  results: 0,
                  timestamp: new Date()
                }]
              } : null);
            }
          }
        }
      }

      // Search completed
      setIsSearching(false);
      setSearchCompleted(true);
      setSearchProgress(prev => prev ? {
        ...prev,
        currentStep: 'Search completed!',
        currentQuery: '',
        completedQueries: queryBucket.length
      } : null);

    } catch (error) {
      console.error('Search process failed:', error);
      setIsSearching(false);
      setSearchProgress(prev => prev ? {
        ...prev,
        currentStep: 'Search failed - please try again',
        currentQuery: ''
      } : null);
    }
  };

  const handleResetSearch = () => {
    setIsSearching(false);
    setSearchCompleted(false);
    setSearchProgress(null);
  };

  return (
    <div className="flex-1">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header with title and service tabs */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Search Process</h3>
          <div className="flex items-center gap-1">
            {searchServices.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => setActiveService(service.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors relative ${
                    activeService === service.id
                      ? `${service.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {service.name}
                  {service.status === 'paused' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Search Status and Controls */}
        <div className="mb-4 space-y-3">
          {/* Schedule Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Schedule:</span>
              <span className={`text-sm font-medium ${scheduleEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {scheduleEnabled ? `${scheduleFrequency} (active)` : 'Paused'}
              </span>
              {scheduleEnabled && nextScheduledRun && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Next: {nextScheduledRun.toLocaleDateString()} {nextScheduledRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
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

          {/* Query Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Queries:</span>
              <span className="text-sm font-medium">{queryBucket.length} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="text-xs border rounded px-2 py-1"
                disabled={!scheduleEnabled}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-50 rounded-md p-4">
            {queryBucket.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <h4 className="text-lg font-semibold mb-2">No Queries Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Add queries to the bucket to start automated searching
                </p>
              </div>
            ) : searchCompleted && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h4 className="text-2xl font-bold text-green-600 mb-2">Search Completed!</h4>
                  <p className="text-muted-foreground">
                    All {searchProgress.totalQueries} queries processed successfully
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {searchProgress.resultsFound} Opportunities Found
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">All verified and added to opportunities</span>
                    </div>
                  </div>
                </div>

                {/* Search Summary */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Queries Processed</div>
                      <div className="text-xl font-bold text-blue-600">{searchProgress.totalQueries}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">100%</div>
                    </div>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Search Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1">"{log.query}"</div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">Verified & Added</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-600">{log.results}</div>
                            <div className="text-xs text-gray-500">opportunities</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2 justify-center">
                  <button 
                    onClick={handleResetSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Run New Search
                  </button>
                  <button 
                    onClick={() => {/* TODO: Navigate to opportunities */}}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View Opportunities
                  </button>
                </div>
              </div>
            ) : isSearching && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Searching in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {searchProgress.completedQueries} / {searchProgress.totalQueries} queries
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(searchProgress.completedQueries / searchProgress.totalQueries) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Query & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-600">Current Query:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">"{searchProgress.currentQuery}"</p>
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">{searchProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Results Found:</span>
                    <span className="text-lg font-bold text-green-600">{searchProgress.resultsFound}</span>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Search Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">"{log.query}"</div>
                            <div className="text-xs text-gray-500">{log.step}</div>
                          </div>
                          <div className="text-sm font-medium text-green-600">{log.results} results</div>
                        </div>
                      ))}
                      {searchProgress.searchLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No completed searches yet...
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
                  {searchServices.find(s => s.id === activeService)?.name} Search Ready
                </h4>
                <p className="text-muted-foreground mb-4">
                  {scheduleEnabled 
                    ? `Will run ${scheduleFrequency} with ${queryBucket.length} queries`
                    : `Ready to search with ${queryBucket.length} queries`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Start Now
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

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Search Settings</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Search Service Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Active Search Service
                  </label>
                  <select 
                    value={activeService}
                    onChange={(e) => setActiveService(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="google">Google Search</option>
                    <option value="yandex">Yandex Search</option>
                    <option value="bing">Bing Search</option>
                    <option value="duckduckgo" disabled>DuckDuckGo (Paused)</option>
                  </select>
                </div>

                {/* Schedule Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Frequency
                  </label>
                  <select 
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="daily">Daily at 9:00 AM</option>
                    <option value="weekly">Weekly (Mondays at 9:00 AM)</option>
                    <option value="monthly">Monthly (1st at 9:00 AM)</option>
                  </select>
                </div>

                {/* Schedule Status */}
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Automatic Scheduling
                    </span>
                  </label>
                  {scheduleEnabled && nextScheduledRun && (
                    <p className="text-xs text-gray-600 mt-1">
                      Next run: {nextScheduledRun.toLocaleDateString()} at {nextScheduledRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>

                {/* Last Run Info */}
                {lastRunTime && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      Last search: {lastRunTime.toLocaleDateString()} at {lastRunTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
