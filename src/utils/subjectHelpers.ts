import type { SubjectType } from '../api/types';

/**
 * Determines whether a subject type should have a reading question.
 *
 * Radicals have no readings (name-based only).
 * Kana vocabulary are written in kana already, so they don't have a separate reading.
 * Only kanji and regular vocabulary require reading questions.
 *
 * @param subjectType - The subject type to check
 * @returns true if the subject should have a reading question, false otherwise
 */
export function hasReadingQuestion(subjectType: SubjectType): boolean {
  return subjectType !== 'radical' && subjectType !== 'kana_vocabulary';
}
