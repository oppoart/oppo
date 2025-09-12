'use client';

import { useState } from 'react';
import { Play, Pause, Clock, Settings, BarChart3, Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw, MailOpen } from 'lucide-react';

interface Newsletter {
  id: string;
  name: string;
  email: string;
  provider: string;
  category: string;
  frequency: string;
  subscribeDate: Date;
  lastReceived: Date | null;
  status: 'active' | 'inactive' | 'checking' | 'unsubscribed';
  unreadCount: number;
}

interface NewsletterProcessProps {
  newsletters: Newsletter[];
  selectedNewsletters: string[];
  onUpdateStatus: (id: string, status: Newsletter['status']) => void;
}

export function NewsletterProcess({ newsletters, selectedNewsletters, onUpdateStatus }: NewsletterProcessProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [processingProgress, setProcessingProgress] = useState<{
    currentNewsletter: string;
    currentStep: string;
    processedCount: number;
    totalNewsletters: number;
    newOpportunities: number;
    processingLog: Array<{
      newsletter: string;
      status: 'success' | 'failed' | 'no-new-content';
      opportunities: number;
      timestamp: Date;
    }>;
  } | null>(null);
  const [processingCompleted, setProcessingCompleted] = useState(false);

  const selectedNewslettersList = newsletters.filter(newsletter => selectedNewsletters.includes(newsletter.id));
  const totalUnreadCount = selectedNewslettersList.reduce((sum, newsletter) => sum + newsletter.unreadCount, 0);

  const handleStartProcessing = () => {
    setIsProcessing(true);
    setProcessingCompleted(false);
    setProcessingProgress({
      currentNewsletter: '',
      currentStep: 'Initializing newsletter processing...',
      processedCount: 0,
      totalNewsletters: selectedNewslettersList.length,
      newOpportunities: 0,
      processingLog: []
    });

    // Simulate newsletter processing
    let newsletterIndex = 0;
    let stepIndex = 0;
    const steps = [
      'Connecting to email provider...',
      'Fetching latest newsletters...',
      'Analyzing newsletter content...',
      'Extracting opportunity mentions...',
      'Processing deadlines and dates...',
      'Categorizing opportunities...',
      'Saving to opportunity database...'
    ];

    const processNewsletter = () => {
      if (newsletterIndex >= selectedNewslettersList.length) {
        setIsProcessing(false);
        setProcessingCompleted(true);
        setProcessingProgress(prev => prev ? {
          ...prev,
          currentStep: 'Newsletter processing completed!',
          currentNewsletter: ''
        } : null);
        return;
      }

      const currentNewsletter = selectedNewslettersList[newsletterIndex];
      const currentStep = steps[stepIndex];
      
      // Update newsletter status to checking
      if (stepIndex === 0) {
        onUpdateStatus(currentNewsletter.id, 'checking');
      }
      
      setProcessingProgress(prev => prev ? {
        ...prev,
        currentNewsletter: currentNewsletter.name,
        currentStep,
        processedCount: newsletterIndex
      } : null);

      // Simulate step progression
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setTimeout(processNewsletter, 500 + Math.random() * 700);
      } else {
        // Newsletter processed, move to next
        const status = Math.random() > 0.15 ? 'success' : 'failed';
        const hasNewContent = Math.random() > 0.3;
        const opportunities = status === 'success' && hasNewContent ? Math.floor(Math.random() * 4) + 1 : 0;
        
        // Update newsletter status
        onUpdateStatus(currentNewsletter.id, status === 'success' ? 'active' : 'inactive');
        
        setProcessingProgress(prev => prev ? {
          ...prev,
          processedCount: newsletterIndex + 1,
          newOpportunities: prev.newOpportunities + opportunities,
          processingLog: [...prev.processingLog, {
            newsletter: currentNewsletter.name,
            status: opportunities > 0 ? 'success' : hasNewContent ? 'no-new-content' : status === 'failed' ? 'failed' : 'no-new-content',
            opportunities,
            timestamp: new Date()
          }]
        } : null);
        
        newsletterIndex++;
        stepIndex = 0;
        setTimeout(processNewsletter, 400);
      }
    };

    // Start the process
    setTimeout(processNewsletter, 800);
  };

  const handleResetProcessing = () => {
    setIsProcessing(false);
    setProcessingCompleted(false);
    setProcessingProgress(null);
  };

  return (
    <div className="flex-1">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Newsletter Processor</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedNewsletters.length} selected • {totalUnreadCount} unread
            </span>
          </div>
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Process Status and Controls */}
        <div className="mb-4 space-y-3">
          {/* Schedule Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Schedule:</span>
              <span className={`text-sm font-medium ${scheduleEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {scheduleEnabled ? `${scheduleFrequency} processing` : 'Paused'}
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

          {/* Newsletter Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Selected Newsletters:</span>
              <span className="text-sm font-medium">{selectedNewsletters.length}</span>
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

        {/* Process Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-50 rounded-md p-4">
            {selectedNewsletters.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📧</div>
                <h4 className="text-lg font-semibold mb-2">No Newsletters Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Select newsletters to process for new opportunities
                </p>
              </div>
            ) : processingCompleted && processingProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">✉️</div>
                  <h4 className="text-2xl font-bold text-green-600 mb-2">Processing Completed!</h4>
                  <p className="text-muted-foreground">
                    Processed {processingProgress.processedCount} newsletters for opportunities
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {processingProgress.newOpportunities} New Opportunities
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Found from newsletter content</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Processed</div>
                      <div className="text-xl font-bold text-blue-600">{processingProgress.processedCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Opportunities</div>
                      <div className="text-xl font-bold text-blue-600">{processingProgress.newOpportunities}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">
                        {Math.round((processingProgress.processingLog.filter(l => l.status !== 'failed').length / processingProgress.processingLog.length) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processing Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Processing Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {processingProgress.processingLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1">{log.newsletter}</div>
                            <div className="flex items-center gap-2">
                              {log.status === 'success' && (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600 font-medium">{log.opportunities} opportunities found</span>
                                </>
                              )}
                              {log.status === 'no-new-content' && (
                                <>
                                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs text-yellow-600 font-medium">No new content</span>
                                </>
                              )}
                              {log.status === 'failed' && (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">Processing failed</span>
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
                    onClick={handleResetProcessing}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Process New Newsletters
                  </button>
                  <button 
                    onClick={() => {/* TODO: Navigate to opportunities */}}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View Opportunities
                  </button>
                </div>
              </div>
            ) : isProcessing && processingProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Processing in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {processingProgress.processedCount} / {processingProgress.totalNewsletters} newsletters
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(processingProgress.processedCount / processingProgress.totalNewsletters) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Newsletter & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-primary">Current Newsletter:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{processingProgress.currentNewsletter}</p>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="animate-spin h-3 w-3 text-primary" />
                    <span className="text-sm text-gray-600">{processingProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">New Opportunities Found:</span>
                    <span className="text-lg font-bold text-blue-600">{processingProgress.newOpportunities}</span>
                  </div>
                </div>

                {/* Processing Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Processing Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {processingProgress.processingLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{log.newsletter}</div>
                            <div className="text-xs text-gray-500">
                              {log.status === 'success' && `${log.opportunities} opportunities found`}
                              {log.status === 'no-new-content' && 'No new content'}
                              {log.status === 'failed' && 'Failed to process'}
                            </div>
                          </div>
                          {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {log.status === 'no-new-content' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      ))}
                      {processingProgress.processingLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No newsletters processed yet...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📬</div>
                <h4 className="text-lg font-semibold mb-2">
                  Ready to Process
                </h4>
                <p className="text-muted-foreground mb-4">
                  {scheduleEnabled 
                    ? `Will process ${selectedNewsletters.length} newsletters ${scheduleFrequency}`
                    : `Ready to process ${selectedNewsletters.length} newsletters with ${totalUnreadCount} unread items`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartProcessing}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Start Processing
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