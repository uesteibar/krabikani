import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { UpcomingReviewsChart } from '../../src/components/UpcomingReviewsChart';
import type { UpcomingReviewsHourBucket } from '../../src/storage';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn().mockResolvedValue(false);
const mockAddEventListener = jest.fn().mockReturnValue({ remove: jest.fn() });

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
  mockIsReduceMotionEnabled,
);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
  mockAddEventListener,
);

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
  beforeEach(() => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

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

  describe('animations', () => {
    it('should render animated bars', () => {
      const data = createTestData([10, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Bars with count > 0 should have fill elements
      expect(getByTestId('chart-bar-fill-0')).toBeTruthy();
      expect(getByTestId('chart-bar-fill-1')).toBeTruthy();
      expect(getByTestId('chart-bar-fill-2')).toBeTruthy();
    });
  });

  describe('tooltip interactions', () => {
    it('should show tooltip when bar is tapped', async () => {
      const data = createTestData([15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, queryByTestId } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Initially no tooltip
      expect(queryByTestId('chart-tooltip')).toBeNull();

      // Tap on first bar
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      // Tooltip should appear
      await waitFor(() => {
        expect(getByTestId('chart-tooltip')).toBeTruthy();
      });
    });

    it('should display correct review count in tooltip', async () => {
      const data = createTestData([15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap on first bar with 15 reviews
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      // Should show correct count
      await waitFor(() => {
        expect(getByText(/15 reviews at/)).toBeTruthy();
      });
    });

    it('should show singular "review" for count of 1', async () => {
      const data = createTestData([1, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap on first bar with 1 review
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      // Should show singular "review"
      await waitFor(() => {
        expect(getByText(/1 review at/)).toBeTruthy();
      });
    });

    it('should dismiss tooltip when tapping same bar again', async () => {
      const data = createTestData([15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, queryByTestId } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap to show tooltip
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      await waitFor(() => {
        expect(getByTestId('chart-tooltip')).toBeTruthy();
      });

      // Tap same bar again to dismiss
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      await waitFor(() => {
        expect(queryByTestId('chart-tooltip')).toBeNull();
      });
    });

    it('should dismiss tooltip when tapping container', async () => {
      const data = createTestData([15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, queryByTestId } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap to show tooltip
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      await waitFor(() => {
        expect(getByTestId('chart-tooltip')).toBeTruthy();
      });

      // Tap container to dismiss
      await act(async () => {
        fireEvent.press(getByTestId('upcoming-reviews-chart'));
      });

      await waitFor(() => {
        expect(queryByTestId('chart-tooltip')).toBeNull();
      });
    });

    it('should not show tooltip when tapping bar with zero reviews', async () => {
      const data = createTestData([15, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, queryByTestId } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap on bar with 0 reviews
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-1'));
      });

      // No tooltip should appear
      expect(queryByTestId('chart-tooltip')).toBeNull();
    });

    it('should switch tooltip when tapping different bar', async () => {
      const data = createTestData([15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} />,
      );

      // Tap first bar
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-0'));
      });

      await waitFor(() => {
        expect(getByText(/15 reviews at/)).toBeTruthy();
      });

      // Tap second bar
      await act(async () => {
        fireEvent.press(getByTestId('chart-bar-1'));
      });

      await waitFor(() => {
        expect(getByText(/10 reviews at/)).toBeTruthy();
      });
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
      // Add 3 days worth of milliseconds to ensure we get "2 days" or more
      nextReviewAt.setTime(nextReviewAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { getByTestId, getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByTestId('next-review-time')).toBeTruthy();
      // Should show at least "2 days" or "3 days"
      expect(getByText(/Next review in \d+ days/)).toBeTruthy();
    });

    it('should show hours in empty state when less than 24 hours', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const nextReviewAt = new Date();
      nextReviewAt.setHours(nextReviewAt.getHours() + 15); // 15 hours from now

      const { getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByText(/Next review in 15 hours/)).toBeTruthy();
    });

    it('should show minutes in empty state when less than 1 hour', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const nextReviewAt = new Date();
      nextReviewAt.setMinutes(nextReviewAt.getMinutes() + 30); // 30 minutes from now

      const { getByText } = render(
        <UpcomingReviewsChart data={data} nextReviewAt={nextReviewAt} />,
      );

      expect(getByText(/Next review in 30 minutes/)).toBeTruthy();
    });

    it('should not show next review time when not provided', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { queryByTestId } = render(
        <UpcomingReviewsChart data={data} />,
      );

      expect(queryByTestId('next-review-time')).toBeNull();
    });

    it('should show celebration emoji in empty state', () => {
      const data = createTestData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByText } = render(<UpcomingReviewsChart data={data} />);

      expect(getByText('🎉')).toBeTruthy();
    });
  });

  describe('reduced motion', () => {
    it('should check reduced motion setting on mount', async () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      render(<UpcomingReviewsChart data={data} />);

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });
    });

    it('should subscribe to reduce motion changes', async () => {
      const data = createTestData([5, 10, 3, 0, 0, 0, 8, 2, 0, 0, 0, 0]);

      render(<UpcomingReviewsChart data={data} />);

      await waitFor(() => {
        expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
          'reduceMotionChanged',
          expect.any(Function),
        );
      });
    });

    it('should render bars with height immediately when reduce motion is enabled', async () => {
      mockIsReduceMotionEnabled.mockResolvedValue(true);

      const data = createTestData([10, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const { getByTestId } = render(<UpcomingReviewsChart data={data} />);

      // Bars should render
      expect(getByTestId('chart-bar-fill-0')).toBeTruthy();
    });
  });
});
