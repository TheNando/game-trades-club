import { CONDITION_LABELS } from '../constants/conditions';

/** Returns a human-readable label for a listing condition. */
export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}
