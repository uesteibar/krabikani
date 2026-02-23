/**
 * SRS (Spaced Repetition System) utility module.
 * Houses interval constants and stage computation logic.
 */

/**
 * WaniKani SRS intervals mapped by stage number.
 * Values are in milliseconds, null for burned (stage 9).
 */
export const SRS_INTERVALS: Record<number, number | null> = {
  1: 4 * 60 * 60 * 1000, // 4 hours
  2: 8 * 60 * 60 * 1000, // 8 hours
  3: 24 * 60 * 60 * 1000, // 1 day
  4: 2 * 24 * 60 * 60 * 1000, // 2 days
  5: 7 * 24 * 60 * 60 * 1000, // 1 week
  6: 14 * 24 * 60 * 60 * 1000, // 2 weeks
  7: 30 * 24 * 60 * 60 * 1000, // 1 month
  8: 120 * 24 * 60 * 60 * 1000, // 4 months
  9: null, // burned
};

/**
 * Calculate the new SRS stage after an incorrect answer.
 * WaniKani SRS penalty rules:
 * - Apprentice 1-4 (stages 1-4): drop to Apprentice 1 (stage 1)
 * - Guru 1-2 (stages 5-6): drop to Apprentice 4 (stage 4)
 * - Master (stage 7): drop to Guru 1 (stage 5)
 * - Enlightened (stage 8): drop to Guru 1 (stage 5)
 * - Burned (stage 9): doesn't get reviewed (return stage 9)
 *
 * @param currentStage - The current SRS stage (1-9)
 * @returns The new stage after an incorrect answer
 */
export function calculateSrsStageAfterIncorrect(currentStage: number): number {
  if (currentStage < 1 || currentStage > 9) {
    return currentStage;
  }

  if (currentStage <= 4) {
    return 1;
  } else if (currentStage <= 6) {
    return 4;
  } else if (currentStage <= 8) {
    return 5;
  }

  return 9;
}

/**
 * Compute the optimistic new assignment state after a review.
 * All-correct increments stage by 1; any incorrect uses calculateSrsStageAfterIncorrect.
 * Burned items (stage 9) return availableAt as null.
 *
 * @param currentStage - The current SRS stage
 * @param incorrectMeaningAnswers - Number of incorrect meaning answers
 * @param incorrectReadingAnswers - Number of incorrect reading answers
 * @returns { newStage, availableAt } where availableAt is epoch ms or null
 */
export function computeOptimisticAssignment(
  currentStage: number,
  incorrectMeaningAnswers: number,
  incorrectReadingAnswers: number,
): { newStage: number; availableAt: number | null } {
  if (currentStage < 1) {
    return { newStage: currentStage, availableAt: null };
  }

  const hasIncorrect = incorrectMeaningAnswers > 0 || incorrectReadingAnswers > 0;

  let newStage: number;
  if (hasIncorrect) {
    newStage = calculateSrsStageAfterIncorrect(currentStage);
  } else {
    newStage = Math.min(currentStage + 1, 9);
  }

  const interval = SRS_INTERVALS[newStage] ?? null;
  const availableAt = interval !== null ? Date.now() + interval : null;

  return { newStage, availableAt };
}
