import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ReviewCompletion } from '../../src/components/ReviewCompletion';

describe('ReviewCompletion', () => {
  const defaultProps = {
    itemsReviewed: 10,
    incorrectCount: 2,
    syncedOnline: true,
    onReturnToDashboard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
