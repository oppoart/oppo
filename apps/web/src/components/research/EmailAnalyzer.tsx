'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Clock, Settings, BarChart3, Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw, Target, Eye, Zap } from 'lucide-react';

interface ReceivedEmail {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  receivedDate: Date;
  isRead: boolean;
  hasAttachments: boolean;
  category: string;
  status: 'unprocessed' | 'processing' | 'processed' | 'opportunities_found';
  snippet: string;
  opportunityCount?: number;
}

interface EmailAnalyzerProps {
  emails: ReceivedEmail[];
  selectedEmails: string[];
  onUpdateEmailStatus: (id: string, status: ReceivedEmail['status'], opportunityCount?: number) => void;
}

export function EmailAnalyzer({ emails, selectedEmails, onUpdateEmailStatus }: EmailAnalyzerProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(true);
  const [analysisMode, setAnalysisMode] = useState('opportunities');
  const [analysisProgress, setAnalysisProgress] = useState<{
    currentEmail: string;
    currentStep: string;
    analyzedCount: number;
    totalEmails: number;
    newOpportunities: number;
    analysisLog: Array<{
      email: string;
      status: 'success' | 'failed' | 'no-opportunities';
      opportunities: number;
      timestamp: Date;
    }>;
  } | null>(null);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  const selectedEmailsList = emails.filter(email => selectedEmails.includes(email.id));

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisCompleted(false);
    setAnalysisProgress({
      currentEmail: '',
      currentStep: 'Initializing email analysis...',
      analyzedCount: 0,
      totalEmails: selectedEmailsList.length,
      newOpportunities: 0,
      analysisLog: []
    });

    // Simulate email analysis process
    let emailIndex = 0;
    let stepIndex = 0;
    const steps = [
      'Loading email content...',
      'Parsing HTML and text content...',
      'Identifying opportunity keywords...',
      'Extracting dates and deadlines...',
      'Analyzing submission requirements...',
      'Categorizing opportunity types...',
      'Saving opportunities to database...'
    ];

    const analyzeEmail = () => {
      if (emailIndex >= selectedEmailsList.length) {
        setIsAnalyzing(false);
        setAnalysisCompleted(true);
        setAnalysisProgress(prev => prev ? {
          ...prev,
          currentStep: 'Email analysis completed!',
          currentEmail: ''
        } : null);
        return;
      }

      const currentEmail = selectedEmailsList[emailIndex];
      const currentStep = steps[stepIndex];
      
      // Update email status to processing
      if (stepIndex === 0) {
        onUpdateEmailStatus(currentEmail.id, 'processing');
      }
      
      setAnalysisProgress(prev => prev ? {
        ...prev,
        currentEmail: currentEmail.subject,
        currentStep,
        analyzedCount: emailIndex
      } : null);

      // Simulate step progression
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setTimeout(analyzeEmail, 600 + Math.random() * 800);
      } else {
        // Email analyzed, move to next
        const hasOpportunities = Math.random() > 0.4;
        const opportunities = hasOpportunities ? Math.floor(Math.random() * 3) + 1 : 0;
        const status = opportunities > 0 ? 'opportunities_found' : 'processed';
        
        // Update email status
        onUpdateEmailStatus(currentEmail.id, status, opportunities);
        
        setAnalysisProgress(prev => prev ? {
          ...prev,
          analyzedCount: emailIndex + 1,
          newOpportunities: prev.newOpportunities + opportunities,
          analysisLog: [...prev.analysisLog, {
            email: currentEmail.subject,
            status: opportunities > 0 ? 'success' : 'no-opportunities',
            opportunities,
            timestamp: new Date()
          }]
        } : null);
        
        emailIndex++;
        stepIndex = 0;
        setTimeout(analyzeEmail, 400);
      }
    };

    // Start the analysis
    setTimeout(analyzeEmail, 800);
  };

  const handleResetAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisCompleted(false);
    setAnalysisProgress(null);
  };

  return (
    <div className="flex-1">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Email Analyzer</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedEmails.length} selected emails
            </span>
          </div>
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Analysis Controls */}
        <div className="mb-4 space-y-3">
          {/* Auto-Analysis Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Auto-Analysis:</span>
              <span className={`text-sm font-medium ${autoAnalyzeEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {autoAnalyzeEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <button
              onClick={() => setAutoAnalyzeEnabled(!autoAnalyzeEnabled)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                autoAnalyzeEnabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {autoAnalyzeEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {autoAnalyzeEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Analysis Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analysis Mode:</span>
              <span className="text-sm font-medium">Opportunity Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="opportunities">Find Opportunities</option>
                <option value="deadlines">Extract Deadlines</option>
                <option value="contacts">Find Contacts</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
              <button className="p-1 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-50 rounded-md p-4">
            {selectedEmails.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📧</div>
                <h4 className="text-lg font-semibold mb-2">No Emails Selected</h4>
                <p className="text-muted-foreground mb-4">
                  Select emails from the left panel to analyze for opportunities
                </p>
              </div>
            ) : analysisCompleted && analysisProgress ? (
              <div className="h-full flex flex-col">
                {/* Completion Header */}
                <div className="mb-4 text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h4 className="text-2xl font-bold text-green-600 mb-2">Analysis Completed!</h4>
                  <p className="text-muted-foreground">
                    Analyzed {analysisProgress.analyzedCount} emails for opportunities
                  </p>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {analysisProgress.newOpportunities} Opportunities Found
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <Target className="h-4 w-4" />
                      <span className="font-medium">Ready for application tracking</span>
                    </div>
                  </div>
                </div>

                {/* Analysis Stats */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Emails Analyzed</div>
                      <div className="text-xl font-bold text-blue-600">{analysisProgress.analyzedCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Opportunities</div>
                      <div className="text-xl font-bold text-blue-600">{analysisProgress.newOpportunities}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-800">Success Rate</div>
                      <div className="text-xl font-bold text-blue-600">
                        {Math.round((analysisProgress.analysisLog.filter(l => l.status === 'success').length / analysisProgress.analysisLog.length) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Analysis Results:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {analysisProgress.analysisLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 mb-1 truncate">{log.email}</div>
                            <div className="flex items-center gap-2">
                              {log.status === 'success' && (
                                <>
                                  <Target className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600 font-medium">{log.opportunities} opportunities extracted</span>
                                </>
                              )}
                              {log.status === 'no-opportunities' && (
                                <>
                                  <Eye className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600 font-medium">No opportunities found</span>
                                </>
                              )}
                              {log.status === 'failed' && (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600 font-medium">Analysis failed</span>
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
                    onClick={handleResetAnalysis}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Analyze More Emails
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/opportunities')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    View Opportunities
                  </button>
                </div>
              </div>
            ) : isAnalyzing && analysisProgress ? (
              <div className="h-full flex flex-col">
                {/* Progress Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Analyzing in Progress</h4>
                    <div className="text-sm text-muted-foreground">
                      {analysisProgress.analyzedCount} / {analysisProgress.totalEmails} emails
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(analysisProgress.analyzedCount / analysisProgress.totalEmails) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Email & Step */}
                <div className="mb-4 p-3 bg-white rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-primary">Current Email:</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 truncate">{analysisProgress.currentEmail}</p>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="animate-spin h-3 w-3 text-primary" />
                    <span className="text-sm text-gray-600">{analysisProgress.currentStep}</span>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Opportunities Found:</span>
                    <span className="text-lg font-bold text-green-600">{analysisProgress.newOpportunities}</span>
                  </div>
                </div>

                {/* Analysis Log */}
                <div className="flex-1 overflow-hidden">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Analysis Log:</h5>
                  <div className="bg-white rounded-md border h-full overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {analysisProgress.analysisLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">{log.email}</div>
                            <div className="text-xs text-gray-500">
                              {log.status === 'success' && `${log.opportunities} opportunities found`}
                              {log.status === 'no-opportunities' && 'No opportunities detected'}
                              {log.status === 'failed' && 'Analysis failed'}
                            </div>
                          </div>
                          {log.status === 'success' && <Target className="h-4 w-4 text-green-500" />}
                          {log.status === 'no-opportunities' && <Eye className="h-4 w-4 text-gray-500" />}
                          {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                      ))}
                      {analysisProgress.analysisLog.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No emails analyzed yet...
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
                  Ready to Analyze
                </h4>
                <p className="text-muted-foreground mb-4">
                  {autoAnalyzeEnabled 
                    ? `Auto-analysis enabled for ${selectedEmails.length} emails`
                    : `Ready to analyze ${selectedEmails.length} selected emails for opportunities`
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleStartAnalysis}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium"
                  >
                    Start Analysis
                  </button>
                  {!autoAnalyzeEnabled && (
                    <button 
                      onClick={() => setAutoAnalyzeEnabled(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                    >
                      Enable Auto-Analysis
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