'use client';

import { useState, useEffect } from 'react';
import { Globe, Database, CheckCircle, XCircle, Clock, Settings, Play, Pause, AlertCircle } from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'websearch' | 'organization-scraper' | 'social' | 'newsletter' | 'bookmark';
  url?: string;
  enabled: boolean;
  lastScanned?: Date;
  successCount: number;
  errorCount: number;
  status: 'active' | 'paused' | 'error' | 'maintenance';
  config?: {
    scrapeFrequency?: string;
    maxResults?: number;
    qualityThreshold?: number;
    rateLimitMs?: number;
  };
}

export function DataSourceManager() {
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'google-search',
      name: 'Google Search API',
      type: 'websearch',
      url: 'https://www.googleapis.com',
      enabled: true,
      status: 'active',
      successCount: 1247,
      errorCount: 12,
      lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      config: {
        maxResults: 20,
        qualityThreshold: 60,
        rateLimitMs: 1000
      }
    },
    {
      id: 'grants-gov',
      name: 'Grants.gov Arts Grants',
      type: 'organization-scraper',
      url: 'https://www.grants.gov',
      enabled: true,
      status: 'active',
      successCount: 89,
      errorCount: 3,
      lastScanned: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      config: {
        scrapeFrequency: 'daily',
        qualityThreshold: 70,
        rateLimitMs: 3000
      }
    },
    {
      id: 'resartis',
      name: 'ResArtis Residencies',
      type: 'organization-scraper',
      url: 'https://resartis.org',
      enabled: true,
      status: 'active',
      successCount: 156,
      errorCount: 8,
      lastScanned: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      config: {
        scrapeFrequency: 'weekly',
        qualityThreshold: 65,
        rateLimitMs: 2000
      }
    },
    {
      id: 'call-for-entry',
      name: 'Call For Entry',
      type: 'organization-scraper',
      url: 'https://www.callforentry.org',
      enabled: false,
      status: 'paused',
      successCount: 234,
      errorCount: 45,
      lastScanned: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      config: {
        scrapeFrequency: 'daily',
        qualityThreshold: 55,
        rateLimitMs: 1500
      }
    },
    {
      id: 'foundation-directory',
      name: 'Foundation Directory Online',
      type: 'organization-scraper',
      url: 'https://fdo.foundationcenter.org',
      enabled: true,
      status: 'error',
      successCount: 67,
      errorCount: 23,
      lastScanned: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      config: {
        scrapeFrequency: 'weekly',
        qualityThreshold: 80,
        rateLimitMs: 5000
      }
    }
  ]);

  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [pipelineStats, setPipelineStats] = useState<any>(null);

  // Load pipeline statistics
  useEffect(() => {
    const loadPipelineStats = async () => {
      try {
        // This would call the actual API endpoint
        // const response = await api.get('/api/research/pipeline-stats');
        // setPipelineStats(response.data);
        
        // Mock data for now
        setPipelineStats({
          queueStats: {
            'search-execution': { waiting: 2, active: 1, completed: 45, failed: 1 },
            'organization-scraping': { waiting: 0, active: 0, completed: 23, failed: 2 },
            'result-processing': { waiting: 5, active: 2, completed: 156, failed: 8 },
            'data-validation': { waiting: 1, active: 1, completed: 189, failed: 4 }
          },
          pipeline: {
            recentOpportunities: 342,
            processedOpportunities: 298,
            processingRate: 87.1
          }
        });
      } catch (error) {
        console.error('Failed to load pipeline stats:', error);
      }
    };

    loadPipelineStats();
    const interval = setInterval(loadPipelineStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const toggleDataSource = (id: string) => {
    setDataSources(prev => prev.map(source => 
      source.id === id 
        ? { 
            ...source, 
            enabled: !source.enabled,
            status: !source.enabled ? 'active' : 'paused'
          }
        : source
    ));
  };

  const testConnection = async (source: DataSource) => {
    setIsTestingConnection(true);
    
    try {
      // Simulate API call to test connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update source status
      setDataSources(prev => prev.map(s => 
        s.id === source.id 
          ? { 
              ...s, 
              status: 'active',
              lastScanned: new Date()
            }
          : s
      ));
      
      alert(`✅ Connection to ${source.name} successful!`);
    } catch (error) {
      setDataSources(prev => prev.map(s => 
        s.id === source.id 
          ? { 
              ...s, 
              status: 'error'
            }
          : s
      ));
      
      alert(`❌ Connection to ${source.name} failed: ${error}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const triggerScraping = async (sourceId: string) => {
    try {
      // This would call the actual API to trigger scraping
      // const response = await api.post('/api/research/scrape-organizations', {
      //   organizations: [sourceId],
      //   priority: 'high'
      // });
      
      alert(`🚀 Scraping job started for source: ${sourceId}`);
    } catch (error) {
      console.error('Failed to trigger scraping:', error);
      alert('Failed to start scraping job');
    }
  };

  const getStatusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: DataSource['type']) => {
    switch (type) {
      case 'websearch':
        return <Globe className="h-4 w-4" />;
      case 'organization-scraper':
        return <Database className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Data Source Management</h2>
        <p className="text-gray-600">
          Manage external data sources for the opportunity discovery pipeline
        </p>
      </div>

      {/* Pipeline Statistics */}
      {pipelineStats && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Recent Opportunities</h3>
            <div className="text-2xl font-bold text-blue-600">
              {pipelineStats.pipeline.recentOpportunities}
            </div>
            <div className="text-xs text-blue-600">Last 24 hours</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-800 mb-2">Processing Rate</h3>
            <div className="text-2xl font-bold text-green-600">
              {pipelineStats.pipeline.processingRate}%
            </div>
            <div className="text-xs text-green-600">Success rate</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-orange-800 mb-2">Queue Status</h3>
            <div className="text-2xl font-bold text-orange-600">
              {Object.values(pipelineStats.queueStats).reduce((acc: any, queue: any) => 
                acc + queue.waiting + queue.active, 0
              )}
            </div>
            <div className="text-xs text-orange-600">Jobs in progress</div>
          </div>
        </div>
      )}

      {/* Data Sources List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Data Sources</h3>
        
        {dataSources.map(source => (
          <div key={source.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(source.type)}
                  {getStatusIcon(source.status)}
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">{source.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {source.url && (
                      <span className="flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>{new URL(source.url).hostname}</span>
                      </span>
                    )}
                    {source.lastScanned && (
                      <span>
                        Last scan: {source.lastScanned.toLocaleDateString()} at {' '}
                        {source.lastScanned.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right text-sm">
                  <div className="text-green-600 font-medium">
                    {source.successCount} successful
                  </div>
                  {source.errorCount > 0 && (
                    <div className="text-red-600">
                      {source.errorCount} errors
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleDataSource(source.id)}
                    className={`p-2 rounded ${
                      source.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={source.enabled ? 'Pause source' : 'Enable source'}
                  >
                    {source.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => testConnection(source)}
                    disabled={isTestingConnection}
                    className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded disabled:opacity-50"
                    title="Test connection"
                  >
                    <Settings className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => triggerScraping(source.id)}
                    disabled={!source.enabled || source.status === 'error'}
                    className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-sm disabled:opacity-50"
                  >
                    Scrape Now
                  </button>
                </div>
              </div>
            </div>

            {/* Configuration Details */}
            {selectedSource?.id === source.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <h5 className="font-medium mb-3">Configuration</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {source.config?.scrapeFrequency && (
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <span className="ml-2 capitalize">{source.config.scrapeFrequency}</span>
                    </div>
                  )}
                  {source.config?.qualityThreshold && (
                    <div>
                      <span className="text-gray-600">Quality Threshold:</span>
                      <span className="ml-2">{source.config.qualityThreshold}%</span>
                    </div>
                  )}
                  {source.config?.maxResults && (
                    <div>
                      <span className="text-gray-600">Max Results:</span>
                      <span className="ml-2">{source.config.maxResults}</span>
                    </div>
                  )}
                  {source.config?.rateLimitMs && (
                    <div>
                      <span className="text-gray-600">Rate Limit:</span>
                      <span className="ml-2">{source.config.rateLimitMs}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedSource(selectedSource?.id === source.id ? null : source)}
              className="mt-2 text-blue-600 text-sm hover:underline"
            >
              {selectedSource?.id === source.id ? 'Hide Details' : 'Show Configuration'}
            </button>
          </div>
        ))}
      </div>

      {/* Global Actions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Pipeline Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => alert('Triggering full organization scrape...')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Scrape All Sources
          </button>
          
          <button
            onClick={() => alert('Running data validation...')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Validate Recent Data
          </button>
          
          <button
            onClick={() => alert('Starting cleanup process...')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Clean Old Data
          </button>
        </div>
      </div>
    </div>
  );
}