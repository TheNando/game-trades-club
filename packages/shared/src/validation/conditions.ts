import { VALID_CONDITIONS } from '../constants/conditions';

export function isValidCondition(condition: string): boolean {
  return VALID_CONDITIONS.has(condition);
}

export function validateConditions(conditions: string[]): { valid: true } | { valid: false; error: string } {
  for (const condition of conditions) {
    if (!isValidCondition(condition)) {
      return {
        valid: false,
        error: `Invalid condition: ${condition}. Must be one of: ${[...VALID_CONDITIONS].join(', ')}`,
      };
    }
  }
  return { valid: true };
}
