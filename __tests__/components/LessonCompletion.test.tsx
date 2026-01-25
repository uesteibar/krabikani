import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { LessonCompletion } from '../../src/components/LessonCompletion';

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

      expect(getByText('Synced with WaniKani')).toBeTruthy();
    });

    it('should render sync status for offline queue', () => {
      const { getByText } = render(
        <LessonCompletion {...defaultProps} syncedOnline={false} />,
      );

      expect(getByText('Queued for sync when online')).toBeTruthy();
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

      // No callbacks should be called on mount
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

      // Advance time significantly - simulating user waiting on the screen
      jest.advanceTimersByTime(10000); // 10 seconds

      // Still no callbacks should be called
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

      // Verify screen is visible
      expect(getByTestId('lesson-completion')).toBeTruthy();

      // Wait a long time
      jest.advanceTimersByTime(60000); // 1 minute

      // Re-render to ensure no state changes occurred
      rerender(
        <LessonCompletion
          {...defaultProps}
          onReturnToDashboard={onReturnToDashboard}
          onContinueLessons={onContinueLessons}
        />,
      );

      // Screen should still be visible
      expect(getByTestId('lesson-completion')).toBeTruthy();

      // No auto-navigation
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

      // Wait some time
      jest.advanceTimersByTime(5000);

      // No callbacks yet
      expect(onContinueLessons).not.toHaveBeenCalled();

      // Now press the button
      fireEvent.press(getByTestId('lesson-completion-continue'));

      // Only now should the callback be called
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

      // Wait some time
      jest.advanceTimersByTime(5000);

      // No callbacks yet
      expect(onReturnToDashboard).not.toHaveBeenCalled();

      // Now press the button
      fireEvent.press(getByTestId('lesson-completion-dashboard'));

      // Only now should the callback be called
      expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
      expect(onContinueLessons).not.toHaveBeenCalled();
    });
  });
});
