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
});
