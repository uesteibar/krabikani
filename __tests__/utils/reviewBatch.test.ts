import {
  DEFAULT_REVIEW_BATCH_SIZE,
  limitReviewBatch,
  normalizeReviewBatchSize,
  type ReviewBatchSize,
} from '../../src/utils/reviewBatch';

describe('review batch settings', () => {
  it('normalizes valid and invalid values', () => {
    expect(normalizeReviewBatchSize(25)).toBe(25);
    expect(normalizeReviewBatchSize('all')).toBe('all');
    expect(normalizeReviewBatchSize('invalid')).toBe(DEFAULT_REVIEW_BATCH_SIZE);
  });

  it('limits batches while preserving all mode', () => {
    const items = Array.from({ length: 12 }, (_, index) => index + 1);
    expect(limitReviewBatch(items, 10 as ReviewBatchSize)).toHaveLength(10);
    expect(limitReviewBatch(items, 'all')).toEqual(items);
  });
});
