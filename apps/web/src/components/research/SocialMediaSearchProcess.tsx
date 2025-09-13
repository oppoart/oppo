'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Instagram, Twitter, Facebook, AtSign, Play, Pause, Clock, Settings, BarChart3, Users, Heart, MessageCircle } from 'lucide-react';

interface SocialMediaSearchProcessProps {
  queryBucket: string[];
}

export function SocialMediaSearchProcess({ queryBucket }: SocialMediaSearchProcessProps) {
  const router = useRouter();
  const [activeService, setActiveService] = useState('instagram');
  const [isSearching, setIsSearching] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
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

  const socialMediaServices = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500', status: 'active' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'bg-blue-400', status: 'active' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600', status: 'active' },
    { id: 'threads', name: 'Threads', icon: AtSign, color: 'bg-gray-800', status: 'active' },
  ];

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchProgress({
      currentQuery: '',
      currentStep: 'Initializing social media search...',
      resultsFound: 0,
      totalQueries: queryBucket.length,
      completedQueries: 0,
      searchLog: []
    });

    // Simulate real-time social media search process
    let queryIndex = 0;
    let stepIndex = 0;
    const steps = [
      'Analyzing social media context...',
      'Connecting to social APIs...',
      'Searching hashtags and mentions...',
      'Scanning posts and comments...',
      'Analyzing engagement metrics...',
      'Extracting social opportunities...',
      'Validating social content...',
      'Saving social insights to database...'
    ];

    const processQuery = () => {
      if (queryIndex >= queryBucket.length) {
        setIsSearching(false);
        setSearchCompleted(true);
        setSearchProgress(prev => prev ? {
          ...prev,
          currentStep: 'Social media search completed!',
          currentQuery: ''
        } : null);
        return;
      }

      const currentQuery = queryBucket[queryIndex];
      const currentStep = steps[stepIndex];
      
      setSearchProgress(prev => prev ? {
        ...prev,
        currentQuery,
        currentStep,
        completedQueries: queryIndex
      } : null);

      // Simulate step progression
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setTimeout(processQuery, 600 + Math.random() * 800); // Random delay 0.6-1.4s
      } else {
        // Query completed, move to next
        const resultsFound = Math.floor(Math.random() * 25) + 10; // 10-34 results (social media has more content)
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
        
        queryIndex++;
        stepIndex = 0;
        setTimeout(processQuery, 400);
      }
    };

    // Start the process
    setTimeout(processQuery, 800);
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
          <h3 className="text-lg font-semibold">Social Media Search Process</h3>
          <div className="flex items-center gap-1">
            {socialMediaServices.map((service) => {
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
              <button className="p-1 text-muted-foreground hover:text-foreground">
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
                <div className="text-4xl mb-4">📱</div>
                <h4 className="text-lg font-semibold mb-2">No Queries Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Add queries to the bucket to start social media searching
                </p>
              </div>
            ) : searchCompleted && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <h4 className="text-2xl font-bold text-pink-600 mb-2">Social Media Search Completed!</h4>
                  <p className="text-muted-foreground">
                    All {searchProgress.totalQueries} queries processed across social platforms
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-600 mb-2">
                      {searchProgress.resultsFound} Social Posts Found
                    </div>
                    <div className="flex items-center justify-center gap-2 text-pink-700">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      <span className="font-medium">All verified and added to opportunities</span>
                    </div>
                  </div>
                </div>

                {/* Social Media Stats */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Posts Found</div>
                      <div className="text-xl font-bold text-blue-600">{searchProgress.resultsFound}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Platforms</div>
                      <div className="text-xl font-bold text-blue-600">{socialMediaServices.filter(s => s.status === 'active').length}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">100%</div>
                    </div>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Social Media Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1">"{log.query}"</div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              <span className="text-xs text-pink-600 font-medium">Social Verified & Added</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-pink-600">{log.results}</div>
                            <div className="text-xs text-gray-500">posts</div>
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
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Run New Social Search
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/opportunities')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View Social Posts
                  </button>
                </div>
              </div>
            ) : isSearching && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Social Media Search in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {searchProgress.completedQueries} / {searchProgress.totalQueries} queries
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(searchProgress.completedQueries / searchProgress.totalQueries) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Query & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-pink-500 rounded-full"></div>
                    <span className="text-sm font-medium text-pink-600">Current Query:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">"{searchProgress.currentQuery}"</p>
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border border-pink-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">{searchProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-pink-50 rounded-md border border-pink-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-pink-800">Social Posts Found:</span>
                    <span className="text-lg font-bold text-pink-600">{searchProgress.resultsFound}</span>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Social Media Search Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">"{log.query}"</div>
                            <div className="text-xs text-gray-500">{log.step}</div>
                          </div>
                          <div className="text-sm font-medium text-pink-600">{log.results} posts</div>
                        </div>
                      ))}
                      {searchProgress.searchLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No completed social searches yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📱</div>
                <h4 className="text-lg font-semibold mb-2">
                  {socialMediaServices.find(s => s.id === activeService)?.name} Search Ready
                </h4>
                <p className="text-muted-foreground mb-4">
                  {scheduleEnabled 
                    ? `Will run ${scheduleFrequency} with ${queryBucket.length} queries`
                    : `Ready to search with ${queryBucket.length} queries on social media`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartSearch}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Start Social Search
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

