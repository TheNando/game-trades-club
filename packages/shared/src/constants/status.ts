import type { ListingStatus } from '../types/listing';

export const STATUS_LABELS: Record<ListingStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  complete: 'Complete',
} as const;
