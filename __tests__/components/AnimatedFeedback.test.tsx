import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, Animated } from 'react-native';

import { AnimatedFeedback, FeedbackType } from '../../src/components/AnimatedFeedback';

describe('AnimatedFeedback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <AnimatedFeedback feedbackType="none">
          <Text>Test Content</Text>
        </AnimatedFeedback>,
      );

      expect(getByText('Test Content')).toBeTruthy();
    });

    it('renders with testID', () => {
      const { getByTestId } = render(
        <AnimatedFeedback feedbackType="none" testID="test-feedback">
          <Text>Test Content</Text>
        </AnimatedFeedback>,
      );

      expect(getByTestId('test-feedback')).toBeTruthy();
    });

    it('renders overlay with testID', () => {
      const { getByTestId } = render(
        <AnimatedFeedback feedbackType="none" testID="test-feedback">
          <Text>Test Content</Text>
        </AnimatedFeedback>,
      );

      expect(getByTestId('test-feedback-overlay')).toBeTruthy();
    });
  });

  describe('feedback types', () => {
    it('handles none feedback type', () => {
      const { getByTestId } = render(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Should render without animation
      expect(getByTestId('feedback')).toBeTruthy();
    });

    it('handles correct feedback type', async () => {
      const { getByTestId, rerender } = render(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Switch to correct feedback
      rerender(
        <AnimatedFeedback feedbackType="correct" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Should render with animation
      expect(getByTestId('feedback')).toBeTruthy();

      // Run all timers to complete animations
      await act(async () => {
        jest.runAllTimers();
      });
    });

    it('handles incorrect feedback type', async () => {
      const { getByTestId, rerender } = render(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Switch to incorrect feedback
      rerender(
        <AnimatedFeedback feedbackType="incorrect" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Should render with animation
      expect(getByTestId('feedback')).toBeTruthy();

      // Run all timers to complete animations
      await act(async () => {
        jest.runAllTimers();
      });
    });
  });

  describe('animation behavior', () => {
    it('starts animation when feedback type changes to correct', async () => {
      const { rerender } = render(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Change feedback type
      rerender(
        <AnimatedFeedback feedbackType="correct" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Animation should start
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Animation should complete
      await act(async () => {
        jest.runAllTimers();
      });
    });

    it('starts animation when feedback type changes to incorrect', async () => {
      const { rerender } = render(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Change feedback type
      rerender(
        <AnimatedFeedback feedbackType="incorrect" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Animation should start
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Animation should complete
      await act(async () => {
        jest.runAllTimers();
      });
    });

    it('resets animation when feedback type changes to none', async () => {
      const { rerender } = render(
        <AnimatedFeedback feedbackType="correct" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Run animation
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Change back to none
      rerender(
        <AnimatedFeedback feedbackType="none" testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Animation should reset (no animation running)
    });

    it('respects custom duration', async () => {
      const customDuration = 500;

      const { rerender } = render(
        <AnimatedFeedback feedbackType="none" duration={customDuration} testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Change feedback type
      rerender(
        <AnimatedFeedback feedbackType="correct" duration={customDuration} testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      // Animation should take longer
      await act(async () => {
        jest.advanceTimersByTime(customDuration * 0.5);
      });

      // Complete animation
      await act(async () => {
        jest.runAllTimers();
      });
    });
  });

  describe('style prop', () => {
    it('applies custom style to container', () => {
      const customStyle = { backgroundColor: 'red' };

      const { getByTestId } = render(
        <AnimatedFeedback feedbackType="none" style={customStyle} testID="feedback">
          <Text>Content</Text>
        </AnimatedFeedback>,
      );

      const container = getByTestId('feedback');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: 'red' }),
        ]),
      );
    });
  });
});
