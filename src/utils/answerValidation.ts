/**
 * Answer validation utilities for WaniKani lessons and reviews.
 *
 * Handles validation of user answers for both meaning and reading questions:
 * - Meaning: case-insensitive, whitespace-trimmed, supports multiple meanings, auxiliary meanings, and user synonyms
 * - Reading: exact hiragana match, whitespace-trimmed, supports multiple readings
 */

import type { Meaning, AuxiliaryMeaning, Reading, KanjiReading } from '../api/types';
import { damerauLevenshtein } from './stringDistance';

// ============================================
// Types
// ============================================

export interface MeaningValidationResult {
  isCorrect: boolean;
  /** The meaning that was matched (if correct) */
  matchedMeaning?: string;
  /** True if the answer matched an auxiliary whitelist meaning */
  isAuxiliary?: boolean;
  /** True if the answer matched a blacklisted meaning */
  isBlacklisted?: boolean;
  /** True if the answer was accepted via typo forgiveness (fuzzy match) */
  isFuzzyMatch?: boolean;
  /** True if the answer matched a user-defined synonym */
  isUserSynonym?: boolean;
}

export interface ReadingValidationResult {
  isCorrect: boolean;
  /** The reading that was matched (if correct) */
  matchedReading?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Normalizes a meaning answer for comparison.
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Normalizes multiple spaces to single space
 */
function normalizeMeaningAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes a reading answer for comparison.
 * - Trims leading/trailing whitespace
 * (No case conversion - hiragana doesn't have case)
 */
function normalizeReadingAnswer(answer: string): string {
  return answer.trim();
}

/**
 * Gets the maximum allowed edit distance for typo forgiveness based on word length.
 * - 1-3 characters: 0 (exact match only)
 * - 4-6 characters: 1 edit allowed
 * - 7+ characters: 2 edits allowed
 */
function getAllowedEditDistance(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 6) return 1;
  return 2;
}

// ============================================
// Meaning Validation
// ============================================

/**
 * Validates a user's meaning answer against the accepted meanings.
 *
 * Validation rules:
 * - Case-insensitive comparison
 * - Whitespace trimmed from start and end
 * - Multiple internal spaces normalized to single space
 * - Accepts all meanings with accepted_answer: true
 * - Accepts auxiliary meanings with type: 'whitelist' (marked as auxiliary)
 * - Accepts user-defined synonyms (marked as isUserSynonym)
 * - Rejects auxiliary meanings with type: 'blacklist' (marked as blacklisted)
 * - Typo forgiveness: accepts answers within edit distance threshold:
 *   - 1-3 chars: exact match only
 *   - 4-6 chars: 1 edit allowed
 *   - 7+ chars: 2 edits allowed
 *
 * @param answer - The user's answer
 * @param meanings - Array of valid meanings from WaniKani
 * @param auxiliaryMeanings - Optional array of auxiliary meanings (whitelist/blacklist)
 * @param userSynonyms - Optional array of user-defined synonym strings
 * @returns Validation result with matched meaning info
 */
export function validateMeaningAnswer(
  answer: string,
  meanings: Meaning[],
  auxiliaryMeanings: AuxiliaryMeaning[] = [],
  userSynonyms: string[] = [],
): MeaningValidationResult {
  const normalizedAnswer = normalizeMeaningAnswer(answer);

  // Empty answer is always incorrect
  if (normalizedAnswer === '') {
    return { isCorrect: false };
  }

  // Check against blacklist first (rejects take priority) - exact match only for blacklist
  for (const aux of auxiliaryMeanings) {
    if (aux.type === 'blacklist' && normalizeMeaningAnswer(aux.meaning) === normalizedAnswer) {
      return { isCorrect: false, isBlacklisted: true };
    }
  }

  // Check against primary and alternative meanings - exact match
  for (const meaning of meanings) {
    if (meaning.accepted_answer && normalizeMeaningAnswer(meaning.meaning) === normalizedAnswer) {
      return { isCorrect: true, matchedMeaning: meaning.meaning };
    }
  }

  // Check against whitelist auxiliary meanings - exact match
  for (const aux of auxiliaryMeanings) {
    if (aux.type === 'whitelist' && normalizeMeaningAnswer(aux.meaning) === normalizedAnswer) {
      return { isCorrect: true, isAuxiliary: true, matchedMeaning: aux.meaning };
    }
  }

  // Check against user-defined synonyms - exact match
  for (const synonym of userSynonyms) {
    if (normalizeMeaningAnswer(synonym) === normalizedAnswer) {
      return { isCorrect: true, isUserSynonym: true, matchedMeaning: synonym };
    }
  }

  // Typo forgiveness: check for fuzzy matches within allowed edit distance
  const allowedDistance = getAllowedEditDistance(normalizedAnswer.length);

  if (allowedDistance > 0) {
    // Check primary meanings with fuzzy matching
    for (const meaning of meanings) {
      if (meaning.accepted_answer) {
        const normalizedMeaning = normalizeMeaningAnswer(meaning.meaning);
        const distance = damerauLevenshtein(normalizedAnswer, normalizedMeaning, {
          maxDistance: allowedDistance,
        });
        if (distance <= allowedDistance) {
          return { isCorrect: true, matchedMeaning: meaning.meaning, isFuzzyMatch: true };
        }
      }
    }

    // Check whitelist auxiliary meanings with fuzzy matching
    for (const aux of auxiliaryMeanings) {
      if (aux.type === 'whitelist') {
        const normalizedAux = normalizeMeaningAnswer(aux.meaning);
        const distance = damerauLevenshtein(normalizedAnswer, normalizedAux, {
          maxDistance: allowedDistance,
        });
        if (distance <= allowedDistance) {
          return { isCorrect: true, isAuxiliary: true, matchedMeaning: aux.meaning, isFuzzyMatch: true };
        }
      }
    }

    // Check user synonyms with fuzzy matching
    for (const synonym of userSynonyms) {
      const normalizedSynonym = normalizeMeaningAnswer(synonym);
      const distance = damerauLevenshtein(normalizedAnswer, normalizedSynonym, {
        maxDistance: allowedDistance,
      });
      if (distance <= allowedDistance) {
        return { isCorrect: true, isUserSynonym: true, matchedMeaning: synonym, isFuzzyMatch: true };
      }
    }
  }

  return { isCorrect: false };
}

// ============================================
// Reading Validation
// ============================================

/**
 * Validates a user's reading answer against the accepted readings.
 *
 * Validation rules:
 * - Exact hiragana match required
 * - Whitespace trimmed from start and end
 * - Accepts all readings with accepted_answer: true
 *
 * @param answer - The user's answer (should be hiragana)
 * @param readings - Array of valid readings from WaniKani (can be Reading[] or KanjiReading[])
 * @returns Validation result with matched reading info
 */
export function validateReadingAnswer(
  answer: string,
  readings: (Reading | KanjiReading)[],
): ReadingValidationResult {
  const normalizedAnswer = normalizeReadingAnswer(answer);

  // Empty answer is always incorrect
  if (normalizedAnswer === '') {
    return { isCorrect: false };
  }

  // Check against all accepted readings (exact match)
  for (const reading of readings) {
    if (reading.accepted_answer && reading.reading === normalizedAnswer) {
      return { isCorrect: true, matchedReading: reading.reading };
    }
  }

  return { isCorrect: false };
}
