import { Injectable } from '@nestjs/common';
import { QueryGenerationRequest, QueryGenerationContext } from '../../../types/query-generation';

@Injectable()
export class QueryTemplateEngine {

  /**
   * Populate template with values from context and request
   * Uses square brackets [placeholder] format
   */
  populateTemplate(
    template: string,
    context: QueryGenerationContext,
    request: QueryGenerationRequest
  ): string {
    let populatedQuery = template;

    // Replace [medium] placeholder
    const mediums = context.profile.mediums;
    if (mediums.length > 0) {
      populatedQuery = populatedQuery.replace(/\[medium\]/g, mediums[0]);
    }

    // Replace [location] placeholder
    const location = request.location || context.profile.location;
    if (location) {
      populatedQuery = populatedQuery.replace(/\[location\]/g, location as string);
    }

    // Replace [year] placeholder
    populatedQuery = populatedQuery.replace(/\[year\]/g, new Date().getFullYear().toString());

    // Replace [month] placeholder
    const month = new Date().toLocaleString('en', { month: 'long' });
    populatedQuery = populatedQuery.replace(/\[month\]/g, month);

    // Add custom keywords if provided
    if (request.customKeywords && Array.isArray(request.customKeywords) && request.customKeywords.length > 0) {
      populatedQuery += ` ${request.customKeywords.join(' ')}`;
    }

    return populatedQuery;
  }

  /**
   * Replace multiple placeholders at once
   * @param template Template string with [placeholder] format
   * @param replacements Key-value pairs for replacement
   */
  replacePlaceholders(template: string, replacements: Record<string, string>): string {
    let result = template;

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${this.escapeRegex(key)}\\]`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Extract placeholder names from template
   * @param template Template string with [placeholder] format
   * @returns Array of placeholder names (without brackets)
   */
  extractTemplateVariables(template: string): string[] {
    const variablePattern = /\[([^\]]+)\]/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Check if template has all required parameters available
   */
  hasRequiredParameters(
    template: string,
    availableParams: Record<string, any>
  ): boolean {
    const requiredVars = this.extractTemplateVariables(template);
    return requiredVars.every(varName =>
      availableParams[varName] !== undefined &&
      availableParams[varName] !== null &&
      availableParams[varName] !== ''
    );
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}