import type { ListingStatus } from '../types/listing';

/** Human-readable labels keyed by listing status. */
export const STATUS_LABELS: Record<ListingStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  complete: 'Complete',
} as const;
