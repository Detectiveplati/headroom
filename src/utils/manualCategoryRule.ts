import { ExpenseCategory } from '../types';
import { getReusableRulePattern } from './csvParser';

export function getManualCategoryRulePattern(category: ExpenseCategory, description: string): string {
  const detectedPattern = getReusableRulePattern(description);
  if (category !== 'Salary & Income') return detectedPattern;

  const salaryIdentifier = window.prompt(
    'What stable words identify this salary on future bank statements?\n\nKeep or edit the detected phrase. Changing monthly reference codes are ignored.',
    detectedPattern
  );

  return getReusableRulePattern(salaryIdentifier?.trim() || detectedPattern);
}
