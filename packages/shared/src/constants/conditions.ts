import type { ListingCondition } from '../types/listing';

export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
} as const;

export const CONDITION_OPTIONS: { value: ListingCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

export const CONDITION_VALUES: readonly ListingCondition[] = [
  'new',
  'like_new',
  'good',
  'fair',
  'poor',
] as const;

export const VALID_CONDITIONS = new Set<string>(CONDITION_VALUES);
