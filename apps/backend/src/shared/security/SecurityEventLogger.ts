import { Request } from 'express';
import { logger } from '../logging/Logger';
import { metricsCollector } from '../monitoring/MetricsCollector';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  risk_score?: number;
}

export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_TOKEN = 'invalid_token',
  MFA_SUCCESS = 'mfa_success',
  MFA_FAILURE = 'mfa_failure',
  
  // Authorization events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
  RESOURCE_ACCESS_ATTEMPT = 'resource_access_attempt',
  API_KEY_USAGE = 'api_key_usage',
  PERMISSION_VIOLATION = 'permission_violation',
  
  // Security violations
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALICIOUS_REQUEST = 'malicious_request',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  DIRECTORY_TRAVERSAL_ATTEMPT = 'directory_traversal_attempt',
  COMMAND_INJECTION_ATTEMPT = 'command_injection_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  UNUSUAL_REQUEST_PATTERN = 'unusual_request_pattern',
  
  // Data security events
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT = 'data_export',
  BULK_DATA_ACCESS = 'bulk_data_access',
  UNAUTHORIZED_DATA_ACCESS = 'unauthorized_data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  
  // System security events
  SECURITY_CONFIGURATION_CHANGE = 'security_configuration_change',
  FIREWALL_BLOCK = 'firewall_block',
  INTRUSION_DETECTED = 'intrusion_detected',
  VULNERABILITY_EXPLOIT_ATTEMPT = 'vulnerability_exploit_attempt',
  SECURITY_SCAN_DETECTED = 'security_scan_detected',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class SecurityEventLogger {
  private static instance: SecurityEventLogger;
  private eventBuffer: SecurityEvent[] = [];
  private maxBufferSize: number = 1000;
  private flushInterval: NodeJS.Timeout | null = null;
  private riskThresholds = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  };

  private constructor() {
    this.startPeriodicFlush();
  }

  public static getInstance(): SecurityEventLogger {
    if (!SecurityEventLogger.instance) {
      SecurityEventLogger.instance = new SecurityEventLogger();
    }
    return SecurityEventLogger.instance;
  }

  // Log security event
  public logEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    message: string,
    req?: Request,
    metadata: Record<string, any> = {}
  ): void {
    const event: SecurityEvent = {
      type,
      severity,
      message,
      userId: (req as any)?.user?.id,
      sessionId: (req as any)?.sessionId || (req as any)?.user?.sessionId,
      requestId: (req as any)?.requestId,
      ip: req?.ip || req?.socket?.remoteAddress,
      userAgent: req?.get('user-agent'),
      timestamp: Date.now(),
      metadata,
      risk_score: this.calculateRiskScore(type, severity, metadata),
    };

    // Add to buffer
    this.addToBuffer(event);

    // Log immediately based on severity
    this.logImmediately(event);

    // Record metrics
    this.recordSecurityMetrics(event);

    // Trigger alerts for high-severity events
    if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
      this.triggerAlert(event);
    }
  }

  // Authentication event methods
  public logLoginSuccess(userId: string, method: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.LOGIN_SUCCESS,
      SecuritySeverity.LOW,
      `User ${userId} successfully logged in using ${method}`,
      req,
      { userId, method, loginMethod: method }
    );

    metricsCollector.recordAuthEvent('login', method);
  }

  public logLoginFailure(
    username: string,
    reason: string,
    req?: Request,
    attemptCount?: number
  ): void {
    const severity = attemptCount && attemptCount >= 5 
      ? SecuritySeverity.HIGH 
      : SecuritySeverity.MEDIUM;

    this.logEvent(
      SecurityEventType.LOGIN_FAILURE,
      severity,
      `Login failed for user ${username}: ${reason}`,
      req,
      { username, reason, attemptCount }
    );

    metricsCollector.recordAuthEvent('failed_login', 'password');
  }

  public logLogout(userId: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.LOGOUT,
      SecuritySeverity.LOW,
      `User ${userId} logged out`,
      req,
      { userId }
    );

    metricsCollector.recordAuthEvent('logout', 'manual');
  }

  public logPasswordChange(userId: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.PASSWORD_CHANGE,
      SecuritySeverity.MEDIUM,
      `User ${userId} changed password`,
      req,
      { userId }
    );
  }

  public logTokenRefresh(userId: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.TOKEN_REFRESH,
      SecuritySeverity.LOW,
      `Token refreshed for user ${userId}`,
      req,
      { userId }
    );

    metricsCollector.recordAuthEvent('token_refresh', 'jwt');
  }

  public logInvalidToken(token: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.INVALID_TOKEN,
      SecuritySeverity.MEDIUM,
      'Invalid token presented',
      req,
      { tokenPrefix: token.substring(0, 10) + '...' }
    );
  }

  // Authorization event methods
  public logAccessGranted(
    userId: string,
    resource: string,
    action: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.ACCESS_GRANTED,
      SecuritySeverity.LOW,
      `User ${userId} granted access to ${action} ${resource}`,
      req,
      { userId, resource, action }
    );
  }

  public logAccessDenied(
    userId: string,
    resource: string,
    action: string,
    reason: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.ACCESS_DENIED,
      SecuritySeverity.MEDIUM,
      `User ${userId} denied access to ${action} ${resource}: ${reason}`,
      req,
      { userId, resource, action, reason }
    );
  }

  public logPrivilegeEscalationAttempt(
    userId: string,
    attemptedRole: string,
    currentRole: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
      SecuritySeverity.HIGH,
      `User ${userId} attempted privilege escalation from ${currentRole} to ${attemptedRole}`,
      req,
      { userId, attemptedRole, currentRole }
    );
  }

  // Security violation methods
  public logBruteForceDetected(
    target: string,
    attemptCount: number,
    timeWindow: number,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecuritySeverity.HIGH,
      `Brute force attack detected against ${target}: ${attemptCount} attempts in ${timeWindow}ms`,
      req,
      { target, attemptCount, timeWindow }
    );
  }

  public logSuspiciousActivity(
    activity: string,
    indicators: string[],
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecuritySeverity.MEDIUM,
      `Suspicious activity detected: ${activity}`,
      req,
      { activity, indicators }
    );
  }

  public logMaliciousRequest(
    attackType: string,
    payload: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.MALICIOUS_REQUEST,
      SecuritySeverity.HIGH,
      `Malicious request detected: ${attackType}`,
      req,
      { attackType, payload: payload.substring(0, 200) }
    );
  }

  public logXSSAttempt(payload: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.XSS_ATTEMPT,
      SecuritySeverity.HIGH,
      'XSS attack attempt detected',
      req,
      { payload: payload.substring(0, 200) }
    );
  }

  public logSQLInjectionAttempt(payload: string, req?: Request): void {
    this.logEvent(
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecuritySeverity.CRITICAL,
      'SQL injection attempt detected',
      req,
      { payload: payload.substring(0, 200) }
    );
  }

  public logRateLimitExceeded(
    limit: number,
    timeWindow: number,
    endpoint: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecuritySeverity.MEDIUM,
      `Rate limit exceeded: ${limit} requests per ${timeWindow}ms on ${endpoint}`,
      req,
      { limit, timeWindow, endpoint }
    );
  }

  // Data security methods
  public logSensitiveDataAccess(
    userId: string,
    dataType: string,
    recordCount: number,
    req?: Request
  ): void {
    const severity = recordCount > 100 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;
    
    this.logEvent(
      SecurityEventType.SENSITIVE_DATA_ACCESS,
      severity,
      `User ${userId} accessed ${recordCount} ${dataType} records`,
      req,
      { userId, dataType, recordCount }
    );
  }

  public logDataExport(
    userId: string,
    dataType: string,
    recordCount: number,
    format: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.DATA_EXPORT,
      SecuritySeverity.HIGH,
      `User ${userId} exported ${recordCount} ${dataType} records in ${format} format`,
      req,
      { userId, dataType, recordCount, format }
    );
  }

  public logUnauthorizedDataAccess(
    userId: string,
    attemptedResource: string,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.UNAUTHORIZED_DATA_ACCESS,
      SecuritySeverity.HIGH,
      `User ${userId} attempted unauthorized access to ${attemptedResource}`,
      req,
      { userId, attemptedResource }
    );
  }

  // System security methods
  public logSecurityConfigChange(
    userId: string,
    configType: string,
    changeDetails: Record<string, any>,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.SECURITY_CONFIGURATION_CHANGE,
      SecuritySeverity.HIGH,
      `User ${userId} modified ${configType} security configuration`,
      req,
      { userId, configType, changeDetails }
    );
  }

  public logIntrusionDetected(
    intrusionType: string,
    indicators: string[],
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.INTRUSION_DETECTED,
      SecuritySeverity.CRITICAL,
      `Intrusion detected: ${intrusionType}`,
      req,
      { intrusionType, indicators }
    );
  }

  public logSecurityScanDetected(
    scanType: string,
    requestCount: number,
    req?: Request
  ): void {
    this.logEvent(
      SecurityEventType.SECURITY_SCAN_DETECTED,
      SecuritySeverity.MEDIUM,
      `Security scan detected: ${scanType} with ${requestCount} requests`,
      req,
      { scanType, requestCount }
    );
  }

  // Get security events
  public getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    let events = [...this.eventBuffer];

    if (filter) {
      events = events.filter(event => {
        return Object.keys(filter).every(key => {
          return event[key as keyof SecurityEvent] === filter[key as keyof SecurityEvent];
        });
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.getEvents({ type });
  }

  public getEventsBySeverity(severity: SecuritySeverity): SecurityEvent[] {
    return this.getEvents({ severity });
  }

  public getEventsInTimeRange(startTime: number, endTime: number): SecurityEvent[] {
    return this.eventBuffer.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  public getHighRiskEvents(threshold: number = 75): SecurityEvent[] {
    return this.eventBuffer.filter(event => 
      event.risk_score && event.risk_score >= threshold
    );
  }

  // Security analytics
  public getSecuritySummary(timeRange: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    riskDistribution: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
  } {
    const cutoffTime = Date.now() - timeRange;
    const recentEvents = this.eventBuffer.filter(event => event.timestamp >= cutoffTime);

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const riskDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const ipCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    for (const event of recentEvents) {
      // Count by type
      byType[event.type] = (byType[event.type] || 0) + 1;
      
      // Count by severity
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      
      // Risk distribution
      if (event.risk_score) {
        if (event.risk_score >= this.riskThresholds.critical) {
          riskDistribution.critical = (riskDistribution.critical || 0) + 1;
        } else if (event.risk_score >= this.riskThresholds.high) {
          riskDistribution.high = (riskDistribution.high || 0) + 1;
        } else if (event.risk_score >= this.riskThresholds.medium) {
          riskDistribution.medium = (riskDistribution.medium || 0) + 1;
        } else {
          riskDistribution.low = (riskDistribution.low || 0) + 1;
        }
      }
      
      // Count by IP
      if (event.ip) {
        ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
      }
      
      // Count by user
      if (event.userId) {
        userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
      }
    }

    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: recentEvents.length,
      byType,
      bySeverity,
      riskDistribution,
      topIPs,
      topUsers,
    };
  }

  // Private methods
  private addToBuffer(event: SecurityEvent): void {
    this.eventBuffer.push(event);
    
    // Trim buffer if too large
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }
  }

  private logImmediately(event: SecurityEvent): void {
    logger.logSecurity(event.message, {
      event: event.type,
      severity: event.severity,
      details: {
        userId: event.userId,
        ip: event.ip,
        userAgent: event.userAgent,
        riskScore: event.risk_score,
        ...event.metadata,
      }
    });
  }

  private recordSecurityMetrics(event: SecurityEvent): void {
    // Increment event counter
    metricsCollector.incrementCounter('security_events_total', {
      type: event.type,
      severity: event.severity,
    });

    // Record risk score
    if (event.risk_score) {
      metricsCollector.observeHistogram('security_event_risk_score', event.risk_score, {
        type: event.type,
      });
    }

    // Track high-risk events
    if (event.risk_score && event.risk_score >= this.riskThresholds.high) {
      metricsCollector.incrementCounter('security_high_risk_events_total', {
        type: event.type,
      });
    }
  }

  private calculateRiskScore(
    type: SecurityEventType,
    severity: SecuritySeverity,
    metadata: Record<string, any>
  ): number {
    let baseScore = 0;

    // Base score by severity
    switch (severity) {
      case SecuritySeverity.LOW:
        baseScore = 10;
        break;
      case SecuritySeverity.MEDIUM:
        baseScore = 30;
        break;
      case SecuritySeverity.HIGH:
        baseScore = 60;
        break;
      case SecuritySeverity.CRITICAL:
        baseScore = 90;
        break;
    }

    // Adjust based on event type
    const typeMultipliers: Record<string, number> = {
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 1.5,
      [SecurityEventType.INTRUSION_DETECTED]: 1.4,
      [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: 1.3,
      [SecurityEventType.BRUTE_FORCE_DETECTED]: 1.2,
      [SecurityEventType.LOGIN_FAILURE]: 0.8,
      [SecurityEventType.LOGIN_SUCCESS]: 0.3,
    };

    const multiplier = typeMultipliers[type] || 1.0;
    baseScore *= multiplier;

    // Adjust based on metadata
    if (metadata.attemptCount && metadata.attemptCount > 5) {
      baseScore *= 1.2;
    }

    if (metadata.recordCount && metadata.recordCount > 1000) {
      baseScore *= 1.3;
    }

    return Math.min(100, Math.max(0, Math.round(baseScore)));
  }

  private triggerAlert(event: SecurityEvent): void {
    // In a real implementation, this would trigger external alerts
    logger.error('HIGH SEVERITY SECURITY EVENT', {
      type: event.type,
      severity: event.severity,
      message: event.message,
      riskScore: event.risk_score,
      userId: event.userId,
      ip: event.ip,
    });

    // Could integrate with external alerting systems like:
    // - Slack/Teams notifications
    // - Email alerts
    // - SMS alerts
    // - External SIEM systems
    // - PagerDuty/Opsgenie
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      // Periodic cleanup and analysis
      this.performPeriodicAnalysis();
    }, 60000); // Every minute
  }

  private performPeriodicAnalysis(): void {
    const recentEvents = this.getEventsInTimeRange(Date.now() - 60000, Date.now());
    
    if (recentEvents.length === 0) {
      return;
    }

    // Check for patterns that might indicate coordinated attacks
    const ipGroups: Record<string, SecurityEvent[]> = {};
    for (const event of recentEvents) {
      if (event.ip) {
        if (!ipGroups[event.ip]) {
          ipGroups[event.ip] = [];
        }
        ipGroups[event.ip]?.push(event);
      }
    }

    // Alert on suspicious IP activity
    for (const [ip, events] of Object.entries(ipGroups)) {
      if (events.length > 10) {
        this.logSuspiciousActivity(
          'High activity from single IP',
          [`${events.length} events from ${ip}`, 'Possible coordinated attack'],
          events[0] as any
        );
      }
    }
  }

  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// Export singleton instance
export const securityEventLogger = SecurityEventLogger.getInstance();