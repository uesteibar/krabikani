export type ReviewBatchSize = 10 | 25 | 50 | 'all';

export const DEFAULT_REVIEW_BATCH_SIZE: ReviewBatchSize = 10;

export function normalizeReviewBatchSize(value: unknown): ReviewBatchSize {
  if (value === 'all' || value === 'All') return 'all';
  if (value === 10 || value === 25 || value === 50) return value;
  return DEFAULT_REVIEW_BATCH_SIZE;
}

export function limitReviewBatch<T>(items: T[], batchSize: ReviewBatchSize): T[] {
  return batchSize === 'all' ? items : items.slice(0, batchSize);
}
