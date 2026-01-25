/**
 * String distance algorithms for typo forgiveness in answer validation.
 *
 * Provides Damerau-Levenshtein distance calculation to determine how similar
 * two strings are, enabling acceptance of minor typos in user answers.
 */

// ============================================
// Types
// ============================================

export interface DistanceOptions {
  /** Maximum distance threshold - returns early if exceeded */
  maxDistance?: number;
}

// ============================================
// Damerau-Levenshtein Distance
// ============================================

/**
 * Calculates the Damerau-Levenshtein distance between two strings.
 *
 * The Damerau-Levenshtein distance counts the minimum number of operations
 * needed to transform one string into another, where operations are:
 * - Insertion: add a character
 * - Deletion: remove a character
 * - Substitution: replace a character with another
 * - Transposition: swap two adjacent characters
 *
 * This implementation uses the optimal string alignment distance variant,
 * which doesn't allow multiple operations on the same substring.
 *
 * @param a - First string
 * @param b - Second string
 * @param options - Optional configuration (maxDistance for early termination)
 * @returns The edit distance between the strings (or maxDistance + 1 if exceeded)
 *
 * @example
 * damerauLevenshtein('cat', 'cat')  // 0 (identical)
 * damerauLevenshtein('cat', 'car')  // 1 (substitution: t -> r)
 * damerauLevenshtein('cat', 'cart') // 1 (insertion: r)
 * damerauLevenshtein('cat', 'at')   // 1 (deletion: c)
 * damerauLevenshtein('cat', 'act')  // 1 (transposition: ca -> ac)
 */
export function damerauLevenshtein(
  a: string,
  b: string,
  options: DistanceOptions = {},
): number {
  const { maxDistance } = options;

  // Handle edge cases
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Early termination if length difference exceeds maxDistance
  if (maxDistance !== undefined) {
    const lengthDiff = Math.abs(a.length - b.length);
    if (lengthDiff > maxDistance) {
      return maxDistance + 1;
    }
  }

  const lenA = a.length;
  const lenB = b.length;

  // Create the distance matrix
  // Using a 2D array for clarity; could be optimized to use two rows
  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [];
    matrix[i][0] = i;
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= lenA; i++) {
    let rowMin = Infinity;

    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      // Standard Levenshtein operations
      const deletion = matrix[i - 1][j] + 1;
      const insertion = matrix[i][j - 1] + 1;
      const substitution = matrix[i - 1][j - 1] + cost;

      let minCost = Math.min(deletion, insertion, substitution);

      // Damerau extension: check for transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        const transposition = matrix[i - 2][j - 2] + cost;
        minCost = Math.min(minCost, transposition);
      }

      matrix[i][j] = minCost;
      rowMin = Math.min(rowMin, minCost);
    }

    // Early termination: if the minimum in this row exceeds maxDistance,
    // we can stop early since distances can only increase
    if (maxDistance !== undefined && rowMin > maxDistance) {
      return maxDistance + 1;
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Checks if two strings are within the acceptable edit distance.
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum allowed edit distance
 * @returns True if the strings are within the specified distance
 */
export function isWithinDistance(
  a: string,
  b: string,
  maxDistance: number,
): boolean {
  return damerauLevenshtein(a, b, { maxDistance }) <= maxDistance;
}
