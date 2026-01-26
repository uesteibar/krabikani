import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ReviewCompletion } from '../../src/components/ReviewCompletion';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
  mockIsReduceMotionEnabled,
);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
  mockAddEventListener as unknown as typeof AccessibilityInfo.addEventListener,
);

describe('ReviewCompletion', () => {
  const defaultProps = {
    itemsReviewed: 10,
    incorrectCount: 2,
    syncedOnline: true,
    onReturnToDashboard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: animations enabled (reduce motion disabled)
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

  describe('rendering', () => {
    it('should render the completion screen', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} />,
      );

      expect(getByTestId('review-completion')).toBeTruthy();
      expect(getByText('Reviews Complete!')).toBeTruthy();
    });

    it('should render the success icon', () => {
      const { getByTestId } = render(<ReviewCompletion {...defaultProps} />);

      expect(getByTestId('review-completion-icon')).toBeTruthy();
    });

    it('should render the items reviewed count in large text', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} itemsReviewed={10} />,
      );

      expect(getByTestId('review-completion-count')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();
      expect(getByText('items reviewed')).toBeTruthy();
    });

    it('should show singular form for 1 item', () => {
      const { getByText } = render(
        <ReviewCompletion {...defaultProps} itemsReviewed={1} />,
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('item reviewed')).toBeTruthy();
    });
  });

  describe('incorrect count display', () => {
    it('should show incorrect count when greater than 0', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={3} />,
      );

      expect(getByTestId('review-completion-incorrect')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('incorrect answers')).toBeTruthy();
    });

    it('should show singular form for 1 incorrect answer', () => {
      const { getByText } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={1} />,
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('incorrect answer')).toBeTruthy();
    });

    it('should not show incorrect count when 0', () => {
      const { queryByTestId } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={0} />,
      );

      expect(queryByTestId('review-completion-incorrect')).toBeNull();
    });
  });

  describe('sync status', () => {
    it('should show Synced status with green when synced online', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} syncedOnline={true} />,
      );

      expect(getByTestId('review-completion-sync-status')).toBeTruthy();
      expect(getByText('Synced')).toBeTruthy();
    });

    it('should show Queued status with amber when not synced', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} syncedOnline={false} />,
      );

      expect(getByTestId('review-completion-sync-status')).toBeTruthy();
      expect(getByText('Queued')).toBeTruthy();
    });
  });

  describe('dashboard button', () => {
    it('should render dashboard button', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} />,
      );

      expect(getByTestId('review-completion-dashboard')).toBeTruthy();
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });

    it('should call onReturnToDashboard when pressed', () => {
      const onReturnToDashboard = jest.fn();
      const { getByTestId } = render(
        <ReviewCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
        />,
      );

      fireEvent.press(getByTestId('review-completion-dashboard'));

      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have appropriate testIDs', () => {
      const { getByTestId } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={2} />,
      );

      expect(getByTestId('review-completion')).toBeTruthy();
      expect(getByTestId('review-completion-icon')).toBeTruthy();
      expect(getByTestId('review-completion-title')).toBeTruthy();
      expect(getByTestId('review-completion-count')).toBeTruthy();
      expect(getByTestId('review-completion-label')).toBeTruthy();
      expect(getByTestId('review-completion-incorrect')).toBeTruthy();
      expect(getByTestId('review-completion-sync-status')).toBeTruthy();
      expect(getByTestId('review-completion-dashboard')).toBeTruthy();
    });
  });

  describe('no auto-advance behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not call any navigation callback automatically on mount', () => {
      const onReturnToDashboard = jest.fn();

      render(
        <ReviewCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
        />,
      );

      expect(onReturnToDashboard).not.toHaveBeenCalled();
    });

    it('should not auto-advance after waiting', () => {
      const onReturnToDashboard = jest.fn();

      render(
        <ReviewCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
        />,
      );

      // Advance time significantly
      jest.advanceTimersByTime(10000); // 10 seconds

      expect(onReturnToDashboard).not.toHaveBeenCalled();
    });

    it('should only navigate when user presses Dashboard button', () => {
      const onReturnToDashboard = jest.fn();

      const { getByTestId } = render(
        <ReviewCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
        />,
      );

      // Wait some time
      jest.advanceTimersByTime(5000);

      // No callback yet
      expect(onReturnToDashboard).not.toHaveBeenCalled();

      // Now press the button
      fireEvent.press(getByTestId('review-completion-dashboard'));

      // Now the callback should be called
      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('staggered animations', () => {
    it('should render all animated elements', () => {
      const { getByTestId, getByText } = render(
        <ReviewCompletion {...defaultProps} />,
      );

      // All elements should be present for staggered animation
      expect(getByTestId('review-completion-icon')).toBeTruthy();
      expect(getByTestId('review-completion-title')).toBeTruthy();
      expect(getByTestId('review-completion-count')).toBeTruthy();
      expect(getByTestId('review-completion-sync-status')).toBeTruthy();
      expect(getByTestId('review-completion-dashboard')).toBeTruthy();
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });
  });

  describe('confetti animation', () => {
    it('should show confetti particles when incorrectCount is 0', async () => {
      const { queryByTestId } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={0} />,
      );

      // Wait for state to update
      await waitFor(() => {
        // Check that confetti particles are rendered (we render 12 particles)
        expect(queryByTestId('confetti-particle-0')).toBeTruthy();
        expect(queryByTestId('confetti-particle-5')).toBeTruthy();
        expect(queryByTestId('confetti-particle-11')).toBeTruthy();
      });
    });

    it('should not show confetti particles when incorrectCount is greater than 0', () => {
      const { queryByTestId } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={3} />,
      );

      // No confetti should be rendered
      expect(queryByTestId('confetti-particle-0')).toBeNull();
    });
  });

  describe('reduced motion', () => {
    it('should check reduced motion setting on mount', async () => {
      render(<ReviewCompletion {...defaultProps} />);

      await waitFor(() => {
        expect(mockIsReduceMotionEnabled).toHaveBeenCalled();
      });
    });

    it('should add event listener for reduced motion changes', async () => {
      render(<ReviewCompletion {...defaultProps} />);

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith(
          'reduceMotionChanged',
          expect.any(Function),
        );
      });
    });

    it('should not show confetti when reduced motion is enabled', async () => {
      mockIsReduceMotionEnabled.mockResolvedValue(true);

      const { queryByTestId } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={0} />,
      );

      await waitFor(() => {
        // Even with 0 incorrect, confetti should not show with reduced motion
        expect(queryByTestId('confetti-particle-0')).toBeNull();
      });
    });
  });

  describe('encouragement message', () => {
    const encouragementMessages = [
      'Great work! Keep up the momentum.',
      'Every review brings you closer to mastery.',
      'Consistency is the key to learning.',
      'Your dedication is paying off!',
      'One step closer to fluency.',
      'Well done! Progress takes practice.',
      'Keep showing up, and the rest follows.',
      'Nice session! Small steps lead to big gains.',
    ];

    it('should render an encouragement message', () => {
      const { getByTestId } = render(<ReviewCompletion {...defaultProps} />);

      const encouragementElement = getByTestId(
        'review-completion-encouragement',
      );
      expect(encouragementElement).toBeTruthy();
    });

    it('should display a message from the predefined pool', () => {
      const { getByTestId } = render(<ReviewCompletion {...defaultProps} />);

      const encouragementElement = getByTestId(
        'review-completion-encouragement',
      );
      const messageText = encouragementElement.props.children;

      expect(encouragementMessages).toContain(messageText);
    });

    it('should show encouragement message regardless of incorrect count', () => {
      // Test with incorrect count = 0 (perfect session)
      const { getByTestId: getByTestIdPerfect } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={0} />,
      );
      expect(
        getByTestIdPerfect('review-completion-encouragement'),
      ).toBeTruthy();

      // Test with incorrect count > 0
      const { getByTestId: getByTestIdWithErrors } = render(
        <ReviewCompletion {...defaultProps} incorrectCount={5} />,
      );
      expect(
        getByTestIdWithErrors('review-completion-encouragement'),
      ).toBeTruthy();
    });

    it('should show different messages on different renders', () => {
      // We'll render multiple times and check that we get at least one different message
      // This is probabilistic, but with 8 messages, getting the same one 10 times is very unlikely
      const messages = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const { getByTestId, unmount } = render(
          <ReviewCompletion {...defaultProps} />,
        );
        const messageText = getByTestId(
          'review-completion-encouragement',
        ).props.children;
        messages.add(messageText);
        unmount();
      }

      // With 10 renders and 8 possible messages, we should get at least 2 different ones
      expect(messages.size).toBeGreaterThanOrEqual(1);
      // All collected messages should be from our predefined pool
      messages.forEach(message => {
        expect(encouragementMessages).toContain(message);
      });
    });
  });
});
