import { Injectable } from '@nestjs/common';

export interface PlaceholderValues {
  [key: string]: string | number;
}

@Injectable()
export class PlaceholderReplacementService {
  /**
   * Replace all placeholders in a template with provided values
   * @param template Template string with [placeholder] format
   * @param values Object with placeholder values
   * @param autoValues Optional automatic values (medium, month, year)
   * @returns Template with all placeholders replaced
   *
   * Example:
   * Input: '[medium] opportunities in [location]'
   * Values: { medium: 'painting', location: 'New York' }
   * Output: 'painting opportunities in New York'
   */
  replace(
    template: string,
    values: PlaceholderValues,
    autoValues?: PlaceholderValues
  ): string {
    let result = template;

    // Combine user values with auto values
    const allValues = { ...autoValues, ...values };

    // Replace each placeholder
    Object.entries(allValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${this.escapeRegex(key)}\\]`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Extract placeholder names from template
   * @param template Template string with [placeholder] format
   * @returns Array of placeholder names (without brackets)
   *
   * Example:
   * Input: '[medium] opportunities in [location]'
   * Output: ['medium', 'location']
   */
  extractPlaceholders(template: string): string[] {
    const placeholderPattern = /\[([^\]]+)\]/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderPattern.exec(template)) !== null) {
      placeholders.push(match[1]);
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }

  /**
   * Check if template has all required placeholders filled
   * @param template Template string
   * @param availableValues Values available for replacement
   * @returns true if all placeholders can be filled
   */
  canFillTemplate(
    template: string,
    availableValues: PlaceholderValues
  ): boolean {
    const required = this.extractPlaceholders(template);
    return required.every(
      placeholder =>
        availableValues[placeholder] !== undefined &&
        availableValues[placeholder] !== null &&
        availableValues[placeholder] !== ''
    );
  }

  /**
   * Get missing placeholders for a template
   * @param template Template string
   * @param availableValues Values available for replacement
   * @returns Array of missing placeholder names
   */
  getMissingPlaceholders(
    template: string,
    availableValues: PlaceholderValues
  ): string[] {
    const required = this.extractPlaceholders(template);
    return required.filter(
      placeholder =>
        availableValues[placeholder] === undefined ||
        availableValues[placeholder] === null ||
        availableValues[placeholder] === ''
    );
  }

  /**
   * Generate automatic placeholder values (month, year, medium from profile)
   * @param profile Artist profile data
   * @returns Object with automatic placeholder values
   */
  generateAutoValues(profile?: {
    mediums?: string[];
    [key: string]: any;
  }): PlaceholderValues {
    const now = new Date();

    return {
      month: now.toLocaleString('en', { month: 'long' }),
      year: now.getFullYear().toString(),
      medium: profile?.mediums?.[0] || 'art',
    };
  }

  /**
   * Categorize placeholders by type
   * @param placeholders Array of placeholder names
   * @returns Object with categorized placeholders
   */
  categorizePlaceholders(placeholders: string[]): {
    user: string[]; // User-defined parameters
    auto: string[]; // Auto-generated parameters
    unknown: string[];
  } {
    const userPlaceholders = [
      'location',
      'opportunity-type',
      'amount',
      'theme',
    ];
    const autoPlaceholders = ['medium', 'month', 'year'];

    return {
      user: placeholders.filter(p => userPlaceholders.includes(p)),
      auto: placeholders.filter(p => autoPlaceholders.includes(p)),
      unknown: placeholders.filter(
        p => !userPlaceholders.includes(p) && !autoPlaceholders.includes(p)
      ),
    };
  }

  /**
   * Validate that a template uses only known placeholders
   * @param template Template string
   * @returns Object with validation result
   */
  validateTemplate(template: string): {
    valid: boolean;
    unknownPlaceholders: string[];
    message?: string;
  } {
    const placeholders = this.extractPlaceholders(template);
    const categorized = this.categorizePlaceholders(placeholders);

    if (categorized.unknown.length > 0) {
      return {
        valid: false,
        unknownPlaceholders: categorized.unknown,
        message: `Template contains unknown placeholders: ${categorized.unknown.join(', ')}`,
      };
    }

    return {
      valid: true,
      unknownPlaceholders: [],
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get a user-friendly description of what placeholders are needed
   * @param template Template string
   * @returns Human-readable description
   */
  getPlaceholderDescription(template: string): string {
    const placeholders = this.extractPlaceholders(template);
    const categorized = this.categorizePlaceholders(placeholders);

    const parts: string[] = [];

    if (categorized.user.length > 0) {
      parts.push(
        `Requires: ${categorized.user.map(p => `[${p}]`).join(', ')}`
      );
    }

    if (categorized.auto.length > 0) {
      parts.push(
        `Auto-filled: ${categorized.auto.map(p => `[${p}]`).join(', ')}`
      );
    }

    return parts.join(' | ');
  }
}
