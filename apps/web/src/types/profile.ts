export type ArtistCategory = 
  | 'generative art'
  | 'textile art'
  | 'new media art'
  | 'AI art'
  | 'digital art'
  | 'traditional art'
  | 'fine art'
  | 'sculpture'
  | 'painting'
  | 'photography'
  | 'performance art'
  | 'installation art'
  | 'video art'
  | 'interactive art'
  | 'other';

export interface ArtistProfile {
  id: string;
  name: string;
  mediums: ArtistCategory[];
  bio?: string;
  artistStatement?: string;
  skills: string[];
  interests: string[];
  website?: string;
  locations: string[];
  opportunityTypes: string[];
  amountRanges: string[];
  themes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRequest {
  name: string;
  mediums: ArtistCategory[];
}

export interface UpdateProfileRequest {
  name?: string;
  mediums?: ArtistCategory[];
  bio?: string;
  artistStatement?: string;
  skills?: string[];
  interests?: string[];
  website?: string;
  locations?: string[];
  opportunityTypes?: string[];
  amountRanges?: string[];
  themes?: string[];
}

export const ARTIST_CATEGORIES = [
  { value: 'generative art', label: 'Generative Art' },
  { value: 'textile art', label: 'Textile Art' },
  { value: 'new media art', label: 'New Media Art' },
  { value: 'AI art', label: 'AI Art' },
  { value: 'digital art', label: 'Digital Art' },
  { value: 'traditional art', label: 'Traditional Art' },
  { value: 'fine art', label: 'Fine Art' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'painting', label: 'Painting' },
  { value: 'photography', label: 'Photography' },
  { value: 'performance art', label: 'Performance Art' },
  { value: 'installation art', label: 'Installation Art' },
  { value: 'video art', label: 'Video Art' },
  { value: 'interactive art', label: 'Interactive Art' },
  { value: 'other', label: 'Other' },
] as const;

