import { PlaybookEngine, PlaybookDefinition } from '../../playbooks/PlaybookEngine';
import { chromium, Browser } from 'playwright';
import * as path from 'path';

describe('PlaybookEngine', () => {
  let browser: Browser;
  let playbookEngine: PlaybookEngine;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(() => {
    playbookEngine = new PlaybookEngine();
  });

  describe('Basic Playbook Execution', () => {
    const createBasicPlaybook = (): PlaybookDefinition => ({
      id: 'test-basic-playbook',
      name: 'Basic Test Playbook',
      description: 'A simple playbook for testing basic functionality',
      version: '1.0.0',
      author: 'Test Suite',
      tags: ['test', 'basic'],
      variables: {
        testUrl: 'https://httpbin.org/html',
        waitTime: 1000
      },
      actions: [
        {
          id: 'navigate_to_page',
          type: 'navigate',
          description: 'Navigate to test page',
          value: '${testUrl}',
          timeout: 10000
        },
        {
          id: 'wait_for_content',
          type: 'wait',
          description: 'Wait for page to load',
          selector: 'body',
          timeout: 5000
        },
        {
          id: 'extract_title',
          type: 'extract',
          description: 'Extract page title',
          selector: 'h1',
          variables: {
            pageTitle: 'textContent'
          }
        }
      ],
      extractionRules: [
        {
          field: 'title',
          selector: 'h1',
          attribute: 'textContent',
          required: true
        },
        {
          field: 'description',
          selector: 'p',
          attribute: 'textContent',
          required: false,
          defaultValue: 'No description available'
        },
        {
          field: 'url',
          selector: '',
          transform: 'window.location.href',
          required: true
        },
        {
          field: 'organization',
          selector: '',
          required: false,
          defaultValue: 'Test Organization'
        }
      ],
      errorHandling: {
        continueOnError: true,
        maxRetries: 2,
        retryDelay: 1000,
        screenshotOnError: false,
        logLevel: 'info'
      },
      metadata: {
        targetSite: 'httpbin.org',
        estimatedDuration: 30,
        complexity: 'simple',
        lastTested: new Date(),
        successRate: 100,
        usesBrowser: true,
        requiresAuth: false
      }
    });

    it('should execute a basic playbook successfully', async () => {
      const playbook = createBasicPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      expect(result.opportunities).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.context.actionsExecuted).toBe(3);

      const opportunity = result.opportunities[0];
      expect(opportunity.title).toBeTruthy();
      expect(opportunity.url).toContain('httpbin.org');
      expect(opportunity.organization).toBe('Test Organization');
    }, 30000);

    it('should handle variable substitution correctly', async () => {
      const playbook = createBasicPlaybook();
      
      const customVariables = {
        testUrl: 'https://httpbin.org/html',
        customTitle: 'Custom Test Title'
      };

      const result = await playbookEngine.execute(playbook, browser, customVariables);

      expect(result.success).toBe(true);
      expect(result.context.variables.testUrl).toBe(customVariables.testUrl);
      expect(result.context.variables.customTitle).toBe(customVariables.customTitle);
    }, 30000);

    it('should capture execution metrics', async () => {
      const playbook = createBasicPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.context.executionTime).toBeGreaterThan(0);
      expect(result.context.actionResults).toHaveLength(3);

      result.context.actionResults.forEach(actionResult => {
        expect(actionResult.duration).toBeGreaterThan(0);
        expect(actionResult.success).toBe(true);
      });
    }, 30000);
  });

  describe('Complex Playbook Features', () => {
    const createComplexPlaybook = (): PlaybookDefinition => ({
      id: 'test-complex-playbook',
      name: 'Complex Test Playbook',
      description: 'A complex playbook testing advanced features',
      version: '1.0.0',
      author: 'Test Suite',
      tags: ['test', 'complex'],
      variables: {
        baseUrl: 'https://httpbin.org',
        maxItems: 3
      },
      actions: [
        {
          id: 'navigate_home',
          type: 'navigate',
          description: 'Navigate to homepage',
          value: '${baseUrl}/html',
          timeout: 10000
        },
        {
          id: 'check_content_exists',
          type: 'conditional',
          description: 'Check if main content exists',
          conditions: [
            {
              type: 'exists',
              selector: 'body'
            }
          ],
          actions: [
            {
              id: 'extract_content',
              type: 'extract',
              description: 'Extract content if it exists',
              selector: 'p',
              variables: {
                content: 'textContent'
              }
            }
          ]
        },
        {
          id: 'loop_through_items',
          type: 'loop',
          description: 'Loop through items',
          value: '${maxItems}',
          actions: [
            {
              id: 'wait_in_loop',
              type: 'wait',
              description: 'Wait during loop iteration',
              value: 100
            },
            {
              id: 'evaluate_counter',
              type: 'evaluate',
              description: 'Evaluate current iteration',
              value: 'window.loopCounter = (window.loopCounter || 0) + 1; window.loopCounter',
              variables: {
                currentIteration: '.'
              }
            }
          ]
        },
        {
          id: 'retry_operation',
          type: 'retry',
          description: 'Retry a potentially failing operation',
          value: '2',
          timeout: 500,
          actions: [
            {
              id: 'check_element',
              type: 'extract',
              description: 'Try to extract element',
              selector: 'h1',
              optional: true
            }
          ]
        }
      ],
      extractionRules: [
        {
          field: 'title',
          selector: 'h1',
          attribute: 'textContent',
          required: true
        },
        {
          field: 'url',
          selector: '',
          transform: 'window.location.href',
          required: true
        },
        {
          field: 'organization',
          selector: '',
          required: false,
          defaultValue: 'Complex Test Org'
        }
      ],
      errorHandling: {
        continueOnError: true,
        maxRetries: 1,
        retryDelay: 500,
        screenshotOnError: false,
        logLevel: 'info'
      },
      metadata: {
        targetSite: 'httpbin.org',
        estimatedDuration: 60,
        complexity: 'complex',
        lastTested: new Date(),
        successRate: 90,
        usesBrowser: true,
        requiresAuth: false
      }
    });

    it('should handle conditional actions', async () => {
      const playbook = createComplexPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      
      // Should have executed the conditional action since body exists
      const conditionalResult = result.context.actionResults.find(
        r => r.actionId === 'check_content_exists'
      );
      expect(conditionalResult).toBeTruthy();
      expect(conditionalResult!.success).toBe(true);
    }, 30000);

    it('should handle loop actions', async () => {
      const playbook = createComplexPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      
      // Should have executed loop actions
      const loopResult = result.context.actionResults.find(
        r => r.actionId === 'loop_through_items'
      );
      expect(loopResult).toBeTruthy();
      expect(loopResult!.success).toBe(true);
    }, 30000);

    it('should handle retry actions', async () => {
      const playbook = createComplexPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      
      // Should have executed retry actions
      const retryResult = result.context.actionResults.find(
        r => r.actionId === 'retry_operation'
      );
      expect(retryResult).toBeTruthy();
      expect(retryResult!.success).toBe(true);
    }, 30000);

    it('should handle JavaScript evaluation actions', async () => {
      const playbook: PlaybookDefinition = {
        ...createComplexPlaybook(),
        actions: [
          {
            id: 'navigate_home',
            type: 'navigate',
            description: 'Navigate to test page',
            value: 'https://httpbin.org/html',
            timeout: 10000
          },
          {
            id: 'evaluate_js',
            type: 'evaluate',
            description: 'Evaluate JavaScript code',
            value: 'document.title + " - Modified"',
            variables: {
              modifiedTitle: '.'
            }
          }
        ]
      };
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      expect(result.context.variables.modifiedTitle).toContain('- Modified');
    }, 30000);
  });

  describe('Error Handling', () => {
    const createFailingPlaybook = (): PlaybookDefinition => ({
      id: 'test-failing-playbook',
      name: 'Failing Test Playbook',
      description: 'A playbook designed to test error handling',
      version: '1.0.0',
      author: 'Test Suite',
      tags: ['test', 'error'],
      variables: {
        invalidUrl: 'https://invalid-domain-that-does-not-exist.com'
      },
      actions: [
        {
          id: 'navigate_to_invalid',
          type: 'navigate',
          description: 'Navigate to invalid URL',
          value: '${invalidUrl}',
          timeout: 5000,
          optional: true
        },
        {
          id: 'click_nonexistent',
          type: 'click',
          description: 'Click nonexistent element',
          selector: '#nonexistent-element',
          timeout: 1000,
          optional: true
        },
        {
          id: 'required_action',
          type: 'wait',
          description: 'Required action that should execute',
          value: 100
        }
      ],
      extractionRules: [
        {
          field: 'title',
          selector: 'h1',
          attribute: 'textContent',
          required: false,
          defaultValue: 'Error Test'
        },
        {
          field: 'url',
          selector: '',
          transform: 'window.location.href',
          required: true
        }
      ],
      errorHandling: {
        continueOnError: true,
        maxRetries: 1,
        retryDelay: 100,
        screenshotOnError: false,
        logLevel: 'info'
      },
      metadata: {
        targetSite: 'test',
        estimatedDuration: 10,
        complexity: 'simple',
        lastTested: new Date(),
        successRate: 50,
        usesBrowser: true,
        requiresAuth: false
      }
    });

    it('should continue execution after optional action failures', async () => {
      const playbook = createFailingPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      // Should not succeed completely due to navigation failure
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // But should have attempted all actions
      expect(result.context.actionsExecuted).toBe(3);
    }, 30000);

    it('should handle action retries', async () => {
      const playbook: PlaybookDefinition = {
        ...createFailingPlaybook(),
        actions: [
          {
            id: 'navigate_valid',
            type: 'navigate',
            description: 'Navigate to valid URL first',
            value: 'https://httpbin.org/html',
            timeout: 10000
          },
          {
            id: 'click_with_retry',
            type: 'click',
            description: 'Click with retry',
            selector: '#nonexistent',
            timeout: 500,
            retries: 2,
            optional: true
          }
        ]
      };
      
      const result = await playbookEngine.execute(playbook, browser);

      // Should execute but have some errors from the failing click
      const clickAction = result.context.actionResults.find(
        r => r.actionId === 'click_with_retry'
      );
      
      expect(clickAction).toBeTruthy();
      expect(result.context.actionsExecuted).toBe(2);
    }, 30000);

    it('should stop execution on critical failures when continueOnError is false', async () => {
      const playbook: PlaybookDefinition = {
        ...createFailingPlaybook(),
        errorHandling: {
          continueOnError: false,
          maxRetries: 0,
          retryDelay: 100,
          screenshotOnError: false,
          logLevel: 'error'
        },
        actions: [
          {
            id: 'navigate_invalid',
            type: 'navigate',
            description: 'Navigate to invalid URL',
            value: 'https://invalid-domain-that-does-not-exist.com',
            timeout: 2000
          },
          {
            id: 'should_not_execute',
            type: 'wait',
            description: 'This should not execute',
            value: 100
          }
        ]
      };
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should stop after first failure
      expect(result.context.actionsExecuted).toBeLessThan(2);
    }, 30000);
  });

  describe('Data Extraction', () => {
    const createExtractionPlaybook = (): PlaybookDefinition => ({
      id: 'test-extraction-playbook',
      name: 'Extraction Test Playbook',
      description: 'A playbook for testing data extraction features',
      version: '1.0.0',
      author: 'Test Suite',
      tags: ['test', 'extraction'],
      variables: {
        testUrl: 'https://httpbin.org/html'
      },
      actions: [
        {
          id: 'navigate_to_page',
          type: 'navigate',
          description: 'Navigate to test page',
          value: '${testUrl}',
          timeout: 10000
        },
        {
          id: 'extract_multiple_elements',
          type: 'extract',
          description: 'Extract multiple elements',
          selector: 'p',
          variables: {
            paragraphs: '.'
          }
        }
      ],
      extractionRules: [
        {
          field: 'title',
          selector: 'h1',
          attribute: 'textContent',
          required: true
        },
        {
          field: 'description',
          selector: 'p',
          attribute: 'textContent',
          required: true
        },
        {
          field: 'url',
          selector: '',
          transform: 'window.location.href',
          required: true
        },
        {
          field: 'organization',
          selector: 'meta[name="author"]',
          attribute: 'content',
          required: false,
          defaultValue: 'Unknown Organization'
        },
        {
          field: 'tags',
          selector: 'meta[name="keywords"]',
          attribute: 'content',
          transform: 'value ? value.split(",").map(s => s.trim()) : []',
          required: false,
          defaultValue: []
        }
      ],
      errorHandling: {
        continueOnError: true,
        maxRetries: 1,
        retryDelay: 500,
        screenshotOnError: false,
        logLevel: 'info'
      },
      metadata: {
        targetSite: 'httpbin.org',
        estimatedDuration: 30,
        complexity: 'medium',
        lastTested: new Date(),
        successRate: 95,
        usesBrowser: true,
        requiresAuth: false
      }
    });

    it('should extract data according to extraction rules', async () => {
      const playbook = createExtractionPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      expect(result.opportunities).toHaveLength(1);

      const opportunity = result.opportunities[0];
      expect(opportunity.title).toBeTruthy();
      expect(opportunity.description).toBeTruthy();
      expect(opportunity.url).toContain('httpbin.org');
      expect(opportunity.organization).toBe('Unknown Organization'); // Default value
    }, 30000);

    it('should handle missing optional fields with defaults', async () => {
      const playbook = createExtractionPlaybook();
      
      const result = await playbookEngine.execute(playbook, browser);

      const opportunity = result.opportunities[0];
      
      // Optional fields should have default values
      expect(opportunity.organization).toBe('Unknown Organization');
      expect(opportunity.tags).toEqual([]);
    }, 30000);

    it('should extract multiple opportunities from repeated elements', async () => {
      const playbook: PlaybookDefinition = {
        ...createExtractionPlaybook(),
        extractionRules: [
          {
            field: 'title',
            selector: 'p', // Multiple paragraphs
            attribute: 'textContent',
            required: true
          },
          {
            field: 'url',
            selector: '',
            transform: 'window.location.href',
            required: true
          },
          {
            field: 'organization',
            selector: '',
            required: false,
            defaultValue: 'Multi Test Org'
          }
        ]
      };
      
      const result = await playbookEngine.execute(playbook, browser);

      expect(result.success).toBe(true);
      
      // Should create multiple opportunities if there are multiple matching elements
      if (result.opportunities.length > 1) {
        result.opportunities.forEach(opportunity => {
          expect(opportunity.title).toBeTruthy();
          expect(opportunity.url).toContain('httpbin.org');
          expect(opportunity.organization).toBe('Multi Test Org');
        });
      }
    }, 30000);
  });
});