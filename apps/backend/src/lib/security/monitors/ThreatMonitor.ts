import { Request } from 'express';
import { logger } from '../../logging/Logger';
import { securityEventLogger, SecurityEventType, SecuritySeverity } from '../SecurityEventLogger';
import { metricsCollector } from '../../monitoring/MetricsCollector';

export interface ThreatPattern {
  name: string;
  regex: RegExp;
  severity: SecuritySeverity;
  description: string;
}

export interface IPAnalysis {
  ip: string;
  requestCount: number;
  lastSeen: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
  blocked: boolean;
}

export class ThreatMonitor {
  private static instance: ThreatMonitor;
  private ipTracker: Map<string, {
    requests: Array<{ timestamp: number; endpoint: string; suspicious: boolean }>;
    failedLogins: number;
    lastFailedLogin: number;
    blocked: boolean;
    threatLevel: string;
  }> = new Map();

  private suspiciousPatterns: ThreatPattern[] = [
    // XSS patterns
    {
      name: 'XSS_SCRIPT_TAG',
      regex: /<script[^>]*>.*?<\/script>/gi,
      severity: SecuritySeverity.HIGH,
      description: 'Script tag injection attempt'
    },
    {
      name: 'XSS_JAVASCRIPT',
      regex: /javascript:/gi,
      severity: SecuritySeverity.HIGH,
      description: 'JavaScript protocol injection'
    },
    {
      name: 'XSS_ONERROR',
      regex: /on(error|load|click|mouseover)=/gi,
      severity: SecuritySeverity.HIGH,
      description: 'Event handler injection'
    },
    
    // SQL Injection patterns
    {
      name: 'SQL_UNION_SELECT',
      regex: /union\s+select/gi,
      severity: SecuritySeverity.CRITICAL,
      description: 'SQL UNION SELECT injection'
    },
    {
      name: 'SQL_OR_INJECTION',
      regex: /'\s*or\s*'.*?'=/gi,
      severity: SecuritySeverity.CRITICAL,
      description: 'SQL OR injection'
    },
    {
      name: 'SQL_COMMENT',
      regex: /--|\*\/|\/\*/gi,
      severity: SecuritySeverity.HIGH,
      description: 'SQL comment injection'
    },
    {
      name: 'SQL_STACKED_QUERIES',
      regex: /;\s*(drop|delete|insert|update|create)\s+/gi,
      severity: SecuritySeverity.CRITICAL,
      description: 'SQL stacked queries'
    },
    
    // Path traversal patterns
    {
      name: 'PATH_TRAVERSAL',
      regex: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,
      severity: SecuritySeverity.HIGH,
      description: 'Path traversal attempt'
    },
    
    // Command injection patterns
    {
      name: 'COMMAND_INJECTION',
      regex: /[;&|`$(){}[\]]/,
      severity: SecuritySeverity.CRITICAL,
      description: 'Command injection attempt'
    },
    
    // LDAP injection patterns
    {
      name: 'LDAP_INJECTION',
      regex: /\*\)|\(\|\(/gi,
      severity: SecuritySeverity.HIGH,
      description: 'LDAP injection attempt'
    },
    
    // XML injection patterns
    {
      name: 'XML_INJECTION',
      regex: /<!entity|<!doctype|<\?xml/gi,
      severity: SecuritySeverity.HIGH,
      description: 'XML injection attempt'
    },
    
    // NoSQL injection patterns
    {
      name: 'NOSQL_INJECTION',
      regex: /\$where|\$ne|\$regex|\$gt|\$lt/gi,
      severity: SecuritySeverity.HIGH,
      description: 'NoSQL injection attempt'
    }
  ];

  private blockedUserAgents: RegExp[] = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
    /burpsuite/i,
    /w3af/i,
    /acunetix/i,
    /openvas/i,
    /zap/i
  ];

  private suspiciousHeaders: string[] = [
    'x-forwarded-for',
    'x-real-ip',
    'x-originating-ip',
    'x-remote-ip',
    'x-cluster-client-ip'
  ];

  private constructor() {
    this.startCleanupTask();
  }

  public static getInstance(): ThreatMonitor {
    if (!ThreatMonitor.instance) {
      ThreatMonitor.instance = new ThreatMonitor();
    }
    return ThreatMonitor.instance;
  }

  // Analyze incoming request for threats
  public analyzeRequest(req: Request): {
    threats: Array<{ type: string; severity: SecuritySeverity; details: string }>;
    riskScore: number;
    shouldBlock: boolean;
  } {
    const threats: Array<{ type: string; severity: SecuritySeverity; details: string }> = [];
    let riskScore = 0;
    const ip = this.getClientIP(req);

    // Check user agent
    const userAgent = req.get('user-agent') || '';
    this.checkUserAgent(userAgent, threats);

    // Check for malicious patterns in various parts of the request
    this.checkURL(req.originalUrl, threats);
    this.checkHeaders(req.headers, threats);
    this.checkQueryParameters(req.query, threats);
    
    if (req.body) {
      this.checkRequestBody(req.body, threats);
    }

    // Analyze IP behavior
    const ipAnalysis = this.analyzeIPBehavior(ip, req.path);
    if (ipAnalysis.threatLevel !== 'low') {
      threats.push({
        type: 'SUSPICIOUS_IP_BEHAVIOR',
        severity: this.mapThreatLevelToSeverity(ipAnalysis.threatLevel),
        details: `IP ${ip} showing ${ipAnalysis.threatLevel} threat level`
      });
    }

    // Calculate overall risk score
    riskScore = this.calculateRiskScore(threats, ipAnalysis);

    // Determine if request should be blocked
    const shouldBlock = this.shouldBlockRequest(threats, ipAnalysis, riskScore);

    // Log threats if any found
    if (threats.length > 0) {
      this.logThreats(threats, req, riskScore);
    }

    // Update metrics
    this.updateThreatMetrics(threats, riskScore);

    return {
      threats,
      riskScore,
      shouldBlock
    };
  }

  // Track failed login attempt
  public trackFailedLogin(ip: string, username: string, req?: Request): void {
    const ipData = this.getOrCreateIPData(ip);
    ipData.failedLogins++;
    ipData.lastFailedLogin = Date.now();

    // Check for brute force
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const recentFailures = ipData.requests.filter(r => 
      r.timestamp > Date.now() - timeWindow && r.suspicious
    ).length;

    if (recentFailures >= 5) {
      securityEventLogger.logBruteForceDetected(
        username,
        recentFailures,
        timeWindow,
        req
      );
      
      ipData.blocked = true;
      ipData.threatLevel = 'high';
    }
  }

  // Track successful login
  public trackSuccessfulLogin(ip: string, userId: string): void {
    const ipData = this.getOrCreateIPData(ip);
    ipData.failedLogins = 0; // Reset failed login count
    
    // Add successful login to requests
    ipData.requests.push({
      timestamp: Date.now(),
      endpoint: '/auth/login',
      suspicious: false
    });
  }

  // Get IP analysis
  public getIPAnalysis(ip: string): IPAnalysis {
    const ipData = this.ipTracker.get(ip);
    
    if (!ipData) {
      return {
        ip,
        requestCount: 0,
        lastSeen: 0,
        threatLevel: 'low',
        patterns: [],
        blocked: false
      };
    }

    const recentRequests = ipData.requests.filter(r => 
      r.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      ip,
      requestCount: recentRequests.length,
      lastSeen: Math.max(...ipData.requests.map(r => r.timestamp)),
      threatLevel: ipData.threatLevel as any,
      patterns: this.getDetectedPatterns(ip),
      blocked: ipData.blocked
    };
  }

  // Block/unblock IP
  public blockIP(ip: string, reason: string): void {
    const ipData = this.getOrCreateIPData(ip);
    ipData.blocked = true;
    ipData.threatLevel = 'critical';

    logger.warn('IP address blocked', { ip, reason });
    
    securityEventLogger.logEvent(
      SecurityEventType.FIREWALL_BLOCK,
      SecuritySeverity.HIGH,
      `IP ${ip} blocked: ${reason}`,
      undefined,
      { ip, reason }
    );
  }

  public unblockIP(ip: string): void {
    const ipData = this.ipTracker.get(ip);
    if (ipData) {
      ipData.blocked = false;
      ipData.threatLevel = 'low';
      ipData.failedLogins = 0;
    }

    logger.info('IP address unblocked', { ip });
  }

  // Get threat statistics
  public getThreatStatistics(timeRange: number = 24 * 60 * 60 * 1000): {
    totalThreats: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topThreateningIPs: Array<{ ip: string; threatLevel: string; requestCount: number }>;
    blockedIPs: string[];
  } {
    const cutoffTime = Date.now() - timeRange;
    const stats = {
      totalThreats: 0,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      topThreateningIPs: [] as Array<{ ip: string; threatLevel: string; requestCount: number }>,
      blockedIPs: [] as string[]
    };

    // Analyze IP data
    for (const [ip, data] of this.ipTracker) {
      const recentRequests = data.requests.filter(r => r.timestamp >= cutoffTime);
      
      if (data.blocked) {
        stats.blockedIPs.push(ip);
      }

      if (data.threatLevel !== 'low' && recentRequests.length > 0) {
        stats.topThreateningIPs.push({
          ip,
          threatLevel: data.threatLevel,
          requestCount: recentRequests.length
        });
      }
    }

    // Sort threatening IPs by request count
    stats.topThreateningIPs.sort((a, b) => b.requestCount - a.requestCount);
    stats.topThreateningIPs = stats.topThreateningIPs.slice(0, 10);

    return stats;
  }

  // Private methods
  private checkUserAgent(userAgent: string, threats: Array<{ type: string; severity: SecuritySeverity; details: string }>): void {
    for (const pattern of this.blockedUserAgents) {
      if (pattern.test(userAgent)) {
        threats.push({
          type: 'MALICIOUS_USER_AGENT',
          severity: SecuritySeverity.HIGH,
          details: `Suspicious user agent detected: ${userAgent.substring(0, 100)}`
        });
        break;
      }
    }

    // Check for common attack tools
    if (userAgent.length === 0 || userAgent === '-') {
      threats.push({
        type: 'MISSING_USER_AGENT',
        severity: SecuritySeverity.MEDIUM,
        details: 'Request missing user agent'
      });
    }
  }

  private checkURL(url: string, threats: Array<{ type: string; severity: SecuritySeverity; details: string }>): void {
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.regex.test(url)) {
        threats.push({
          type: pattern.name,
          severity: pattern.severity,
          details: `${pattern.description} in URL: ${url.substring(0, 200)}`
        });
      }
    }
  }

  private checkHeaders(headers: any, threats: Array<{ type: string; severity: SecuritySeverity; details: string }>): void {
    // Check for header injection
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.regex.test(value)) {
            threats.push({
              type: pattern.name,
              severity: pattern.severity,
              details: `${pattern.description} in header ${key}: ${value.substring(0, 200)}`
            });
          }
        }
      }
    }

    // Check for suspicious proxy headers
    for (const header of this.suspiciousHeaders) {
      if (headers[header]) {
        const value = headers[header];
        if (typeof value === 'string' && (value.includes(',') || value.split('.').length !== 4)) {
          threats.push({
            type: 'SUSPICIOUS_PROXY_HEADER',
            severity: SecuritySeverity.MEDIUM,
            details: `Suspicious proxy header ${header}: ${value}`
          });
        }
      }
    }
  }

  private checkQueryParameters(query: any, threats: Array<{ type: string; severity: SecuritySeverity; details: string }>): void {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.regex.test(value)) {
            threats.push({
              type: pattern.name,
              severity: pattern.severity,
              details: `${pattern.description} in query parameter ${key}: ${value.substring(0, 200)}`
            });
          }
        }
      }
    }
  }

  private checkRequestBody(body: any, threats: Array<{ type: string; severity: SecuritySeverity; details: string }>): void {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.regex.test(bodyString)) {
        threats.push({
          type: pattern.name,
          severity: pattern.severity,
          details: `${pattern.description} in request body`
        });
      }
    }
  }

  private analyzeIPBehavior(ip: string, endpoint: string): IPAnalysis {
    const ipData = this.getOrCreateIPData(ip);
    
    // Add current request
    ipData.requests.push({
      timestamp: Date.now(),
      endpoint,
      suspicious: false // Will be updated based on threat analysis
    });

    // Clean old requests (keep last 24 hours)
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    ipData.requests = ipData.requests.filter(r => r.timestamp >= cutoffTime);

    // Analyze request patterns
    const recentRequests = ipData.requests.filter(r => r.timestamp > Date.now() - 60 * 60 * 1000); // Last hour
    const requestRate = recentRequests.length;

    // Update threat level based on behavior
    if (requestRate > 1000) {
      ipData.threatLevel = 'critical';
    } else if (requestRate > 500 || ipData.failedLogins > 10) {
      ipData.threatLevel = 'high';
    } else if (requestRate > 100 || ipData.failedLogins > 3) {
      ipData.threatLevel = 'medium';
    } else {
      ipData.threatLevel = 'low';
    }

    return {
      ip,
      requestCount: ipData.requests.length,
      lastSeen: Date.now(),
      threatLevel: ipData.threatLevel as any,
      patterns: [],
      blocked: ipData.blocked
    };
  }

  private getOrCreateIPData(ip: string) {
    if (!this.ipTracker.has(ip)) {
      this.ipTracker.set(ip, {
        requests: [],
        failedLogins: 0,
        lastFailedLogin: 0,
        blocked: false,
        threatLevel: 'low'
      });
    }
    return this.ipTracker.get(ip)!;
  }

  private getClientIP(req: Request): string {
    return req.ip || 
           req.socket.remoteAddress || 
           (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           (req.headers['x-real-ip'] as string) ||
           'unknown';
  }

  private calculateRiskScore(threats: Array<{ type: string; severity: SecuritySeverity; details: string }>, ipAnalysis: IPAnalysis): number {
    let score = 0;

    // Base score from threats
    for (const threat of threats) {
      switch (threat.severity) {
        case SecuritySeverity.LOW:
          score += 10;
          break;
        case SecuritySeverity.MEDIUM:
          score += 25;
          break;
        case SecuritySeverity.HIGH:
          score += 50;
          break;
        case SecuritySeverity.CRITICAL:
          score += 80;
          break;
      }
    }

    // Add IP threat level
    switch (ipAnalysis.threatLevel) {
      case 'medium':
        score += 20;
        break;
      case 'high':
        score += 40;
        break;
      case 'critical':
        score += 60;
        break;
    }

    return Math.min(100, score);
  }

  private shouldBlockRequest(
    threats: Array<{ type: string; severity: SecuritySeverity; details: string }>,
    ipAnalysis: IPAnalysis,
    riskScore: number
  ): boolean {
    // Block if IP is already blocked
    if (ipAnalysis.blocked) {
      return true;
    }

    // Block on critical threats
    if (threats.some(t => t.severity === SecuritySeverity.CRITICAL)) {
      return true;
    }

    // Block on high risk score
    if (riskScore >= 80) {
      return true;
    }

    // Block on multiple high severity threats
    const highSeverityThreats = threats.filter(t => t.severity === SecuritySeverity.HIGH);
    if (highSeverityThreats.length >= 2) {
      return true;
    }

    return false;
  }

  private mapThreatLevelToSeverity(threatLevel: string): SecuritySeverity {
    switch (threatLevel) {
      case 'critical':
        return SecuritySeverity.CRITICAL;
      case 'high':
        return SecuritySeverity.HIGH;
      case 'medium':
        return SecuritySeverity.MEDIUM;
      default:
        return SecuritySeverity.LOW;
    }
  }

  private logThreats(
    threats: Array<{ type: string; severity: SecuritySeverity; details: string }>,
    req: Request,
    riskScore: number
  ): void {
    const ip = this.getClientIP(req);
    
    for (const threat of threats) {
      securityEventLogger.logMaliciousRequest(
        threat.type,
        threat.details,
        req
      );
    }

    // Log summary for multiple threats
    if (threats.length > 1) {
      securityEventLogger.logSuspiciousActivity(
        `Multiple threats detected from ${ip}`,
        threats.map(t => t.type),
        req
      );
    }
  }

  private updateThreatMetrics(
    threats: Array<{ type: string; severity: SecuritySeverity; details: string }>,
    riskScore: number
  ): void {
    metricsCollector.incrementCounter('threat_requests_total', {
      threat_count: threats.length.toString()
    });

    if (threats.length > 0) {
      metricsCollector.observeHistogram('threat_risk_score', riskScore);
      
      for (const threat of threats) {
        metricsCollector.incrementCounter('threats_detected_total', {
          type: threat.type,
          severity: threat.severity
        });
      }
    }
  }

  private getDetectedPatterns(ip: string): string[] {
    // Implementation would track patterns detected for this IP
    return [];
  }

  private startCleanupTask(): void {
    // Clean up old IP data every hour
    setInterval(() => {
      const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      
      for (const [ip, data] of this.ipTracker) {
        const recentRequests = data.requests.filter(r => r.timestamp >= cutoffTime);
        
        if (recentRequests.length === 0 && !data.blocked) {
          this.ipTracker.delete(ip);
        } else {
          data.requests = recentRequests;
        }
      }
      
      logger.debug('Threat monitor cleanup completed', {
        activeIPs: this.ipTracker.size
      });
    }, 60 * 60 * 1000); // Every hour
  }
}

// Export singleton instance
export const threatMonitor = ThreatMonitor.getInstance();