/**
 * Answer validation utilities for WaniKani lessons and reviews.
 *
 * Handles validation of user answers for both meaning and reading questions:
 * - Meaning: case-insensitive, whitespace-trimmed, supports multiple meanings and auxiliary meanings
 * - Reading: exact hiragana match, whitespace-trimmed, supports multiple readings
 */

import type { Meaning, AuxiliaryMeaning, Reading, KanjiReading } from '../api/types';

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
 * - Rejects auxiliary meanings with type: 'blacklist' (marked as blacklisted)
 *
 * @param answer - The user's answer
 * @param meanings - Array of valid meanings from WaniKani
 * @param auxiliaryMeanings - Optional array of auxiliary meanings (whitelist/blacklist)
 * @returns Validation result with matched meaning info
 */
export function validateMeaningAnswer(
  answer: string,
  meanings: Meaning[],
  auxiliaryMeanings: AuxiliaryMeaning[] = [],
): MeaningValidationResult {
  const normalizedAnswer = normalizeMeaningAnswer(answer);

  // Empty answer is always incorrect
  if (normalizedAnswer === '') {
    return { isCorrect: false };
  }

  // Check against blacklist first (rejects take priority)
  for (const aux of auxiliaryMeanings) {
    if (aux.type === 'blacklist' && normalizeMeaningAnswer(aux.meaning) === normalizedAnswer) {
      return { isCorrect: false, isBlacklisted: true };
    }
  }

  // Check against primary and alternative meanings
  for (const meaning of meanings) {
    if (meaning.accepted_answer && normalizeMeaningAnswer(meaning.meaning) === normalizedAnswer) {
      return { isCorrect: true, matchedMeaning: meaning.meaning };
    }
  }

  // Check against whitelist auxiliary meanings
  for (const aux of auxiliaryMeanings) {
    if (aux.type === 'whitelist' && normalizeMeaningAnswer(aux.meaning) === normalizedAnswer) {
      return { isCorrect: true, isAuxiliary: true, matchedMeaning: aux.meaning };
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
