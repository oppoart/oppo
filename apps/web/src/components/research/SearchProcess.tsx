'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Globe, Zap, Shield, Play, Pause, Clock, Settings, BarChart3 } from 'lucide-react';
import { searchApi, profileApi } from '@/lib/api';

// Types
interface SearchProcessProps {
  queryBucket: string[];
}

interface SearchProgress {
  currentQuery: string;
  currentStep: string;
  resultsFound: number;
  totalQueries: number;
  completedQueries: number;
  searchLog: SearchLogEntry[];
}

interface SearchLogEntry {
  query: string;
  step: string;
  results: number;
  timestamp: Date;
  searchResults?: any[];
}

interface PipelineResults {
  finalStats: {
    searchResultsProcessed: number;
    successfullyScrapped: number;
    duplicatesRemoved: number;
    highValueOpportunities: number;
  };
  highValueOpportunities: any[];
  analysisResults: any[];
}

interface Profile {
  id: string;
  name: string;
}

interface SearchService {
  id: string;
  name: string;
  icon: any;
  color: string;
  status: 'active' | 'paused';
}

// Constants
const SEARCH_SERVICES: SearchService[] = [
  { id: 'google', name: 'Google', icon: Globe, color: 'bg-blue-500', status: 'active' },
  { id: 'yandex', name: 'Yandex', icon: Search, color: 'bg-red-500', status: 'active' },
  { id: 'bing', name: 'Bing', icon: Zap, color: 'bg-yellow-500', status: 'active' },
  { id: 'duckduckgo', name: 'DuckDuckGo', icon: Shield, color: 'bg-green-500', status: 'paused' },
];

const SEARCH_STEPS = [
  'Analyzing query context...',
  'Connecting to search API...',
  'Executing search request...',
  'Processing search results...',
  'Filtering art opportunities...',
  'Extracting opportunities...',
  'Validating results...',
  'Saving to database...'
];

// Custom Hooks
function useSchedule() {
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [nextScheduledRun, setNextScheduledRun] = useState<Date | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const scheduleTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const calculateNextRun = (frequency: string, lastRun?: Date) => {
    const now = new Date();
    const baseTime = lastRun || now;
    
    switch (frequency) {
      case 'daily':
        const nextDaily = new Date(baseTime);
        nextDaily.setDate(nextDaily.getDate() + 1);
        nextDaily.setHours(9, 0, 0, 0);
        return nextDaily;
      case 'weekly':
        const nextWeekly = new Date(baseTime);
        nextWeekly.setDate(nextWeekly.getDate() + 7);
        nextWeekly.setHours(9, 0, 0, 0);
        return nextWeekly;
      case 'monthly':
        const nextMonthly = new Date(baseTime);
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        nextMonthly.setDate(1);
        nextMonthly.setHours(9, 0, 0, 0);
        return nextMonthly;
      default:
        return null;
    }
  };

  return {
    scheduleEnabled,
    setScheduleEnabled,
    scheduleFrequency,
    setScheduleFrequency,
    nextScheduledRun,
    setNextScheduledRun,
    lastRunTime,
    setLastRunTime,
    scheduleTimerRef,
    calculateNextRun
  };
}

function useProfiles() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profiles = await profileApi.getProfiles();
        setAvailableProfiles(profiles);
        if (profiles.length > 0 && !selectedProfile) {
          setSelectedProfile(profiles[0].id);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    };
    loadProfiles();
  }, [selectedProfile]);

  return {
    selectedProfile,
    setSelectedProfile,
    availableProfiles
  };
}

// Component Parts
function ServiceTabs({ activeService, onServiceChange }: { 
  activeService: string; 
  onServiceChange: (service: string) => void; 
}) {
  return (
    <div className="flex items-center gap-1">
      {SEARCH_SERVICES.map((service) => {
        const Icon = service.icon;
        return (
          <button
            key={service.id}
            onClick={() => onServiceChange(service.id)}
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
  );
}

function ScheduleStatus({ 
  scheduleEnabled, 
  onScheduleToggle,
  scheduleFrequency,
  nextScheduledRun 
}: {
  scheduleEnabled: boolean;
  onScheduleToggle: () => void;
  scheduleFrequency: string;
  nextScheduledRun: Date | null;
}) {
  return (
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
        onClick={onScheduleToggle}
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
  );
}

function QueryStatus({ 
  queryCount, 
  scheduleFrequency, 
  onFrequencyChange,
  onShowSettings,
  scheduleEnabled 
}: {
  queryCount: number;
  scheduleFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  onShowSettings: () => void;
  scheduleEnabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Queries:</span>
        <span className="text-sm font-medium">{queryCount} selected</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={scheduleFrequency}
          onChange={(e) => onFrequencyChange(e.target.value)}
          className="text-xs border rounded px-2 py-1"
          disabled={!scheduleEnabled}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button 
          onClick={onShowSettings}
          className="p-1 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PipelineResultsView({ 
  pipelineResults, 
  onReset, 
  onViewOpportunities 
}: {
  pipelineResults: PipelineResults;
  onReset: () => void;
  onViewOpportunities: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-green-800 mb-2">🎯 Pipeline Processing Complete!</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded border">
            <div className="font-semibold text-blue-800">Search Results</div>
            <div className="text-xl font-bold text-blue-600">{pipelineResults.finalStats.searchResultsProcessed}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded border">
            <div className="font-semibold text-purple-800">Successfully Scraped</div>
            <div className="text-xl font-bold text-purple-600">{pipelineResults.finalStats.successfullyScrapped}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded border">
            <div className="font-semibold text-yellow-800">Duplicates Removed</div>
            <div className="text-xl font-bold text-yellow-600">{pipelineResults.finalStats.duplicatesRemoved}</div>
          </div>
          <div className="bg-green-50 p-3 rounded border">
            <div className="font-semibold text-green-800">High-Value Opportunities</div>
            <div className="text-xl font-bold text-green-600">{pipelineResults.finalStats.highValueOpportunities}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <h5 className="text-sm font-medium text-gray-700 mb-2">High-Value Opportunities Found:</h5>
        <div className="bg-white rounded-md border h-full overflow-y-auto">
          <div className="p-3 space-y-3">
            {pipelineResults.highValueOpportunities.slice(0, 10).map((opp: any, index: number) => {
              const analysis = pipelineResults.analysisResults.find((r: any) => r.url === opp.url);
              return (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 mb-1">{opp.title}</h6>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{opp.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {opp.organization && <span>🏢 {opp.organization}</span>}
                        {opp.amount && <span>💰 {opp.amount}</span>}
                        {opp.deadline && <span>⏰ {new Date(opp.deadline).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      {analysis && (
                        <div className="text-sm">
                          <div className={`font-bold ${
                            (analysis.analysis?.relevanceScore || 0) > 0.7 ? 'text-green-600' :
                            (analysis.analysis?.relevanceScore || 0) > 0.4 ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {Math.round((analysis.analysis?.relevanceScore || 0) * 100)}/100
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {(analysis.analysis?.relevanceScore || 0) > 0.7 ? 'high' :
                             (analysis.analysis?.relevanceScore || 0) > 0.4 ? 'medium' : 'low'}
                          </div>
                        </div>
                      )}
                      <a 
                        href={opp.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        View Details →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 justify-center">
        <button 
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
        >
          Start New Search
        </button>
        <button 
          onClick={onViewOpportunities}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
        >
          Save & View All Opportunities
        </button>
      </div>
    </div>
  );
}

function SearchProgressView({ 
  searchProgress, 
  onStartPipeline, 
  onReset,
  isPipelineRunning,
  selectedProfile 
}: {
  searchProgress: SearchProgress;
  onStartPipeline: () => void;
  onReset: () => void;
  isPipelineRunning: boolean;
  selectedProfile: string | null;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Found {searchProgress.resultsFound} results</h4>
        <p className="text-sm text-gray-600">{searchProgress.totalQueries} queries completed</p>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {searchProgress.searchLog.map((log, index) => (
          <div key={index} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <span className="font-medium text-gray-900">"{log.query}"</span>
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">{log.results} results</span>
            </div>
            
            {log.searchResults && log.searchResults.length > 0 && (
              <div className="space-y-3">
                {log.searchResults.map((result, resultIndex) => (
                  <div key={resultIndex} className="border-l-2 border-blue-200 pl-3">
                    <div className="flex items-start justify-between mb-1">
                      <h6 className="font-medium text-gray-900 text-sm leading-tight flex-1 mr-2">
                        {result.title}
                      </h6>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {result.domain}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                      {result.snippet}
                    </p>
                    <a 
                      href={result.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {result.link}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={onStartPipeline}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
          disabled={isPipelineRunning || !selectedProfile}
        >
          Scrape & Analyze
        </button>
        <button 
          onClick={onReset}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
        >
          New Search
        </button>
      </div>
    </div>
  );
}

function SearchInProgressView({ searchProgress }: { searchProgress: SearchProgress }) {
  return (
    <div className="h-full flex flex-col">
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

      <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">Results Found:</span>
          <span className="text-lg font-bold text-green-600">{searchProgress.resultsFound}</span>
        </div>
      </div>

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
  );
}

// Main Component
export function SearchProcess({ queryBucket }: SearchProcessProps) {
  const [activeService, setActiveService] = useState('google');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<PipelineResults | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const schedule = useSchedule();
  const { selectedProfile, availableProfiles } = useProfiles();

  // Setup schedule timer
  useEffect(() => {
    if (schedule.scheduleTimerRef.current) {
      clearTimeout(schedule.scheduleTimerRef.current);
    }

    if (schedule.scheduleEnabled && queryBucket.length > 0) {
      const nextRun = schedule.calculateNextRun(schedule.scheduleFrequency, schedule.lastRunTime);
      schedule.setNextScheduledRun(nextRun);
      
      if (nextRun) {
        const timeUntilNext = nextRun.getTime() - Date.now();
        if (timeUntilNext > 0) {
          schedule.scheduleTimerRef.current = setTimeout(() => {
            console.log('Running scheduled search...');
            handleStartSearch();
            schedule.setLastRunTime(new Date());
          }, timeUntilNext);
        }
      }
    } else {
      schedule.setNextScheduledRun(null);
    }

    return () => {
      if (schedule.scheduleTimerRef.current) {
        clearTimeout(schedule.scheduleTimerRef.current);
      }
    };
  }, [schedule.scheduleEnabled, schedule.scheduleFrequency, schedule.lastRunTime, queryBucket.length]);

  const performSearch = async (query: string) => {
    try {
      let searchResult;
      let resultsFound = 0;
      
      switch (activeService) {
        case 'google':
          searchResult = await searchApi.searchArtOpportunities(query, { num: 20 });
          resultsFound = searchResult.results.length;
          break;
        case 'yandex':
          try {
            searchResult = await searchApi.yandexSearch(query, { num: 20 });
            resultsFound = searchResult.results.length;
          } catch (error) {
            console.warn('Yandex search API not available, falling back to Google:', error);
            searchResult = await searchApi.searchArtOpportunities(query, { num: 20 });
            resultsFound = searchResult.results.length;
          }
          break;
        case 'bing':
          try {
            searchResult = await searchApi.bingSearch(query, { num: 20 });
            resultsFound = searchResult.results.length;
          } catch (error) {
            console.warn('Bing search API not available, falling back to Google:', error);
            searchResult = await searchApi.searchArtOpportunities(query, { num: 20 });
            resultsFound = searchResult.results.length;
          }
          break;
        case 'duckduckgo':
          console.log('DuckDuckGo search is paused');
          return { results: [], count: 0 };
        default:
          searchResult = await searchApi.searchArtOpportunities(query, { num: 20 });
          resultsFound = searchResult.results.length;
      }
      
      return { results: searchResult.results, count: resultsFound };
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
      return { results: [], count: 0 };
    }
  };

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

    try {
      for (let queryIndex = 0; queryIndex < queryBucket.length; queryIndex++) {
        const currentQuery = queryBucket[queryIndex];
        
        setSearchProgress(prev => prev ? {
          ...prev,
          currentQuery,
          completedQueries: queryIndex
        } : null);

        for (let stepIndex = 0; stepIndex < SEARCH_STEPS.length; stepIndex++) {
          const currentStep = SEARCH_STEPS[stepIndex];
          
          setSearchProgress(prev => prev ? {
            ...prev,
            currentStep
          } : null);

          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

          if (stepIndex === 2) { // Execute search on "Executing search request..." step
            const { results, count } = await performSearch(currentQuery);
            
            setSearchProgress(prev => prev ? {
              ...prev,
              resultsFound: prev.resultsFound + count,
              searchLog: [...prev.searchLog, {
                query: currentQuery,
                step: `Found ${count} search results`,
                results: count,
                timestamp: new Date(),
                searchResults: results
              }]
            } : null);

            console.log(`Found ${count} search results for "${currentQuery}"`, results);
          }
        }
      }

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

  const handleStartPipeline = async () => {
    if (!selectedProfile || !searchProgress?.searchLog.length) {
      console.error('No profile selected or no search results available');
      return;
    }

    setIsPipelineRunning(true);
    
    try {
      console.log('🚀 Starting scraping and analysis...');
      
      const allSearchResults = searchProgress.searchLog
        .filter(log => log.searchResults)
        .flatMap(log => log.searchResults);

      if (allSearchResults.length === 0) {
        throw new Error('No search results available for scraping');
      }

      console.log(`🕷️ Scraping and analyzing ${allSearchResults.length} search results...`);

      const response = await fetch('/api/analysis/scrape-and-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          searchResults: allSearchResults,
          profileId: selectedProfile,
          query: searchProgress.searchLog.map(log => log.query).join(', ')
        })
      });

      const result = await response.json();

      if (result.success) {
        setPipelineResults({
          finalStats: {
            searchResultsProcessed: allSearchResults.length,
            successfullyScrapped: result.data.scrapeResults?.successful || 0,
            duplicatesRemoved: result.data.saveResults?.duplicates || 0,
            highValueOpportunities: result.data.saveResults?.saved || 0
          },
          highValueOpportunities: result.data.scrapeResults?.results || [],
          analysisResults: result.data.scrapeResults?.results || []
        });
        console.log('✅ Scraping, analysis, and database save completed:', result.data);
        
        if (result.data.saveResults?.saved > 0) {
          alert(`Success! Saved ${result.data.saveResults.saved} opportunities to your database. View them in the Opportunities page.`);
        }
      } else {
        throw new Error(result.message || 'Scraping and analysis failed');
      }

    } catch (error) {
      console.error('❌ Scraping and analysis error:', error);
      alert(`Scraping failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPipelineRunning(false);
    }
  };

  const handleReset = () => {
    setIsSearching(false);
    setSearchCompleted(false);
    setSearchProgress(null);
    setIsPipelineRunning(false);
    setPipelineResults(null);
  };

  const handleViewOpportunities = () => {
    window.location.href = '/dashboard/opportunities';
  };

  const renderMainContent = () => {
    if (queryBucket.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📝</div>
          <h4 className="text-lg font-semibold mb-2">No Queries Selected</h4>
          <p className="text-muted-foreground mb-4">
            Add queries to the bucket to start automated searching
          </p>
        </div>
      );
    }

    if (pipelineResults) {
      return (
        <PipelineResultsView 
          pipelineResults={pipelineResults} 
          onReset={handleReset}
          onViewOpportunities={handleViewOpportunities}
        />
      );
    }

    if (isPipelineRunning) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="text-center mb-6">
            <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h4 className="text-lg font-semibold text-orange-800 mb-2">🔧 Processing Complete Pipeline</h4>
            <p className="text-gray-600 text-sm">
              Scraping web pages → AI analysis → Duplicate detection...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This may take 30-60 seconds depending on the number of results
            </p>
          </div>
        </div>
      );
    }

    if (searchCompleted && searchProgress) {
      return (
        <SearchProgressView 
          searchProgress={searchProgress}
          onStartPipeline={handleStartPipeline}
          onReset={handleReset}
          isPipelineRunning={isPipelineRunning}
          selectedProfile={selectedProfile}
        />
      );
    }

    if (isSearching && searchProgress) {
      return <SearchInProgressView searchProgress={searchProgress} />;
    }

    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🔍</div>
        <h4 className="text-lg font-semibold mb-2">
          {SEARCH_SERVICES.find(s => s.id === activeService)?.name} Search Ready
        </h4>
        <p className="text-muted-foreground mb-4">
          {schedule.scheduleEnabled 
            ? `Will run ${schedule.scheduleFrequency} with ${queryBucket.length} queries`
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
          {!schedule.scheduleEnabled && (
            <button 
              onClick={() => schedule.setScheduleEnabled(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
            >
              Enable Schedule
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Search Process</h3>
          <ServiceTabs activeService={activeService} onServiceChange={setActiveService} />
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Controls */}
        <div className="mb-4 space-y-3">
          <ScheduleStatus 
            scheduleEnabled={schedule.scheduleEnabled}
            onScheduleToggle={() => schedule.setScheduleEnabled(!schedule.scheduleEnabled)}
            scheduleFrequency={schedule.scheduleFrequency}
            nextScheduledRun={schedule.nextScheduledRun}
          />
          
          <QueryStatus 
            queryCount={queryBucket.length}
            scheduleFrequency={schedule.scheduleFrequency}
            onFrequencyChange={schedule.setScheduleFrequency}
            onShowSettings={() => setShowSettings(true)}
            scheduleEnabled={schedule.scheduleEnabled}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-50 rounded-md p-4">
            {renderMainContent()}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Frequency
                  </label>
                  <select 
                    value={schedule.scheduleFrequency}
                    onChange={(e) => schedule.setScheduleFrequency(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="daily">Daily at 9:00 AM</option>
                    <option value="weekly">Weekly (Mondays at 9:00 AM)</option>
                    <option value="monthly">Monthly (1st at 9:00 AM)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={schedule.scheduleEnabled}
                      onChange={(e) => schedule.setScheduleEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Automatic Scheduling
                    </span>
                  </label>
                  {schedule.scheduleEnabled && schedule.nextScheduledRun && (
                    <p className="text-xs text-gray-600 mt-1">
                      Next run: {schedule.nextScheduledRun.toLocaleDateString()} at {schedule.nextScheduledRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  )}
                </div>

                {schedule.lastRunTime && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      Last search: {schedule.lastRunTime.toLocaleDateString()} at {schedule.lastRunTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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