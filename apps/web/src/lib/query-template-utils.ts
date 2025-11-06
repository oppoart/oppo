import { QueryTemplate } from '@/types/query-template';
import { ArtistProfile } from '@/types/profile';

/**
 * Generate example from template by replacing placeholders
 */
export function generateExample(template: QueryTemplate, profile?: ArtistProfile): string {
  const now = new Date();
  const month = now.toLocaleString('en', { month: 'long' });
  const year = now.getFullYear().toString();

  const replacements: Record<string, string> = {
    medium: profile?.mediums[0] || 'painting',
    month,
    year,
    'opportunity-type': 'exhibitions',
    location: 'New York',
    'city/state/country': 'California',
    amount: '$5000',
    'grant/award/exhibition/residency': 'grants',
    'grant/competition/exhibition': 'grants',
    'grant/exhibition': 'grants',
    'theme/subject': 'environmental',
    theme: 'climate change',
    'social-issue': 'sustainability',
  };

  let example = template.template;

  // Replace each placeholder
  template.placeholders.forEach((placeholder) => {
    const value = replacements[placeholder] || `[${placeholder}]`;
    const regex = new RegExp(`\\[${placeholder.replace(/[/]/g, '\\$&')}\\]`, 'g');
    example = example.replace(regex, value);
  });

  return example;
}

/**
 * Extract placeholders from template string
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\[([^\]]+)\]/g);
  if (!matches) return [];

  return matches.map(match => match.slice(1, -1)); // Remove [ and ]
}
