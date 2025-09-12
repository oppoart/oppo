import { PlaybookDefinition, PlaybookExecutionResult, PlaybookEngine } from './PlaybookEngine';
import { Browser } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Playbook validation result
 */
export interface PlaybookValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Playbook execution statistics
 */
export interface PlaybookStats {
  id: string;
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted: Date | null;
  successRate: number;
  averageOpportunitiesFound: number;
}

/**
 * Playbook search filters
 */
export interface PlaybookSearchFilters {
  tags?: string[];
  author?: string;
  targetSite?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  requiresAuth?: boolean;
  minSuccessRate?: number;
}

/**
 * Playbook execution history entry
 */
export interface PlaybookExecutionHistory {
  id: string;
  playbookId: string;
  executedAt: Date;
  success: boolean;
  opportunitiesFound: number;
  executionTime: number;
  errors: string[];
  warnings: string[];
  variables: Record<string, any>;
}

/**
 * Playbook Manager for CRUD operations and execution management
 */
export class PlaybookManager {
  private playbooksDir: string;
  private templatesDir: string;
  private historyDir: string;
  private engine: PlaybookEngine;
  private playbooks: Map<string, PlaybookDefinition> = new Map();
  private stats: Map<string, PlaybookStats> = new Map();
  private history: PlaybookExecutionHistory[] = [];

  constructor(
    playbooksDir: string = './playbooks/definitions',
    templatesDir: string = './playbooks/templates',
    historyDir: string = './playbooks/history'
  ) {
    this.playbooksDir = playbooksDir;
    this.templatesDir = templatesDir;
    this.historyDir = historyDir;
    this.engine = new PlaybookEngine();
  }

  /**
   * Initialize the playbook manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing Playbook Manager...');
    
    // Create directories if they don't exist
    await this.ensureDirectories();
    
    // Load existing playbooks
    await this.loadPlaybooks();
    
    // Load execution history
    await this.loadExecutionHistory();
    
    // Calculate statistics
    this.calculateStats();
    
    console.log(`Loaded ${this.playbooks.size} playbooks`);
  }

  /**
   * Create a new playbook
   */
  async createPlaybook(playbook: PlaybookDefinition): Promise<void> {
    // Validate playbook
    const validation = this.validatePlaybook(playbook);
    if (!validation.isValid) {
      throw new Error(`Invalid playbook: ${validation.errors.join(', ')}`);
    }

    // Check if playbook with same ID already exists
    if (this.playbooks.has(playbook.id)) {
      throw new Error(`Playbook with ID '${playbook.id}' already exists`);
    }

    // Save to file
    const filePath = path.join(this.playbooksDir, `${playbook.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(playbook, null, 2));

    // Add to memory
    this.playbooks.set(playbook.id, playbook);
    this.initializeStats(playbook);

    console.log(`Created playbook: ${playbook.name} (${playbook.id})`);
  }

  /**
   * Update an existing playbook
   */
  async updatePlaybook(playbook: PlaybookDefinition): Promise<void> {
    // Validate playbook
    const validation = this.validatePlaybook(playbook);
    if (!validation.isValid) {
      throw new Error(`Invalid playbook: ${validation.errors.join(', ')}`);
    }

    // Check if playbook exists
    if (!this.playbooks.has(playbook.id)) {
      throw new Error(`Playbook with ID '${playbook.id}' does not exist`);
    }

    // Save to file
    const filePath = path.join(this.playbooksDir, `${playbook.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(playbook, null, 2));

    // Update in memory
    this.playbooks.set(playbook.id, playbook);

    console.log(`Updated playbook: ${playbook.name} (${playbook.id})`);
  }

  /**
   * Delete a playbook
   */
  async deletePlaybook(playbookId: string): Promise<void> {
    // Check if playbook exists
    if (!this.playbooks.has(playbookId)) {
      throw new Error(`Playbook with ID '${playbookId}' does not exist`);
    }

    // Delete file
    const filePath = path.join(this.playbooksDir, `${playbookId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete playbook file: ${error}`);
    }

    // Remove from memory
    this.playbooks.delete(playbookId);
    this.stats.delete(playbookId);

    console.log(`Deleted playbook: ${playbookId}`);
  }

  /**
   * Get a playbook by ID
   */
  getPlaybook(playbookId: string): PlaybookDefinition | null {
    return this.playbooks.get(playbookId) || null;
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): PlaybookDefinition[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Search playbooks with filters
   */
  searchPlaybooks(filters: PlaybookSearchFilters): PlaybookDefinition[] {
    const playbooks = Array.from(this.playbooks.values());

    return playbooks.filter(playbook => {
      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          playbook.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // Author filter
      if (filters.author && playbook.author !== filters.author) {
        return false;
      }

      // Target site filter
      if (filters.targetSite && playbook.metadata.targetSite !== filters.targetSite) {
        return false;
      }

      // Complexity filter
      if (filters.complexity && playbook.metadata.complexity !== filters.complexity) {
        return false;
      }

      // Auth requirement filter
      if (filters.requiresAuth !== undefined && 
          playbook.metadata.requiresAuth !== filters.requiresAuth) {
        return false;
      }

      // Success rate filter
      if (filters.minSuccessRate !== undefined) {
        const stats = this.stats.get(playbook.id);
        if (!stats || stats.successRate < filters.minSuccessRate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Execute a playbook
   */
  async executePlaybook(
    playbookId: string,
    browser: Browser,
    variables: Record<string, any> = {}
  ): Promise<PlaybookExecutionResult> {
    const playbook = this.getPlaybook(playbookId);
    if (!playbook) {
      throw new Error(`Playbook with ID '${playbookId}' not found`);
    }

    console.log(`Executing playbook: ${playbook.name}`);

    const startTime = Date.now();
    const result = await this.engine.execute(playbook, browser, variables);
    
    // Record execution history
    const historyEntry: PlaybookExecutionHistory = {
      id: this.generateHistoryId(),
      playbookId: playbook.id,
      executedAt: new Date(),
      success: result.success,
      opportunitiesFound: result.opportunities.length,
      executionTime: result.executionTime,
      errors: result.errors,
      warnings: result.warnings,
      variables
    };

    this.history.push(historyEntry);
    await this.saveExecutionHistory(historyEntry);

    // Update statistics
    this.updateStats(playbook.id, historyEntry);

    return result;
  }

  /**
   * Validate a playbook structure
   */
  validatePlaybook(playbook: PlaybookDefinition): PlaybookValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!playbook.id || playbook.id.trim() === '') {
      errors.push('Playbook ID is required');
    }

    if (!playbook.name || playbook.name.trim() === '') {
      errors.push('Playbook name is required');
    }

    if (!playbook.version || playbook.version.trim() === '') {
      errors.push('Playbook version is required');
    }

    if (!playbook.actions || playbook.actions.length === 0) {
      errors.push('Playbook must have at least one action');
    }

    // Validate ID format (alphanumeric, hyphens, underscores)
    if (playbook.id && !/^[a-zA-Z0-9_-]+$/.test(playbook.id)) {
      errors.push('Playbook ID must contain only letters, numbers, hyphens, and underscores');
    }

    // Validate version format (semver)
    if (playbook.version && !/^\d+\.\d+\.\d+/.test(playbook.version)) {
      warnings.push('Playbook version should follow semantic versioning (e.g., 1.0.0)');
    }

    // Validate actions
    if (playbook.actions) {
      for (let i = 0; i < playbook.actions.length; i++) {
        const action = playbook.actions[i];
        const actionErrors = this.validateAction(action, i);
        errors.push(...actionErrors);
      }
    }

    // Validate extraction rules
    if (playbook.extractionRules) {
      for (let i = 0; i < playbook.extractionRules.length; i++) {
        const rule = playbook.extractionRules[i];
        if (!rule.field || rule.field.trim() === '') {
          errors.push(`Extraction rule ${i}: field is required`);
        }
        if (!rule.selector || rule.selector.trim() === '') {
          errors.push(`Extraction rule ${i}: selector is required`);
        }
      }
    }

    // Validate error handling
    if (playbook.errorHandling) {
      const eh = playbook.errorHandling;
      if (eh.maxRetries < 0) {
        errors.push('Error handling maxRetries must be >= 0');
      }
      if (eh.retryDelay < 0) {
        errors.push('Error handling retryDelay must be >= 0');
      }
    }

    // Validate metadata
    if (playbook.metadata) {
      if (playbook.metadata.estimatedDuration < 0) {
        warnings.push('Estimated duration should be positive');
      }
      if (playbook.metadata.successRate < 0 || playbook.metadata.successRate > 100) {
        warnings.push('Success rate should be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate an action
   */
  private validateAction(action: any, index: number): string[] {
    const errors: string[] = [];

    if (!action.id || action.id.trim() === '') {
      errors.push(`Action ${index}: id is required`);
    }

    if (!action.type || action.type.trim() === '') {
      errors.push(`Action ${index}: type is required`);
    }

    const validTypes = [
      'navigate', 'wait', 'click', 'fill', 'select', 'extract',
      'scroll', 'screenshot', 'evaluate', 'conditional', 'loop', 'retry'
    ];

    if (action.type && !validTypes.includes(action.type)) {
      errors.push(`Action ${index}: invalid type '${action.type}'`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'navigate':
        if (!action.value) {
          errors.push(`Action ${index} (navigate): value (URL) is required`);
        }
        break;
      
      case 'click':
      case 'extract':
        if (!action.selector) {
          errors.push(`Action ${index} (${action.type}): selector is required`);
        }
        break;
        
      case 'fill':
      case 'select':
        if (!action.selector || action.value === undefined) {
          errors.push(`Action ${index} (${action.type}): selector and value are required`);
        }
        break;
        
      case 'conditional':
      case 'loop':
      case 'retry':
        if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
          errors.push(`Action ${index} (${action.type}): sub-actions are required`);
        }
        break;
    }

    // Validate sub-actions recursively
    if (action.actions && Array.isArray(action.actions)) {
      for (let i = 0; i < action.actions.length; i++) {
        const subActionErrors = this.validateAction(action.actions[i], i);
        errors.push(...subActionErrors.map(err => `Action ${index} > ${err}`));
      }
    }

    return errors;
  }

  /**
   * Get playbook statistics
   */
  getPlaybookStats(playbookId: string): PlaybookStats | null {
    return this.stats.get(playbookId) || null;
  }

  /**
   * Get all playbook statistics
   */
  getAllStats(): PlaybookStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get execution history for a playbook
   */
  getExecutionHistory(playbookId: string): PlaybookExecutionHistory[] {
    return this.history.filter(entry => entry.playbookId === playbookId);
  }

  /**
   * Get all execution history
   */
  getAllExecutionHistory(): PlaybookExecutionHistory[] {
    return [...this.history];
  }

  /**
   * Import playbook from template
   */
  async createFromTemplate(templateName: string, playbookId: string, customizations?: any): Promise<PlaybookDefinition> {
    const templatePath = path.join(this.templatesDir, `${templateName}.json`);
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(templateContent);
      
      // Create new playbook from template
      const newPlaybook: PlaybookDefinition = {
        ...template,
        id: playbookId,
        name: `${template.name} (${playbookId})`,
        ...customizations
      };

      await this.createPlaybook(newPlaybook);
      return newPlaybook;

    } catch (error) {
      throw new Error(`Failed to create playbook from template '${templateName}': ${error}`);
    }
  }

  /**
   * Export playbook to JSON file
   */
  async exportPlaybook(playbookId: string, outputPath: string): Promise<void> {
    const playbook = this.getPlaybook(playbookId);
    if (!playbook) {
      throw new Error(`Playbook with ID '${playbookId}' not found`);
    }

    await fs.writeFile(outputPath, JSON.stringify(playbook, null, 2));
    console.log(`Exported playbook to: ${outputPath}`);
  }

  /**
   * Import playbook from JSON file
   */
  async importPlaybook(filePath: string): Promise<PlaybookDefinition> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const playbook = JSON.parse(content);
      
      await this.createPlaybook(playbook);
      return playbook;

    } catch (error) {
      throw new Error(`Failed to import playbook from '${filePath}': ${error}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [this.playbooksDir, this.templatesDir, this.historyDir];
    
    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Load all playbooks from the filesystem
   */
  private async loadPlaybooks(): Promise<void> {
    try {
      const files = await fs.readdir(this.playbooksDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.playbooksDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playbook = JSON.parse(content);
          
          this.playbooks.set(playbook.id, playbook);
          this.initializeStats(playbook);

        } catch (error) {
          console.warn(`Failed to load playbook from ${file}:`, error);
        }
      }

    } catch (error) {
      console.warn('Failed to load playbooks directory:', error);
    }
  }

  /**
   * Load execution history from filesystem
   */
  private async loadExecutionHistory(): Promise<void> {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.historyDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const historyEntry = JSON.parse(content);
          
          // Convert date strings back to Date objects
          historyEntry.executedAt = new Date(historyEntry.executedAt);
          
          this.history.push(historyEntry);

        } catch (error) {
          console.warn(`Failed to load history from ${file}:`, error);
        }
      }

    } catch (error) {
      console.warn('Failed to load history directory:', error);
    }
  }

  /**
   * Save execution history entry to filesystem
   */
  private async saveExecutionHistory(entry: PlaybookExecutionHistory): Promise<void> {
    try {
      const filePath = path.join(this.historyDir, `${entry.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.warn('Failed to save execution history:', error);
    }
  }

  /**
   * Initialize statistics for a playbook
   */
  private initializeStats(playbook: PlaybookDefinition): void {
    if (!this.stats.has(playbook.id)) {
      this.stats.set(playbook.id, {
        id: playbook.id,
        name: playbook.name,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecuted: null,
        successRate: playbook.metadata.successRate || 0,
        averageOpportunitiesFound: 0
      });
    }
  }

  /**
   * Update statistics after execution
   */
  private updateStats(playbookId: string, execution: PlaybookExecutionHistory): void {
    const stats = this.stats.get(playbookId);
    if (!stats) return;

    stats.totalExecutions++;
    stats.lastExecuted = execution.executedAt;

    if (execution.success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    // Calculate averages
    stats.successRate = (stats.successfulExecutions / stats.totalExecutions) * 100;
    
    const allExecutions = this.history.filter(h => h.playbookId === playbookId);
    
    if (allExecutions.length > 0) {
      stats.averageExecutionTime = allExecutions.reduce((sum, exec) => sum + exec.executionTime, 0) / allExecutions.length;
      stats.averageOpportunitiesFound = allExecutions.reduce((sum, exec) => sum + exec.opportunitiesFound, 0) / allExecutions.length;
    }
  }

  /**
   * Calculate all statistics from execution history
   */
  private calculateStats(): void {
    for (const playbook of this.playbooks.values()) {
      const executions = this.history.filter(h => h.playbookId === playbook.id);
      
      if (executions.length > 0) {
        const stats = this.stats.get(playbook.id);
        if (stats) {
          stats.totalExecutions = executions.length;
          stats.successfulExecutions = executions.filter(e => e.success).length;
          stats.failedExecutions = executions.filter(e => !e.success).length;
          stats.successRate = (stats.successfulExecutions / stats.totalExecutions) * 100;
          stats.averageExecutionTime = executions.reduce((sum, exec) => sum + exec.executionTime, 0) / executions.length;
          stats.averageOpportunitiesFound = executions.reduce((sum, exec) => sum + exec.opportunitiesFound, 0) / executions.length;
          stats.lastExecuted = executions[executions.length - 1].executedAt;
        }
      }
    }
  }

  /**
   * Generate unique history ID
   */
  private generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}