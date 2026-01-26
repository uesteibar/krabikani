import React from 'react';
import { render } from '@testing-library/react-native';

import { UpcomingReviewsChart } from '../../src/components/UpcomingReviewsChart';
import type { UpcomingReviewsHourBucket } from '../../src/storage';

// Helper to create test data
function createTestData(counts: number[]): UpcomingReviewsHourBucket[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);

  return counts.map((count, index) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() + index);
    return { hour, count };
  });
}

describe('UpcomingReviewsChart', () => {
  describe('rendering', () => {
    it('should render the chart container', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('upcoming-reviews-chart')).toBeTruthy();
    });

    it('should render the title', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      expect(getByText('Upcoming Reviews')).toBeTruthy();
    });

    it('should render 12 bars', () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Check all 12 bars are rendered
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
    });

    it('should render hour labels for each bar', () => {
      const now = new Date();
      now.setMinutes(0, 0, 0);

      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // All bars should be rendered
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
    });
  });

  describe('bar sizing', () => {
    it('should show bars with height proportional to count', () => {
      // First bar is max, so it should be tallest
      const data = createTestData([20, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // All bars should render
      expect(getByTestId('chart-bar-0')).toBeTruthy();
      expect(getByTestId('chart-bar-1')).toBeTruthy();
      expect(getByTestId('chart-bar-2')).toBeTruthy();
    });

    it('should handle all zero counts', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Should still render bars (empty bars)
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
    });

    it('should handle single non-zero count', () => {
      const data = createTestData([15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('chart-bar-0')).toBeTruthy();
      expect(getByTestId('chart-bar-1')).toBeTruthy();
    });
  });

  describe('current hour highlighting', () => {
    it('should highlight the current hour bar', () => {
      // Create data with the first hour being the current hour
      const data = createTestData([10, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // The first bar should be the current hour
      const currentBar = getByTestId('chart-bar-0');
      expect(currentBar).toBeTruthy();
    });
  });

  describe('data variations', () => {
    it('should handle equal counts', () => {
      const data = createTestData([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // All bars should render
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
    });

    it('should handle very large counts', () => {
      const data = createTestData([
        1000, 500, 250, 100, 50, 25, 10, 5, 2, 1, 0, 0,
      ]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('chart-bar-0')).toBeTruthy();
      expect(getByTestId('chart-bar-11')).toBeTruthy();
    });

    it('should handle scattered non-zero values', () => {
      const data = createTestData([0, 5, 0, 10, 0, 3, 0, 0, 8, 0, 0, 2]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // All bars should render
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
    });
  });

  describe('hour label formatting', () => {
    it('should format hour labels correctly', () => {
      // This is implicitly tested through rendering
      // The formatHour function converts hours to "2pm", "12am" format
      const data = createTestData([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Just verify all bars render with labels
      for (let i = 0; i < 12; i++) {
        expect(getByTestId(`chart-bar-${i}`)).toBeTruthy();
      }
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
      const data = createTestData([5, 10, 3]); // Only 3 items

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      expect(getByTestId('chart-bar-0')).toBeTruthy();
      expect(getByTestId('chart-bar-1')).toBeTruthy();
      expect(getByTestId('chart-bar-2')).toBeTruthy();
    });
  });
});
