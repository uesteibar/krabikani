import React from 'react';
import { render } from '@testing-library/react-native';

import { UpcomingReviewsChart } from '../../src/components/UpcomingReviewsChart';
import type { UpcomingReviewsHourBucket } from '../../src/storage';

// Helper to create test data (starts from next hour, matching getUpcomingReviewsByHour)
function createTestData(counts: number[]): UpcomingReviewsHourBucket[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);

  return counts.map((count, index) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() + 1 + index);
    return { hour, count };
  });
}

describe('UpcomingReviewsChart', () => {
  describe('rendering', () => {
    it('should render the container', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('upcoming-reviews-chart')).toBeTruthy();
    });

    it('should render the title', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      expect(getByText('Upcoming Reviews')).toBeTruthy();
    });

    it('should render 12 rows', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Check all 12 rows are rendered
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`review-row-${i}`)).toBeTruthy();
      }
    });
  });

  describe('grid display', () => {
    it('should show new count with + prefix for rows with reviews', () => {
      const data = createTestData([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      // Should show "+5"
      expect(getByText('+5')).toBeTruthy();
    });

    it('should show cumulative total in parentheses', () => {
      const data = createTestData([5, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      // First row: +5 (5)
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('(5)')).toBeTruthy();
      // Second row: +10 (15)
      expect(getByText('+10')).toBeTruthy();
      expect(getByText('(15)')).toBeTruthy();
    });

    it('should show dash for rows with no new reviews', () => {
      const data = createTestData([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getAllByText } = render(<UpcomingReviewsChart data={data} />);

      // Should have dashes for rows without new reviews
      const dashes = getAllByText('-');
      expect(dashes.length).toBe(11); // 11 rows with 0 reviews
    });
  });

  describe('cumulative totals', () => {
    it('should calculate cumulative totals correctly', () => {
      const data = createTestData([5, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      // Row 0: +5 (5)
      expect(getByText('(5)')).toBeTruthy();
      // Row 1: +10 (15)
      expect(getByText('(15)')).toBeTruthy();
      // Row 2: +5 (20)
      expect(getByText('(20)')).toBeTruthy();
    });

    it('should handle scattered non-zero values', () => {
      const data = createTestData([0, 5, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      // Row 1: +5 (5)
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('(5)')).toBeTruthy();
      // Row 3: +10 (15)
      expect(getByText('+10')).toBeTruthy();
      expect(getByText('(15)')).toBeTruthy();
    });

    it('should include currentPendingCount in cumulative totals', () => {
      const data = createTestData([5, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(
        <UpcomingReviewsChart data={data} currentPendingCount={10} />,
      );

      // With 10 pending, first row: +5 (15) - 10 pending + 5 new = 15
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('(15)')).toBeTruthy();
      // Second row: +10 (25) - 10 pending + 5 + 10 = 25
      expect(getByText('+10')).toBeTruthy();
      expect(getByText('(25)')).toBeTruthy();
    });

    it('should work with zero currentPendingCount (default behavior)', () => {
      const data = createTestData([5, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(
        <UpcomingReviewsChart data={data} currentPendingCount={0} />,
      );

      // Same as without prop - first row: +5 (5)
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('(5)')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should show empty state when all counts are zero', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} />,
      );

      expect(getByTestId('upcoming-reviews-chart')).toBeTruthy();
      expect(getByText('All caught up!')).toBeTruthy();
      expect(getByText('No reviews in the next 12 hours')).toBeTruthy();
    });

    it('should show next review time in empty state when provided', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const nextReviewAt = new Date();
      nextReviewAt.setTime(nextReviewAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByTestId('next-review-time')).toBeTruthy();
      expect(getByText(/Next review in \d+ days/)).toBeTruthy();
    });

    it('should show hours in empty state when less than 24 hours', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const nextReviewAt = new Date();
      nextReviewAt.setTime(nextReviewAt.getTime() + 15 * 60 * 60 * 1000);

      const { getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByText(/Next review in \d+ hours/)).toBeTruthy();
    });

    it('should show minutes in empty state when less than 1 hour', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const nextReviewAt = new Date();
      nextReviewAt.setTime(nextReviewAt.getTime() + 30 * 60 * 1000);

      const { getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByText(/Next review in \d+ minutes/)).toBeTruthy();
    });

    it('should not show next review time when not provided', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { queryByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(queryByTestId('next-review-time')).toBeNull();
    });

    it('should show celebration emoji in empty state', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      expect(getByText('🎉')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data array', () => {
      const data: UpcomingReviewsHourBucket[] = [];

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} />,
      );

      expect(getByTestId('upcoming-reviews-chart')).toBeTruthy();
      expect(getByText('Upcoming Reviews')).toBeTruthy();
    });

    it('should handle data with fewer than 12 items', () => {
      const data = createTestData([5, 10, 3]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('review-row-0')).toBeTruthy();
      expect(getByTestId('review-row-1')).toBeTruthy();
      expect(getByTestId('review-row-2')).toBeTruthy();
    });

    it('should handle very large counts', () => {
      const data = createTestData([
        1000, 500, 250, 100, 50, 25, 10, 5, 2, 1, 0, 0,
      ]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      expect(getByText('+1000')).toBeTruthy();
      expect(getByText('(1000)')).toBeTruthy();
    });
  });
});
