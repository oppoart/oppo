import { useState, useEffect, useRef } from 'react';
import { ArtistProfile } from '@/types/profile';
import { profileApi, researchApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ServiceSession {
  sessionId?: string;
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: any[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  startedAt?: Date;
  updatedAt?: Date;
}

interface UseResearchServicesProps {
  serviceIds: string[];
  serviceNames: Record<string, string>;
}

export function useResearchServices({ serviceIds, serviceNames }: UseResearchServicesProps) {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceSession[]>(
    serviceIds.map(id => ({ id, status: 'idle', retryCount: 0, maxRetries: 3 }))
  );
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { toast } = useToast();

  // Utility function for exponential backoff retry
  const retryWithBackoff = async (
    fn: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };

  // Check if error is retryable
  const isRetryableError = (error: any): boolean => {
    if (!error) return false;
    
    const retryableMessages = [
      'network error',
      'timeout',
      'connection refused',
      'service unavailable',
      'rate limit',
      'server error'
    ];
    
    const errorMessage = (error.message || '').toLowerCase();
    const errorStatus = error.response?.status;
    
    return (
      (errorStatus >= 500 && errorStatus < 600) ||
      errorStatus === 429 ||
      retryableMessages.some(msg => errorMessage.includes(msg))
    );
  };

  // Enhanced error handling utility
  const handleServiceError = (serviceId: string, error: any, context: string) => {
    console.error(`${context} error for ${serviceId}:`, error);
    
    const service = services.find(s => s.id === serviceId);
    const isRetryable = isRetryableError(error);
    const canRetry = service && (service.retryCount || 0) < (service.maxRetries || 3);
    
    if (isRetryable && canRetry) {
      scheduleRetry(serviceId, error.message || 'Unknown error');
    } else {
      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { 
              ...s, 
              status: 'error',
              error: error.message || 'Service failed',
              progress: undefined
            }
          : s
      ));

      toast({
        title: "Service Failed",
        description: `${serviceNames[serviceId] || serviceId} failed: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Schedule a retry for a failed service
  const scheduleRetry = (serviceId: string, lastError: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const retryCount = (service.retryCount || 0) + 1;
    const retryDelay = 2000 * Math.pow(2, retryCount - 1);

    setServices(prev => prev.map(s => 
      s.id === serviceId 
        ? { 
            ...s, 
            retryCount,
            error: `Retrying in ${Math.round(retryDelay / 1000)}s (${retryCount}/${s.maxRetries})...`
          }
        : s
    ));

    const existingTimeout = retryTimeoutsRef.current.get(serviceId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(async () => {
      if (!selectedProfile) return;

      try {
        await handleServiceStart(serviceId, true);
        retryTimeoutsRef.current.delete(serviceId);
      } catch (error) {
        handleServiceError(serviceId, error, 'Retry attempt');
      }
    }, retryDelay);

    retryTimeoutsRef.current.set(serviceId, timeoutId);

    toast({
      title: "Retrying Service",
      description: `${serviceNames[serviceId] || serviceId} will retry in ${Math.round(retryDelay / 1000)} seconds (attempt ${retryCount}/${service.maxRetries})`,
    });
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const profilesData = await profileApi.getProfiles();
      setProfiles(profilesData);
      
      if (profilesData.length > 0) {
        setSelectedProfile(profilesData[0]);
        await loadActiveSessions(profilesData[0].id);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async (profileId: string) => {
    try {
      const sessions = await retryWithBackoff(async () => {
        return await researchApi.getActiveSessions(profileId);
      }, 2, 1000);
      
      setServices(prev => prev.map(service => {
        const activeSession = sessions.find((s: any) => s.serviceId === service.id);
        if (activeSession) {
          return {
            ...service,
            sessionId: activeSession.sessionId,
            status: activeSession.status,
            progress: activeSession.progress,
            startedAt: new Date(activeSession.startedAt),
            updatedAt: new Date(activeSession.updatedAt),
            retryCount: 0
          };
        }
        return { ...service, status: 'idle' as const, retryCount: 0, maxRetries: 3 };
      }));

      for (const session of sessions) {
        if (session.resultsCount > 0) {
          try {
            await loadSessionResults(session.serviceId, session.sessionId);
          } catch (resultError) {
            console.error(`Failed to load results for ${session.serviceId}:`, resultError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
      toast({
        title: "Session Load Failed",
        description: "Failed to load active research sessions. Please refresh to try again.",
        variant: "destructive",
      });
    }
  };

  const loadSessionResults = async (serviceId: string, sessionId: string) => {
    try {
      const response = await retryWithBackoff(async () => {
        return await researchApi.getServiceResults(serviceId, sessionId, { limit: 50 });
      }, 2, 500);
      
      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, results: response.results } : service
      ));
    } catch (error) {
      console.error('Error loading session results:', error);
      setServices(prev => prev.map(service => 
        service.id === serviceId 
          ? { 
              ...service, 
              error: 'Failed to load results'
            } 
          : service
      ));
    }
  };

  const startPolling = () => {
    if (pollingIntervalRef.current) return;
    
    pollingIntervalRef.current = setInterval(async () => {
      await updateServiceStatuses();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const updateServiceStatuses = async () => {
    const runningSessions = services.filter(service => 
      service.status === 'running' && service.sessionId
    );

    for (const service of runningSessions) {
      try {
        const status = await retryWithBackoff(async () => {
          return await researchApi.getServiceStatus(service.id, service.sessionId!);
        }, 1, 500);
        
        setServices(prev => prev.map(s => 
          s.id === service.id ? {
            ...s,
            status: status.status,
            progress: status.progress,
            updatedAt: new Date(status.updatedAt),
            error: status.error
          } : s
        ));

        if (status.status === 'completed' && status.resultsCount > 0) {
          try {
            await loadSessionResults(service.id, service.sessionId!);
          } catch (resultError) {
            console.error(`Error loading results for ${service.id}:`, resultError);
          }
        }

        if (status.status === 'error') {
          const error = new Error(status.error || 'Service failed');
          handleServiceError(service.id, error, 'Service polling');
        }
      } catch (error) {
        console.error(`Error updating status for ${service.id}:`, error);
        
        const isNetworkError = isRetryableError(error);
        if (!isNetworkError) {
          setServices(prev => prev.map(s => 
            s.id === service.id ? {
              ...s,
              status: 'error',
              error: 'Lost connection to service'
            } : s
          ));
        }
      }
    }
  };

  const handleProfileChange = async (profile: ArtistProfile) => {
    stopPolling();
    setSelectedProfile(profile);
    
    retryTimeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    retryTimeoutsRef.current.clear();
    
    setServices(prev => prev.map(service => ({
      id: service.id,
      status: 'idle' as const,
      progress: undefined,
      results: undefined,
      error: undefined,
      sessionId: undefined,
      retryCount: 0,
      maxRetries: 3
    })));

    await loadActiveSessions(profile.id);

    toast({
      title: "Profile Selected",
      description: `Switched to ${profile.name} profile`,
    });
  };

  const handleServiceStart = async (serviceId: string, isRetry: boolean = false) => {
    if (!selectedProfile) {
      if (!isRetry) {
        toast({
          title: "No Profile Selected",
          description: "Please select a profile before starting services",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { 
              ...s, 
              status: 'running',
              progress: 0, 
              error: undefined,
              startedAt: new Date()
            }
          : s
      ));

      const response = await retryWithBackoff(async () => {
        return await researchApi.startService(serviceId, selectedProfile.id, {
          maxQueries: 10,
          priority: 'medium'
        });
      }, 2, 1000);

      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { 
              ...s, 
              sessionId: response.sessionId,
              retryCount: 0
            }
          : s
      ));

      if (!isRetry) {
        toast({
          title: "Service Started",
          description: `${serviceNames[serviceId] || serviceId} is now running`,
        });
      } else {
        toast({
          title: "Retry Successful",
          description: `${serviceNames[serviceId] || serviceId} started successfully after retry`,
        });
      }
    } catch (error: any) {
      handleServiceError(serviceId, error, isRetry ? 'Retry start' : 'Service start');
    }
  };

  const handleServiceStop = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service?.sessionId) {
      toast({
        title: "No Active Session",
        description: "No active session found for this service",
        variant: "destructive",
      });
      return;
    }

    try {
      await researchApi.stopService(serviceId, service.sessionId);
      
      setServices(prev => prev.map(s => 
        s.id === serviceId 
          ? { ...s, status: 'stopped', progress: undefined }
          : s
      ));

      toast({
        title: "Service Stopped",
        description: `${serviceNames[serviceId] || serviceId} has been stopped`,
      });
    } catch (error: any) {
      console.error('Error stopping service:', error);
      toast({
        title: "Stop Failed",
        description: error.message || 'Failed to stop service',
        variant: "destructive",
      });
    }
  };

  const handleRefreshAll = async () => {
    if (!selectedProfile) return;

    try {
      setRefreshing(true);
      await loadActiveSessions(selectedProfile.id);
      toast({
        title: "Refreshed",
        description: "Service statuses and results updated",
      });
    } catch (error: any) {
      console.error('Error refreshing:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh service data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportResults = async (format: 'json' | 'csv' = 'json') => {
    if (!selectedProfile) return;

    try {
      setExporting(true);
      const activeServiceIds = services
        .filter(service => service.results && service.results.length > 0)
        .map(service => service.id);

      if (activeServiceIds.length === 0) {
        toast({
          title: "No Results to Export",
          description: "Start some research services to generate results for export",
          variant: "destructive",
        });
        return;
      }

      const exportData = await researchApi.exportResults(selectedProfile.id, activeServiceIds, format);

      if (format === 'csv') {
        const blob = new Blob([exportData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-export-${selectedProfile.name}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-export-${selectedProfile.name}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Complete",
        description: `Research results exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export results",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      retryTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      retryTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const hasRunningSessions = services.some(service => 
      service.status === 'running' && service.sessionId
    );

    if (hasRunningSessions && !pollingIntervalRef.current) {
      startPolling();
    } else if (!hasRunningSessions && pollingIntervalRef.current) {
      stopPolling();
    }
  }, [services]);

  return {
    profiles,
    selectedProfile,
    loading,
    services,
    refreshing,
    exporting,
    pollingIntervalRef,
    handleProfileChange,
    handleServiceStart,
    handleServiceStop,
    handleRefreshAll,
    handleExportResults,
  };
}
