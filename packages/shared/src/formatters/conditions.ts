import { CONDITION_LABELS } from '../constants/conditions';

export function formatCondition(condition: string): string {
  return CONDITION_LABELS[condition] ?? condition;
}
