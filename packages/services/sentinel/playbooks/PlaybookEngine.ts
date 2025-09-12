import { Page, Browser } from 'playwright';
import { OpportunityData } from '../../../../apps/backend/src/types/discovery';

/**
 * Playbook action types
 */
export type PlaybookActionType =
  | 'navigate'
  | 'wait'
  | 'click'
  | 'fill'
  | 'select'
  | 'extract'
  | 'scroll'
  | 'screenshot'
  | 'evaluate'
  | 'conditional'
  | 'loop'
  | 'retry';

/**
 * Base playbook action interface
 */
export interface PlaybookAction {
  id: string;
  type: PlaybookActionType;
  description: string;
  selector?: string;
  value?: string | number | boolean;
  timeout?: number;
  retries?: number;
  conditions?: PlaybookCondition[];
  actions?: PlaybookAction[]; // For conditional and loop actions
  variables?: Record<string, any>;
  optional?: boolean; // If true, action failure won't stop execution
}

/**
 * Playbook condition for conditional actions
 */
export interface PlaybookCondition {
  type: 'exists' | 'not_exists' | 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'visible' | 'hidden';
  selector?: string;
  value?: string | number | boolean;
  variable?: string;
}

/**
 * Complete playbook definition
 */
export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  variables: Record<string, any>;
  actions: PlaybookAction[];
  extractionRules: ExtractionRule[];
  errorHandling: ErrorHandlingConfig;
  metadata: PlaybookMetadata;
}

/**
 * Data extraction rules
 */
export interface ExtractionRule {
  field: keyof OpportunityData | string;
  selector: string;
  attribute?: string; // 'textContent', 'href', 'src', etc.
  transform?: string; // JavaScript function to transform extracted data
  required: boolean;
  defaultValue?: any;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  continueOnError: boolean;
  maxRetries: number;
  retryDelay: number;
  screenshotOnError: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Playbook metadata
 */
export interface PlaybookMetadata {
  targetSite: string;
  estimatedDuration: number; // in seconds
  complexity: 'simple' | 'medium' | 'complex';
  lastTested: Date;
  successRate: number; // percentage
  usesBrowser: boolean;
  requiresAuth: boolean;
}

/**
 * Playbook execution context
 */
export interface PlaybookContext {
  variables: Record<string, any>;
  extractedData: Record<string, any>;
  errors: string[];
  warnings: string[];
  screenshots: string[];
  executionTime: number;
  actionsExecuted: number;
  actionResults: ActionResult[];
}

/**
 * Action execution result
 */
export interface ActionResult {
  actionId: string;
  success: boolean;
  duration: number;
  error?: string;
  extractedData?: any;
  screenshot?: string;
}

/**
 * Playbook execution result
 */
export interface PlaybookExecutionResult {
  success: boolean;
  opportunities: OpportunityData[];
  context: PlaybookContext;
  executionTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Playbook Engine for executing JSON-defined scraping workflows
 */
export class PlaybookEngine {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private context: PlaybookContext;
  private playbook: PlaybookDefinition | null = null;

  constructor() {
    this.context = this.createEmptyContext();
  }

  /**
   * Execute a playbook
   */
  async execute(
    playbook: PlaybookDefinition,
    browser: Browser,
    initialVariables: Record<string, any> = {}
  ): Promise<PlaybookExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing playbook: ${playbook.name} (${playbook.id})`);
      
      this.browser = browser;
      this.playbook = playbook;
      this.context = this.createEmptyContext();
      
      // Merge initial variables with playbook variables
      this.context.variables = {
        ...playbook.variables,
        ...initialVariables
      };

      // Create new page
      this.page = await browser.newPage();
      
      // Execute all actions
      for (const action of playbook.actions) {
        try {
          await this.executeAction(action);
          this.context.actionsExecuted++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.context.errors.push(`Action ${action.id} failed: ${errorMessage}`);
          
          if (!playbook.errorHandling.continueOnError && !action.optional) {
            throw error;
          }
        }
      }

      // Extract opportunities using extraction rules
      const opportunities = await this.extractOpportunities();

      this.context.executionTime = Date.now() - startTime;
      
      const result: PlaybookExecutionResult = {
        success: this.context.errors.length === 0,
        opportunities,
        context: this.context,
        executionTime: this.context.executionTime,
        errors: this.context.errors,
        warnings: this.context.warnings
      };

      console.log(`Playbook execution completed: ${opportunities.length} opportunities extracted`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.errors.push(`Playbook execution failed: ${errorMessage}`);
      this.context.executionTime = Date.now() - startTime;

      return {
        success: false,
        opportunities: [],
        context: this.context,
        executionTime: this.context.executionTime,
        errors: this.context.errors,
        warnings: this.context.warnings
      };
    } finally {
      // Cleanup
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: PlaybookAction): Promise<ActionResult> {
    const startTime = Date.now();
    const result: ActionResult = {
      actionId: action.id,
      success: false,
      duration: 0
    };

    try {
      console.log(`Executing action: ${action.type} - ${action.description}`);

      // Check conditions if present
      if (action.conditions && !await this.evaluateConditions(action.conditions)) {
        console.log(`Skipping action ${action.id} - conditions not met`);
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Replace variables in action values
      const processedAction = this.processVariables(action);

      // Execute action based on type
      switch (action.type) {
        case 'navigate':
          await this.executeNavigate(processedAction);
          break;
        case 'wait':
          await this.executeWait(processedAction);
          break;
        case 'click':
          await this.executeClick(processedAction);
          break;
        case 'fill':
          await this.executeFill(processedAction);
          break;
        case 'select':
          await this.executeSelect(processedAction);
          break;
        case 'extract':
          result.extractedData = await this.executeExtract(processedAction);
          break;
        case 'scroll':
          await this.executeScroll(processedAction);
          break;
        case 'screenshot':
          result.screenshot = await this.executeScreenshot(processedAction);
          break;
        case 'evaluate':
          result.extractedData = await this.executeEvaluate(processedAction);
          break;
        case 'conditional':
          await this.executeConditional(processedAction);
          break;
        case 'loop':
          await this.executeLoop(processedAction);
          break;
        case 'retry':
          await this.executeRetry(processedAction);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      result.success = true;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      
      // Take screenshot on error if configured
      if (this.playbook?.errorHandling.screenshotOnError) {
        try {
          result.screenshot = await this.takeScreenshot(`error_${action.id}`);
        } catch (screenshotError) {
          console.warn('Failed to take error screenshot:', screenshotError);
        }
      }

      // Retry logic
      const retries = action.retries || this.playbook?.errorHandling.maxRetries || 0;
      if (retries > 0) {
        console.log(`Retrying action ${action.id} (${retries} attempts remaining)`);
        const retryDelay = this.playbook?.errorHandling.retryDelay || 1000;
        await this.delay(retryDelay);
        
        const retryAction = { ...action, retries: retries - 1 };
        return await this.executeAction(retryAction);
      }

      throw error;
    }

    result.duration = Date.now() - startTime;
    this.context.actionResults.push(result);
    return result;
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: PlaybookAction): Promise<void> {
    if (!this.page || !action.value) {
      throw new Error('Page or URL not provided for navigate action');
    }

    const url = String(action.value);
    const timeout = action.timeout || 30000;

    await this.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout 
    });

    // Store current URL in context
    this.context.variables.currentUrl = this.page.url();
  }

  /**
   * Execute wait action
   */
  private async executeWait(action: PlaybookAction): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available for wait action');
    }

    if (action.selector) {
      // Wait for selector
      const timeout = action.timeout || 10000;
      await this.page.waitForSelector(action.selector, { timeout });
    } else if (action.value) {
      // Wait for specified time
      const waitTime = Number(action.value);
      await this.delay(waitTime);
    } else {
      throw new Error('Wait action requires either selector or time value');
    }
  }

  /**
   * Execute click action
   */
  private async executeClick(action: PlaybookAction): Promise<void> {
    if (!this.page || !action.selector) {
      throw new Error('Page or selector not provided for click action');
    }

    const timeout = action.timeout || 10000;
    await this.page.waitForSelector(action.selector, { timeout });
    await this.page.click(action.selector);
  }

  /**
   * Execute fill action
   */
  private async executeFill(action: PlaybookAction): Promise<void> {
    if (!this.page || !action.selector || action.value === undefined) {
      throw new Error('Page, selector, or value not provided for fill action');
    }

    const timeout = action.timeout || 10000;
    await this.page.waitForSelector(action.selector, { timeout });
    await this.page.fill(action.selector, String(action.value));
  }

  /**
   * Execute select action
   */
  private async executeSelect(action: PlaybookAction): Promise<void> {
    if (!this.page || !action.selector || action.value === undefined) {
      throw new Error('Page, selector, or value not provided for select action');
    }

    const timeout = action.timeout || 10000;
    await this.page.waitForSelector(action.selector, { timeout });
    await this.page.selectOption(action.selector, String(action.value));
  }

  /**
   * Execute extract action
   */
  private async executeExtract(action: PlaybookAction): Promise<any> {
    if (!this.page || !action.selector) {
      throw new Error('Page or selector not provided for extract action');
    }

    const timeout = action.timeout || 10000;
    
    try {
      await this.page.waitForSelector(action.selector, { timeout });
    } catch (error) {
      if (action.optional) {
        return null;
      }
      throw error;
    }

    // Extract data using the selector
    const extractedData = await this.page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      const results: any[] = [];

      elements.forEach(element => {
        const data: any = {
          textContent: element.textContent?.trim(),
          innerHTML: element.innerHTML,
          attributes: {}
        };

        // Extract all attributes
        if (element.attributes) {
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            data.attributes[attr.name] = attr.value;
          }
        }

        results.push(data);
      });

      return results.length === 1 ? results[0] : results;
    }, action.selector);

    // Store extracted data in context
    if (action.variables) {
      for (const [key, path] of Object.entries(action.variables)) {
        this.context.extractedData[key] = this.getValueByPath(extractedData, String(path));
      }
    }

    return extractedData;
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(action: PlaybookAction): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available for scroll action');
    }

    if (action.selector) {
      // Scroll to element
      await this.page.scrollIntoViewIfNeeded(action.selector);
    } else {
      // Scroll by amount or to position
      const scrollValue = Number(action.value) || 0;
      await this.page.evaluate((value) => {
        if (value > 0) {
          window.scrollBy(0, value);
        } else {
          window.scrollTo(0, Math.abs(value));
        }
      }, scrollValue);
    }
  }

  /**
   * Execute screenshot action
   */
  private async executeScreenshot(action: PlaybookAction): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available for screenshot action');
    }

    const filename = String(action.value) || `screenshot_${Date.now()}`;
    const screenshotPath = await this.takeScreenshot(filename);
    
    this.context.screenshots.push(screenshotPath);
    return screenshotPath;
  }

  /**
   * Execute evaluate action (run custom JavaScript)
   */
  private async executeEvaluate(action: PlaybookAction): Promise<any> {
    if (!this.page || !action.value) {
      throw new Error('Page or JavaScript code not provided for evaluate action');
    }

    const jsCode = String(action.value);
    const result = await this.page.evaluate((code) => {
      // Create a function from the code and execute it
      const func = new Function('return ' + code);
      return func();
    }, jsCode);

    // Store result in context variables if specified
    if (action.variables) {
      for (const [key, path] of Object.entries(action.variables)) {
        this.context.variables[key] = this.getValueByPath(result, String(path));
      }
    }

    return result;
  }

  /**
   * Execute conditional action
   */
  private async executeConditional(action: PlaybookAction): Promise<void> {
    if (!action.conditions || !action.actions) {
      throw new Error('Conditional action requires conditions and actions');
    }

    const conditionsMet = await this.evaluateConditions(action.conditions);
    
    if (conditionsMet) {
      console.log(`Conditions met for action ${action.id}, executing sub-actions`);
      for (const subAction of action.actions) {
        await this.executeAction(subAction);
      }
    } else {
      console.log(`Conditions not met for action ${action.id}, skipping sub-actions`);
    }
  }

  /**
   * Execute loop action
   */
  private async executeLoop(action: PlaybookAction): Promise<void> {
    if (!action.actions) {
      throw new Error('Loop action requires actions to execute');
    }

    const maxIterations = Number(action.value) || 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      console.log(`Loop iteration ${iteration + 1}/${maxIterations}`);
      
      // Check exit conditions if present
      if (action.conditions && !await this.evaluateConditions(action.conditions)) {
        console.log('Loop exit conditions met, breaking');
        break;
      }

      // Execute loop actions
      for (const subAction of action.actions) {
        await this.executeAction(subAction);
      }

      iteration++;
    }
  }

  /**
   * Execute retry action
   */
  private async executeRetry(action: PlaybookAction): Promise<void> {
    if (!action.actions) {
      throw new Error('Retry action requires actions to execute');
    }

    const maxRetries = Number(action.value) || 3;
    const retryDelay = action.timeout || 1000;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries}`);
        
        for (const subAction of action.actions) {
          await this.executeAction(subAction);
        }
        
        // Success - exit retry loop
        return;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        
        if (attempt < maxRetries) {
          console.log(`Attempt failed, retrying in ${retryDelay}ms...`);
          await this.delay(retryDelay);
        }
      }
    }

    // All retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Evaluate conditions
   */
  private async evaluateConditions(conditions: PlaybookCondition[]): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition);
      if (!result) {
        return false; // All conditions must be true
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: PlaybookCondition): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      switch (condition.type) {
        case 'exists':
          if (!condition.selector) return false;
          const existsElement = await this.page.$(condition.selector);
          return existsElement !== null;

        case 'not_exists':
          if (!condition.selector) return false;
          const notExistsElement = await this.page.$(condition.selector);
          return notExistsElement === null;

        case 'visible':
          if (!condition.selector) return false;
          return await this.page.isVisible(condition.selector);

        case 'hidden':
          if (!condition.selector) return false;
          return await this.page.isHidden(condition.selector);

        case 'contains':
          if (!condition.selector) return false;
          const containsText = await this.page.textContent(condition.selector);
          return containsText ? containsText.includes(String(condition.value)) : false;

        case 'not_contains':
          if (!condition.selector) return false;
          const notContainsText = await this.page.textContent(condition.selector);
          return notContainsText ? !notContainsText.includes(String(condition.value)) : true;

        case 'equals':
          if (condition.variable) {
            const variableValue = this.context.variables[condition.variable];
            return variableValue === condition.value;
          } else if (condition.selector) {
            const elementValue = await this.page.textContent(condition.selector);
            return elementValue?.trim() === String(condition.value);
          }
          return false;

        case 'not_equals':
          if (condition.variable) {
            const variableValue = this.context.variables[condition.variable];
            return variableValue !== condition.value;
          } else if (condition.selector) {
            const elementValue = await this.page.textContent(condition.selector);
            return elementValue?.trim() !== String(condition.value);
          }
          return false;

        default:
          console.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      console.warn(`Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Process variables in action values
   */
  private processVariables(action: PlaybookAction): PlaybookAction {
    const processedAction = { ...action };

    // Replace variables in string values
    if (typeof action.value === 'string') {
      processedAction.value = this.replaceVariables(action.value);
    }

    if (action.selector) {
      processedAction.selector = this.replaceVariables(action.selector);
    }

    return processedAction;
  }

  /**
   * Replace variables in text with format ${variableName}
   */
  private replaceVariables(text: string): string {
    return text.replace(/\${(\w+)}/g, (match, variableName) => {
      const value = this.context.variables[variableName];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Extract opportunities using playbook extraction rules
   */
  private async extractOpportunities(): Promise<OpportunityData[]> {
    if (!this.page || !this.playbook) {
      return [];
    }

    const opportunities: OpportunityData[] = [];

    try {
      // Apply each extraction rule
      for (const rule of this.playbook.extractionRules) {
        try {
          const extractedData = await this.page.evaluate((selector, attribute) => {
            const elements = document.querySelectorAll(selector);
            const results: any[] = [];

            elements.forEach(element => {
              let value: any;

              if (attribute === 'textContent') {
                value = element.textContent?.trim();
              } else if (attribute === 'innerHTML') {
                value = element.innerHTML;
              } else if (attribute && element.hasAttribute(attribute)) {
                value = element.getAttribute(attribute);
              } else {
                value = element.textContent?.trim();
              }

              if (value) {
                results.push(value);
              }
            });

            return results;
          }, rule.selector, rule.attribute);

          // Store extracted data
          this.context.extractedData[rule.field] = extractedData;

        } catch (error) {
          if (rule.required) {
            throw new Error(`Required field extraction failed: ${rule.field}`);
          } else {
            console.warn(`Optional field extraction failed: ${rule.field}`, error);
            this.context.extractedData[rule.field] = rule.defaultValue;
          }
        }
      }

      // Build opportunities from extracted data
      opportunities.push(...this.buildOpportunitiesFromExtractedData());

    } catch (error) {
      console.error('Error during opportunity extraction:', error);
      this.context.errors.push(`Opportunity extraction failed: ${error}`);
    }

    return opportunities;
  }

  /**
   * Build opportunities from extracted data
   */
  private buildOpportunitiesFromExtractedData(): OpportunityData[] {
    const opportunities: OpportunityData[] = [];
    const extractedData = this.context.extractedData;

    // Handle multiple opportunities (arrays of data)
    const maxLength = Math.max(
      ..Object.values(extractedData)
        .filter(value => Array.isArray(value))
        .map(arr => (arr as any[]).length)
    );

    if (maxLength === 0) {
      // Single opportunity
      const opportunity = this.buildSingleOpportunity(extractedData);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    } else {
      // Multiple opportunities
      for (let i = 0; i < maxLength; i++) {
        const opportunityData: Record<string, any> = {};
        
        for (const [field, value] of Object.entries(extractedData)) {
          if (Array.isArray(value)) {
            opportunityData[field] = value[i];
          } else {
            opportunityData[field] = value;
          }
        }

        const opportunity = this.buildSingleOpportunity(opportunityData);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }

    return opportunities;
  }

  /**
   * Build a single opportunity from extracted data
   */
  private buildSingleOpportunity(data: Record<string, any>): OpportunityData | null {
    try {
      // Ensure required fields are present
      if (!data.title || !data.url) {
        console.warn('Skipping opportunity due to missing required fields');
        return null;
      }

      const opportunity: OpportunityData = {
        title: String(data.title),
        description: String(data.description || ''),
        url: String(data.url),
        organization: String(data.organization || ''),
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        location: String(data.location || ''),
        amount: String(data.amount || ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        sourceType: 'websearch',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        sourceMetadata: {
          playbookId: this.playbook?.id,
          playbookName: this.playbook?.name,
          extractedAt: new Date().toISOString(),
          sourceUrl: this.context.variables.currentUrl
        }
      };

      return opportunity;

    } catch (error) {
      console.warn('Error building opportunity from extracted data:', error);
      return null;
    }
  }

  /**
   * Take a screenshot
   */
  private async takeScreenshot(filename: string): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available for screenshot');
    }

    const screenshotPath = `screenshots/${filename}_${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath });
    return screenshotPath;
  }

  /**
   * Get value by path (e.g., "data.items.0.title")
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): PlaybookContext {
    return {
      variables: {},
      extractedData: {},
      errors: [],
      warnings: [],
      screenshots: [],
      executionTime: 0,
      actionsExecuted: 0,
      actionResults: []
    };
  }
}