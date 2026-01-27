import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { LessonCompletion } from '../../src/components/LessonCompletion';

// Mock AccessibilityInfo
const mockIsReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
const mockAddEventListener = jest.fn(() => ({ remove: jest.fn() }));

jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
  mockIsReduceMotionEnabled,
);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
  mockAddEventListener as unknown as typeof AccessibilityInfo.addEventListener,
);

describe('LessonCompletion', () => {
  const defaultProps = {
    itemsLearned: 5,
    syncedOnline: true,
    moreLessonsAvailable: 10,
    onReturnToDashboard: jest.fn(),
    onContinueLessons: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

  describe('rendering', () => {
    it('should render the completion title', () => {
      const { getByTestId, getByText } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(getByTestId('lesson-completion')).toBeTruthy();
      expect(getByText('Lessons Complete!')).toBeTruthy();
    });

    it('should render the success icon', () => {
      const { getByTestId } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(getByTestId('lesson-completion-icon')).toBeTruthy();
    });

    it('should render the items learned count', () => {
      const { getByTestId, getByText } = render(
        <LessonCompletion {...defaultProps} itemsLearned={5} />,
      );

      expect(getByTestId('lesson-completion-count')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('items learned')).toBeTruthy();
    });

    it('should show singular form for 1 item', () => {
      const { getByText } = render(
        <LessonCompletion {...defaultProps} itemsLearned={1} />,
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('item learned')).toBeTruthy();
    });

    it('should render sync status for online sync', () => {
      const { getByText } = render(
        <LessonCompletion {...defaultProps} syncedOnline={true} />,
      );

      expect(getByText('Synced')).toBeTruthy();
    });

    it('should render sync status for offline queue', () => {
      const { getByText } = render(
        <LessonCompletion {...defaultProps} syncedOnline={false} />,
      );

      expect(getByText('Queued')).toBeTruthy();
    });
  });

  describe('continue button', () => {
    it('should render continue button when more lessons available', () => {
      const { getByTestId, getByText } = render(
        <LessonCompletion {...defaultProps} moreLessonsAvailable={10} />,
      );

      expect(getByTestId('lesson-completion-continue')).toBeTruthy();
      expect(getByText('Continue (10 more)')).toBeTruthy();
    });

    it('should not render continue button when no more lessons', () => {
      const { queryByTestId } = render(
        <LessonCompletion {...defaultProps} moreLessonsAvailable={0} />,
      );

      expect(queryByTestId('lesson-completion-continue')).toBeNull();
    });

    it('should not render continue button when onContinueLessons is undefined', () => {
      const { queryByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          moreLessonsAvailable={10}
          onContinueLessons={undefined}
        />,
      );

      expect(queryByTestId('lesson-completion-continue')).toBeNull();
    });

    it('should call onContinueLessons when continue button is pressed', () => {
      const onContinueLessons = jest.fn();
      const { getByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          onContinueLessons={onContinueLessons}
        />,
      );

      fireEvent.press(getByTestId('lesson-completion-continue'));

      expect(onContinueLessons).toHaveBeenCalledTimes(1);
    });
  });

  describe('dashboard button', () => {
    it('should render dashboard button', () => {
      const { getByTestId, getByText } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(getByTestId('lesson-completion-dashboard')).toBeTruthy();
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });

    it('should call onReturnToDashboard when dashboard button is pressed', () => {
      const onReturnToDashboard = jest.fn();
      const { getByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
        />,
      );

      fireEvent.press(getByTestId('lesson-completion-dashboard'));

      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
    });

    it('should render dashboard button even without continue option', () => {
      const { getByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          moreLessonsAvailable={0}
          onContinueLessons={undefined}
        />,
      );

      expect(getByTestId('lesson-completion-dashboard')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have appropriate testIDs', () => {
      const { getByTestId } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(getByTestId('lesson-completion')).toBeTruthy();
      expect(getByTestId('lesson-completion-icon')).toBeTruthy();
      expect(getByTestId('lesson-completion-title')).toBeTruthy();
      expect(getByTestId('lesson-completion-count')).toBeTruthy();
      expect(getByTestId('lesson-completion-label')).toBeTruthy();
      expect(getByTestId('lesson-completion-sync-status')).toBeTruthy();
      expect(getByTestId('lesson-completion-dashboard')).toBeTruthy();
    });
  });

  describe('no auto-advance behavior (regression)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not call any navigation callback automatically on mount', () => {
      const onReturnToDashboard = jest.fn();
      const onContinueLessons = jest.fn();

      render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      expect(onReturnToDashboard).not.toHaveBeenCalled();
      expect(onContinueLessons).not.toHaveBeenCalled();
    });

    it('should not auto-advance after waiting (no timers or effects trigger navigation)', () => {
      const onReturnToDashboard = jest.fn();
      const onContinueLessons = jest.fn();

      render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      jest.advanceTimersByTime(10000);

      expect(onReturnToDashboard).not.toHaveBeenCalled();
      expect(onContinueLessons).not.toHaveBeenCalled();
    });

    it('should remain visible until user explicitly presses a button', () => {
      const onReturnToDashboard = jest.fn();
      const onContinueLessons = jest.fn();

      const { getByTestId, rerender } = render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      expect(getByTestId('lesson-completion')).toBeTruthy();

      jest.advanceTimersByTime(60000);

      rerender(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      expect(getByTestId('lesson-completion')).toBeTruthy();
      expect(onReturnToDashboard).not.toHaveBeenCalled();
      expect(onContinueLessons).not.toHaveBeenCalled();
    });

    it('should only navigate when user presses Continue button', () => {
      const onReturnToDashboard = jest.fn();
      const onContinueLessons = jest.fn();

      const { getByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      jest.advanceTimersByTime(5000);
      expect(onContinueLessons).not.toHaveBeenCalled();

      fireEvent.press(getByTestId('lesson-completion-continue'));

      expect(onContinueLessons).toHaveBeenCalledTimes(1);
      expect(onReturnToDashboard).not.toHaveBeenCalled();
    });

    it('should only navigate when user presses Dashboard button', () => {
      const onReturnToDashboard = jest.fn();
      const onContinueLessons = jest.fn();

      const { getByTestId } = render(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      jest.advanceTimersByTime(5000);
      expect(onReturnToDashboard).not.toHaveBeenCalled();

      fireEvent.press(getByTestId('lesson-completion-dashboard'));

      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
      expect(onContinueLessons).not.toHaveBeenCalled();
    });
  });

  describe('staggered animations', () => {
    it('should render all animated elements', () => {
      const { getByTestId, getByText } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(getByTestId('lesson-completion-icon')).toBeTruthy();
      expect(getByTestId('lesson-completion-title')).toBeTruthy();
      expect(getByTestId('lesson-completion-count')).toBeTruthy();
      expect(getByTestId('lesson-completion-sync-status')).toBeTruthy();
      expect(getByTestId('lesson-completion-dashboard')).toBeTruthy();
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });
  });

  describe('confetti animation', () => {
    it('should show confetti particles when perfectQuiz is true', async () => {
      const { queryByTestId } = render(
        <LessonCompletion {...defaultProps} perfectQuiz={true} />,
      );

      await waitFor(() => {
        expect(queryByTestId('confetti-particle-0')).toBeTruthy();
        expect(queryByTestId('confetti-particle-5')).toBeTruthy();
        expect(queryByTestId('confetti-particle-11')).toBeTruthy();
      });
    });

    it('should not show confetti particles when perfectQuiz is false', () => {
      const { queryByTestId } = render(
        <LessonCompletion {...defaultProps} perfectQuiz={false} />,
      );

      expect(queryByTestId('confetti-particle-0')).toBeNull();
    });

    it('should not show confetti particles by default (perfectQuiz not passed)', () => {
      const { queryByTestId } = render(
        <LessonCompletion {...defaultProps} />,
      );

      expect(queryByTestId('confetti-particle-0')).toBeNull();
    });
  });

  describe('reduced motion', () => {
    it('should check reduced motion setting on mount', async () => {
      render(<LessonCompletion {...defaultProps} />);

      await waitFor(() => {
        expect(mockIsReduceMotionEnabled).toHaveBeenCalled();
      });
    });

    it('should add event listener for reduced motion changes', async () => {
      render(<LessonCompletion {...defaultProps} />);

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
        <LessonCompletion {...defaultProps} perfectQuiz={true} />,
      );

      await waitFor(() => {
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
      const { getByTestId } = render(<LessonCompletion {...defaultProps} />);

      const encouragementElement = getByTestId(
        'lesson-completion-encouragement',
      );
      expect(encouragementElement).toBeTruthy();
    });

    it('should display a message from the predefined pool', () => {
      const { getByTestId } = render(<LessonCompletion {...defaultProps} />);

      const encouragementElement = getByTestId(
        'lesson-completion-encouragement',
      );
      const messageText = encouragementElement.props.children;

      expect(encouragementMessages).toContain(messageText);
    });
  });
});
