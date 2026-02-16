import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { LearnedCounts } from '../../src/components/LearnedCounts';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { COLORS } from '../../src/theme';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
  mockIsReduceMotionEnabled,
);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
  mockAddEventListener as unknown as typeof AccessibilityInfo.addEventListener,
);

function renderWithTheme(ui: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

describe('LearnedCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: animations enabled (reduce motion disabled)
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

  describe('rendering', () => {
    it('should render the learned counts container', () => {
      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={0} vocabularyCount={0} />,
      );

      expect(getByTestId('learned-counts')).toBeTruthy();
    });

    it('should render kanji learned counter', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <LearnedCounts kanjiCount={42} vocabularyCount={0} />,
      );

      expect(getByTestId('kanji-learned')).toBeTruthy();
      expect(getByText('Kanji Learned:')).toBeTruthy();
    });

    it('should render vocabulary learned counter', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <LearnedCounts kanjiCount={0} vocabularyCount={100} />,
      );

      expect(getByTestId('vocabulary-learned')).toBeTruthy();
      expect(getByText('Vocabulary Learned:')).toBeTruthy();
    });

    it('should render both counters side by side', () => {
      const { getByTestId, getByText } = renderWithTheme(
        <LearnedCounts kanjiCount={50} vocabularyCount={200} />,
      );

      expect(getByTestId('kanji-learned')).toBeTruthy();
      expect(getByTestId('vocabulary-learned')).toBeTruthy();
      expect(getByText('Kanji Learned:')).toBeTruthy();
      expect(getByText('Vocabulary Learned:')).toBeTruthy();
    });
  });

  describe('count display', () => {
    it('should display zero counts', () => {
      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={0} vocabularyCount={0} />,
      );

      expect(getByTestId('kanji-learned-value').props.children).toBe(0);
      expect(getByTestId('vocabulary-learned-value').props.children).toBe(0);
    });

    it('should display target counts when reduced motion is enabled', async () => {
      mockIsReduceMotionEnabled.mockResolvedValue(true);

      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={42} vocabularyCount={150} />,
      );

      await waitFor(() => {
        expect(getByTestId('kanji-learned-value').props.children).toBe(42);
        expect(getByTestId('vocabulary-learned-value').props.children).toBe(
          150,
        );
      });
    });

    it('should eventually display target counts after animation', async () => {
      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={10} vocabularyCount={20} />,
      );

      // Animation runs over 500ms, but with mocked timers we should see the end result
      await waitFor(
        () => {
          expect(getByTestId('kanji-learned-value').props.children).toBe(10);
          expect(getByTestId('vocabulary-learned-value').props.children).toBe(
            20,
          );
        },
        { timeout: 1000 },
      );
    });
  });

  describe('accessibility', () => {
    it('should check for reduced motion setting on mount', () => {
      renderWithTheme(<LearnedCounts kanjiCount={0} vocabularyCount={0} />);

      expect(mockIsReduceMotionEnabled).toHaveBeenCalled();
    });

    it('should subscribe to reduced motion changes', () => {
      renderWithTheme(<LearnedCounts kanjiCount={0} vocabularyCount={0} />);

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function),
      );
    });

    it('should clean up event listener on unmount', () => {
      const mockRemove = jest.fn();
      mockAddEventListener.mockReturnValue({ remove: mockRemove });

      const { unmount } = renderWithTheme(
        <LearnedCounts kanjiCount={0} vocabularyCount={0} />,
      );

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should skip animation when reduced motion is enabled', async () => {
      mockIsReduceMotionEnabled.mockResolvedValue(true);

      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={100} vocabularyCount={200} />,
      );

      // With reduced motion, should immediately show target values
      await waitFor(() => {
        expect(getByTestId('kanji-learned-value').props.children).toBe(100);
        expect(getByTestId('vocabulary-learned-value').props.children).toBe(
          200,
        );
      });
    });
  });

  describe('theme-aware styling', () => {
    it('uses light theme background color in light mode', () => {
      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={10} vocabularyCount={20} />,
        'light',
      );
      const kanjiCounter = getByTestId('kanji-learned');
      const countBadge = kanjiCounter.children[0] as any;
      const flattenedStyle = Array.isArray(countBadge.props.style)
        ? Object.assign({}, ...countBadge.props.style.flat())
        : countBadge.props.style;
      expect(flattenedStyle.backgroundColor).toBe(COLORS.background.secondary);
    });

    it('uses dark theme background color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <LearnedCounts kanjiCount={10} vocabularyCount={20} />,
        'dark',
      );
      const kanjiCounter = getByTestId('kanji-learned');
      const countBadge = kanjiCounter.children[0] as any;
      const flattenedStyle = Array.isArray(countBadge.props.style)
        ? Object.assign({}, ...countBadge.props.style.flat())
        : countBadge.props.style;
      expect(flattenedStyle.backgroundColor).toBe('#1E1E1E');
    });
  });

  describe('count updates', () => {
    it('should handle count changes', async () => {
      mockIsReduceMotionEnabled.mockResolvedValue(true);

      const { getByTestId, rerender } = renderWithTheme(
        <LearnedCounts kanjiCount={0} vocabularyCount={0} />,
      );

      await waitFor(() => {
        expect(getByTestId('kanji-learned-value').props.children).toBe(0);
      });

      // Update counts
      rerender(
        <ThemeProvider forcedColorScheme="light">
          <LearnedCounts kanjiCount={50} vocabularyCount={100} />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('kanji-learned-value').props.children).toBe(50);
        expect(getByTestId('vocabulary-learned-value').props.children).toBe(
          100,
        );
      });
    });
  });
});
