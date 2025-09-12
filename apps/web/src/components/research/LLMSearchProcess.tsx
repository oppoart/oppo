'use client';

import { useState } from 'react';
import { Brain, Zap, Sparkles, Cpu, Play, Pause, Clock, Settings, BarChart3 } from 'lucide-react';

interface LLMSearchProcessProps {
  queryBucket: string[];
}

export function LLMSearchProcess({ queryBucket }: LLMSearchProcessProps) {
  const [activeService, setActiveService] = useState('perplexity');
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

  const llmServices = [
    { id: 'perplexity', name: 'Perplexity', icon: Brain, color: 'bg-purple-500', status: 'active' },
    { id: 'claude', name: 'Claude', icon: Sparkles, color: 'bg-orange-500', status: 'active' },
    { id: 'gpt', name: 'GPT-4', icon: Cpu, color: 'bg-green-500', status: 'active' },
    { id: 'gemini', name: 'Gemini', icon: Zap, color: 'bg-blue-500', status: 'paused' },
  ];

  const handleStartSearch = () => {
    setIsSearching(true);
    setSearchProgress({
      currentQuery: '',
      currentStep: 'Initializing LLM search...',
      resultsFound: 0,
      totalQueries: queryBucket.length,
      completedQueries: 0,
      searchLog: []
    });

    // Simulate real-time LLM search process
    let queryIndex = 0;
    let stepIndex = 0;
    const steps = [
      'Analyzing query context...',
      'Connecting to LLM API...',
      'Sending query to AI model...',
      'Processing AI response...',
      'Extracting insights and opportunities...',
      'Validating AI-generated content...',
      'Cross-referencing with knowledge base...',
      'Saving AI insights to database...'
    ];

    const processQuery = () => {
      if (queryIndex >= queryBucket.length) {
        setIsSearching(false);
        setSearchCompleted(true);
        setSearchProgress(prev => prev ? {
          ...prev,
          currentStep: 'LLM search completed!',
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
        setTimeout(processQuery, 1000 + Math.random() * 1500); // Random delay 1-2.5s
      } else {
        // Query completed, move to next
        const resultsFound = Math.floor(Math.random() * 8) + 3; // 3-10 results (LLMs typically find fewer but higher quality)
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
        setTimeout(processQuery, 800);
      }
    };

    // Start the process
    setTimeout(processQuery, 1200);
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
          <h3 className="text-lg font-semibold">LLM Search Process</h3>
          <div className="flex items-center gap-1">
            {llmServices.map((service) => {
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
                <div className="text-4xl mb-4">🤖</div>
                <h4 className="text-lg font-semibold mb-2">No Queries Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Add queries to the bucket to start AI-powered searching
                </p>
              </div>
            ) : searchCompleted && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">🧠</div>
                  <h4 className="text-2xl font-bold text-purple-600 mb-2">LLM Search Completed!</h4>
                  <p className="text-muted-foreground">
                    All {searchProgress.totalQueries} queries processed with AI intelligence
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {searchProgress.resultsFound} AI Insights Found
                    </div>
                    <div className="flex items-center justify-center gap-2 text-purple-700">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
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
                      <div className="font-semibold text-blue-800">AI Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">100%</div>
                    </div>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">AI Search Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1">"{log.query}"</div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs text-purple-600 font-medium">AI Verified & Added</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-purple-600">{log.results}</div>
                            <div className="text-xs text-gray-500">insights</div>
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
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Run New AI Search
                  </button>
                  <button 
                    onClick={() => {/* TODO: Navigate to opportunities */}}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View AI Insights
                  </button>
                </div>
              </div>
            ) : isSearching && searchProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">AI Search in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {searchProgress.completedQueries} / {searchProgress.totalQueries} queries
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(searchProgress.completedQueries / searchProgress.totalQueries) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Query & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-600">Current Query:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">"{searchProgress.currentQuery}"</p>
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-3 h-3 border border-purple-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">{searchProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-purple-50 rounded-md border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-800">AI Insights Found:</span>
                    <span className="text-lg font-bold text-purple-600">{searchProgress.resultsFound}</span>
                  </div>
                </div>

                {/* Search Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">AI Search Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {searchProgress.searchLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">"{log.query}"</div>
                            <div className="text-xs text-gray-500">{log.step}</div>
                          </div>
                          <div className="text-sm font-medium text-purple-600">{log.results} insights</div>
                        </div>
                      ))}
                      {searchProgress.searchLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No completed AI searches yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🤖</div>
                <h4 className="text-lg font-semibold mb-2">
                  {llmServices.find(s => s.id === activeService)?.name} AI Search Ready
                </h4>
                <p className="text-muted-foreground mb-4">
                  {scheduleEnabled 
                    ? `Will run ${scheduleFrequency} with ${queryBucket.length} queries`
                    : `Ready to search with ${queryBucket.length} queries using AI`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartSearch}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Start AI Search
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

