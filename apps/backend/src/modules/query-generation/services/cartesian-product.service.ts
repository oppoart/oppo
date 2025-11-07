import { Injectable } from '@nestjs/common';

export interface ParameterSet {
  locations?: string[];
  opportunityTypes?: string[];
  amountRanges?: string[];
  themes?: string[];
  [key: string]: string[] | undefined;
}

export interface ParameterCombination {
  [key: string]: string;
}

@Injectable()
export class CartesianProductService {
  /**
   * Generate all possible combinations (cartesian product) from parameter sets
   * @param parameters Object with arrays of parameter values
   * @returns Array of all possible combinations
   *
   * Example:
   * Input: { locations: ['NY', 'CA'], opportunityTypes: ['grant', 'exhibition'] }
   * Output: [
   *   { location: 'NY', 'opportunity-type': 'grant' },
   *   { location: 'NY', 'opportunity-type': 'exhibition' },
   *   { location: 'CA', 'opportunity-type': 'grant' },
   *   { location: 'CA', 'opportunity-type': 'exhibition' }
   * ]
   */
  generateCombinations(parameters: ParameterSet): ParameterCombination[] {
    // Filter out empty arrays and convert to entries
    const entries = Object.entries(parameters)
      .filter(([_, values]) => values && values.length > 0)
      .map(([key, values]) => ({
        key: this.normalizeParameterName(key),
        values: values!,
      }));

    // If no parameters, return empty array
    if (entries.length === 0) {
      return [];
    }

    // If only one parameter type, return simple combinations
    if (entries.length === 1) {
      return entries[0].values.map(value => ({
        [entries[0].key]: value,
      }));
    }

    // Generate cartesian product
    return this.cartesianProduct(entries);
  }

  /**
   * Calculate how many combinations will be generated
   */
  calculateCombinationCount(parameters: ParameterSet): number {
    const entries = Object.entries(parameters).filter(
      ([_, values]) => values && values.length > 0
    );

    if (entries.length === 0) return 0;

    return entries.reduce((acc, [_, values]) => acc * values!.length, 1);
  }

  /**
   * Get statistics about parameter coverage
   */
  getParameterStats(parameters: ParameterSet): {
    totalParameters: number;
    filledParameters: number;
    emptyParameters: string[];
    combinationCount: number;
  } {
    const allParamNames = ['locations', 'opportunityTypes', 'amountRanges', 'themes'];
    const filledParams = Object.entries(parameters).filter(
      ([_, values]) => values && values.length > 0
    );

    const emptyParams = allParamNames.filter(
      name => !parameters[name] || parameters[name]!.length === 0
    );

    return {
      totalParameters: allParamNames.length,
      filledParameters: filledParams.length,
      emptyParameters: emptyParams,
      combinationCount: this.calculateCombinationCount(parameters),
    };
  }

  /**
   * Normalize parameter names to match placeholder format
   * Example: 'locations' -> 'location', 'opportunityTypes' -> 'opportunity-type'
   */
  private normalizeParameterName(paramName: string): string {
    const mapping: Record<string, string> = {
      locations: 'location',
      opportunityTypes: 'opportunity-type',
      amountRanges: 'amount',
      themes: 'theme',
    };

    return mapping[paramName] || paramName;
  }

  /**
   * Generate cartesian product recursively
   */
  private cartesianProduct(
    entries: Array<{ key: string; values: string[] }>
  ): ParameterCombination[] {
    if (entries.length === 0) return [{}];
    if (entries.length === 1) {
      return entries[0].values.map(value => ({ [entries[0].key]: value }));
    }

    const [first, ...rest] = entries;
    const restProduct = this.cartesianProduct(rest);

    const result: ParameterCombination[] = [];

    for (const value of first.values) {
      for (const combo of restProduct) {
        result.push({
          [first.key]: value,
          ...combo,
        });
      }
    }

    return result;
  }

  /**
   * Filter combinations based on template requirements
   * Only returns combinations that have all required placeholders for a template
   */
  filterCombinationsForTemplate(
    combinations: ParameterCombination[],
    requiredPlaceholders: string[]
  ): ParameterCombination[] {
    return combinations.filter(combo => {
      return requiredPlaceholders.every(placeholder =>
        combo[placeholder] !== undefined
      );
    });
  }
}
