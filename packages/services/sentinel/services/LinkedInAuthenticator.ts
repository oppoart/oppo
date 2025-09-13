/**
 * LinkedIn Authentication Service
 * Handles all LinkedIn authentication logic including cookies, credentials, and security challenges
 */

import { Page, BrowserContext } from 'playwright';
import { AuthenticationStatus, SecurityChallenge, SessionInfo } from '../types/linkedin.types';
import { LINKEDIN_SELECTORS, LINKEDIN_URLS, LINKEDIN_TIMING, LINKEDIN_ENV } from '../config/linkedin.config';

/**
 * Authentication credentials
 */
export interface LinkedInCredentials {
  email?: string;
  password?: string;
  sessionCookies?: string;
}

/**
 * Authentication options
 */
export interface AuthenticationOptions {
  preferredMethod: 'cookies' | 'credentials' | 'auto';
  skipSecurityChecks: boolean;
  maxRetryAttempts: number;
  timeout: number;
}

/**
 * LinkedIn authentication service
 */
export class LinkedInAuthenticator {
  private credentials: LinkedInCredentials;
  private options: AuthenticationOptions;
  private currentSession: SessionInfo | null = null;

  constructor(
    credentials: LinkedInCredentials = {},
    options: Partial<AuthenticationOptions> = {}
  ) {
    this.credentials = {
      email: credentials.email || process.env[LINKEDIN_ENV.email],
      password: credentials.password || process.env[LINKEDIN_ENV.password],
      sessionCookies: credentials.sessionCookies || process.env[LINKEDIN_ENV.cookies],
      ...credentials
    };

    this.options = {
      preferredMethod: 'auto',
      skipSecurityChecks: false,
      maxRetryAttempts: 3,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Main authentication method
   */
  async authenticate(page: Page, context: BrowserContext): Promise<AuthenticationStatus> {
    console.log('Starting LinkedIn authentication...');
    
    const startTime = Date.now();
    let authStatus: AuthenticationStatus = {
      isAuthenticated: false,
      method: 'none',
      lastChecked: new Date()
    };

    try {
      // Determine authentication method
      const method = this.determineAuthMethod();
      console.log(`Using authentication method: ${method}`);

      switch (method) {
        case 'cookies':
          authStatus = await this.authenticateWithCookies(page, context);
          break;
        case 'credentials':
          authStatus = await this.authenticateWithCredentials(page);
          break;
        default:
          console.warn('No authentication method available, proceeding with limited access');
          authStatus.method = 'none';
      }

      // Verify authentication
      if (authStatus.isAuthenticated) {
        const isValid = await this.verifyAuthentication(page);
        if (!isValid) {
          authStatus.isAuthenticated = false;
          authStatus.error = 'Authentication verification failed';
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Authentication completed in ${duration}ms. Status: ${authStatus.isAuthenticated ? 'SUCCESS' : 'FAILED'}`);

      return authStatus;

    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        isAuthenticated: false,
        method: 'none',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Authenticate using session cookies
   */
  private async authenticateWithCookies(page: Page, context: BrowserContext): Promise<AuthenticationStatus> {
    if (!this.credentials.sessionCookies) {
      throw new Error('No session cookies provided');
    }

    try {
      console.log('Authenticating with session cookies...');
      
      // Parse and add cookies
      const cookies = JSON.parse(this.credentials.sessionCookies);
      await context.addCookies(cookies);
      
      // Navigate to LinkedIn feed to test cookies
      await page.goto(LINKEDIN_URLS.feed, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout
      });
      
      await this.delay(LINKEDIN_TIMING.authDelay);
      
      // Check if cookies are valid
      const isLoggedIn = await this.checkIfLoggedIn(page);
      
      if (isLoggedIn) {
        console.log('Successfully authenticated with session cookies');
        this.updateSession('cookies', cookies);
        
        return {
          isAuthenticated: true,
          method: 'cookies',
          lastChecked: new Date()
        };
      } else {
        throw new Error('Session cookies are invalid or expired');
      }

    } catch (error) {
      console.error('Cookie authentication failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate using email and password
   */
  private async authenticateWithCredentials(page: Page): Promise<AuthenticationStatus> {
    if (!this.credentials.email || !this.credentials.password) {
      throw new Error('Email and password are required for credential authentication');
    }

    try {
      console.log('Authenticating with email and password...');
      
      // Navigate to login page
      await page.goto(LINKEDIN_URLS.login, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout
      });

      // Wait for login form
      await page.waitForSelector(LINKEDIN_SELECTORS.login.usernameField, { 
        timeout: this.options.timeout 
      });

      // Fill login form
      await page.fill(LINKEDIN_SELECTORS.login.usernameField, this.credentials.email);
      await this.delay(LINKEDIN_TIMING.clickDelay);
      
      await page.fill(LINKEDIN_SELECTORS.login.passwordField, this.credentials.password);
      await this.delay(LINKEDIN_TIMING.clickDelay);
      
      // Submit form
      await page.click(LINKEDIN_SELECTORS.login.submitButton);
      
      // Wait for navigation
      await page.waitForNavigation({ 
        waitUntil: 'networkidle', 
        timeout: LINKEDIN_TIMING.navigationTimeout 
      });
      
      // Handle potential security challenges
      if (!this.options.skipSecurityChecks) {
        const securityChallenge = await this.handleSecurityChallenge(page);
        if (securityChallenge.detected && securityChallenge.requiresManualIntervention) {
          console.warn('Security challenge requires manual intervention');
          await this.delay(LINKEDIN_TIMING.securityCheckDelay);
        }
      }
      
      // Verify login success
      const isLoggedIn = await this.checkIfLoggedIn(page);
      
      if (isLoggedIn) {
        console.log('Successfully authenticated with credentials');
        
        // Extract session cookies for future use
        const cookies = await page.context().cookies();
        this.updateSession('credentials', cookies);
        
        return {
          isAuthenticated: true,
          method: 'credentials',
          lastChecked: new Date()
        };
      } else {
        throw new Error('Login failed - invalid credentials or security challenge');
      }

    } catch (error) {
      console.error('Credential authentication failed:', error);
      throw error;
    }
  }

  /**
   * Check if currently logged in to LinkedIn
   */
  async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // Look for profile icon or feed elements that indicate logged-in state
      const profileIcon = await page.$(LINKEDIN_SELECTORS.login.profileIcon);
      const feedContainer = await page.$(LINKEDIN_SELECTORS.login.feedContainer);
      
      return profileIcon !== null || feedContainer !== null;
    } catch (error) {
      console.warn('Error checking login status:', error);
      return false;
    }
  }

  /**
   * Handle LinkedIn security challenges
   */
  async handleSecurityChallenge(page: Page): Promise<SecurityChallenge> {
    const challenge: SecurityChallenge = {
      detected: false,
      type: 'suspicious_activity',
      message: '',
      timestamp: new Date(),
      requiresManualIntervention: false
    };

    try {
      // Check for security challenge text
      const challengeElement = await page.$(LINKEDIN_SELECTORS.security.challengeText);
      
      if (challengeElement) {
        challenge.detected = true;
        challenge.message = 'LinkedIn security challenge detected';
        challenge.requiresManualIntervention = true;
        challenge.type = 'verification';
        
        console.log('LinkedIn security challenge detected - manual intervention may be required');
        await this.delay(LINKEDIN_TIMING.securityCheckDelay);
      }

      // Check for CAPTCHA or other challenges
      const captchaElement = await page.$('[data-test-id="captcha"]');
      if (captchaElement) {
        challenge.detected = true;
        challenge.message = 'CAPTCHA challenge detected';
        challenge.requiresManualIntervention = true;
        challenge.type = 'captcha';
      }

      // Look for skip buttons or other interactive elements
      const skipButton = await page.$(LINKEDIN_SELECTORS.security.skipButton);
      if (skipButton && !challenge.detected) {
        await skipButton.click();
        await this.delay(LINKEDIN_TIMING.clickDelay);
        console.log('Skipped onboarding prompt');
      }

      // Check for rate limiting indicators
      const rateLimitText = await page.$('text="You\'ve performed too many actions"');
      if (rateLimitText) {
        challenge.detected = true;
        challenge.message = 'Rate limit detected';
        challenge.type = 'rate_limit';
        challenge.requiresManualIntervention = false;
      }

    } catch (error) {
      console.warn('Error handling security challenge:', error);
      challenge.message = `Error handling security challenge: ${error}`;
    }

    return challenge;
  }

  /**
   * Verify authentication status
   */
  async verifyAuthentication(page: Page): Promise<boolean> {
    try {
      // Navigate to feed and check if we can access it
      const response = await page.goto(LINKEDIN_URLS.feed, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      if (!response?.ok()) {
        return false;
      }

      // Additional verification by checking for authenticated elements
      return await this.checkIfLoggedIn(page);

    } catch (error) {
      console.warn('Authentication verification failed:', error);
      return false;
    }
  }

  /**
   * Refresh authentication if needed
   */
  async refreshAuthentication(page: Page, context: BrowserContext): Promise<AuthenticationStatus> {
    const currentStatus = await this.verifyAuthentication(page);
    
    if (currentStatus) {
      return {
        isAuthenticated: true,
        method: this.currentSession?.cookies ? 'cookies' : 'credentials',
        lastChecked: new Date()
      };
    }

    // Re-authenticate if current session is invalid
    console.log('Current session invalid, re-authenticating...');
    return await this.authenticate(page, context);
  }

  /**
   * Get current session information
   */
  getSessionInfo(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Update session information
   */
  private updateSession(method: 'cookies' | 'credentials', cookies: any[]): void {
    this.currentSession = {
      sessionId: this.generateSessionId(),
      createdAt: new Date(),
      lastActivity: new Date(),
      isValid: true,
      cookies: JSON.stringify(cookies)
    };
  }

  /**
   * Determine the best authentication method based on available credentials
   */
  private determineAuthMethod(): 'cookies' | 'credentials' | 'none' {
    if (this.options.preferredMethod === 'cookies' && this.credentials.sessionCookies) {
      return 'cookies';
    }
    
    if (this.options.preferredMethod === 'credentials' && this.credentials.email && this.credentials.password) {
      return 'credentials';
    }
    
    // Auto mode: prefer cookies, fallback to credentials
    if (this.credentials.sessionCookies) {
      return 'cookies';
    }
    
    if (this.credentials.email && this.credentials.password) {
      return 'credentials';
    }
    
    return 'none';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `linkedin_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null;
  }

  /**
   * Export current cookies for persistence
   */
  async exportCookies(page: Page): Promise<string> {
    try {
      const cookies = await page.context().cookies();
      return JSON.stringify(cookies);
    } catch (error) {
      console.error('Failed to export cookies:', error);
      throw error;
    }
  }
}