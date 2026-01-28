import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { DashboardStats } from '../../src/components/DashboardStats';

describe('DashboardStats', () => {
  it('renders lessons count', () => {
    const { getByText } = render(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
    );
    expect(getByText(/5/)).toBeTruthy();
    expect(getByText(/available lessons/)).toBeTruthy();
  });

  it('renders reviews count', () => {
    const { getByText } = render(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
    );
    expect(getByText(/10/)).toBeTruthy();
    expect(getByText(/pending reviews/)).toBeTruthy();
  });

  it('renders zero counts correctly', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByTestId('lessons-count')).toBeTruthy();
    expect(getByTestId('reviews-count')).toBeTruthy();
  });

  it('renders large counts correctly', () => {
    const { getByText } = render(
      <DashboardStats lessonsCount={150} reviewsCount={500} />,
    );
    expect(getByText(/150/)).toBeTruthy();
    expect(getByText(/500/)).toBeTruthy();
  });

  it('has dashboard-stats testID', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByTestId('dashboard-stats')).toBeTruthy();
  });

  it('displays lessons label inside button', () => {
    const { getByText, getByTestId } = render(
      <DashboardStats lessonsCount={5} reviewsCount={0} />,
    );
    const lessonsButton = getByTestId('lessons-button');
    const lessonsLabel = getByText(/available lessons/);
    expect(lessonsButton).toBeTruthy();
    expect(lessonsLabel).toBeTruthy();
  });

  it('displays reviews label inside button', () => {
    const { getByText, getByTestId } = render(
      <DashboardStats lessonsCount={0} reviewsCount={10} />,
    );
    const reviewsButton = getByTestId('reviews-button');
    const reviewsLabel = getByText(/pending reviews/);
    expect(reviewsButton).toBeTruthy();
    expect(reviewsLabel).toBeTruthy();
  });

  describe('press handlers', () => {
    it('calls onLessonsPress when lessons button is pressed and count > 0', () => {
      const onLessonsPress = jest.fn();
      const { getByTestId } = render(
        <DashboardStats
          lessonsCount={5}
          reviewsCount={0}
          onLessonsPress={onLessonsPress}
        />,
      );

      fireEvent.press(getByTestId('lessons-button'));
      expect(onLessonsPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onLessonsPress when lessons count is 0', () => {
      const onLessonsPress = jest.fn();
      const { getByTestId } = render(
        <DashboardStats
          lessonsCount={0}
          reviewsCount={0}
          onLessonsPress={onLessonsPress}
        />,
      );

      fireEvent.press(getByTestId('lessons-button'));
      expect(onLessonsPress).not.toHaveBeenCalled();
    });

    it('calls onReviewsPress when reviews button is pressed and count > 0', () => {
      const onReviewsPress = jest.fn();
      const { getByTestId } = render(
        <DashboardStats
          lessonsCount={0}
          reviewsCount={10}
          onReviewsPress={onReviewsPress}
        />,
      );

      fireEvent.press(getByTestId('reviews-button'));
      expect(onReviewsPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onReviewsPress when reviews count is 0', () => {
      const onReviewsPress = jest.fn();
      const { getByTestId } = render(
        <DashboardStats
          lessonsCount={0}
          reviewsCount={0}
          onReviewsPress={onReviewsPress}
        />,
      );

      fireEvent.press(getByTestId('reviews-button'));
      expect(onReviewsPress).not.toHaveBeenCalled();
    });

    it('renders buttons as testIDs', () => {
      const { getByTestId } = render(
        <DashboardStats lessonsCount={0} reviewsCount={0} />,
      );

      expect(getByTestId('lessons-button')).toBeTruthy();
      expect(getByTestId('reviews-button')).toBeTruthy();
    });
  });

  describe('outlined button styling', () => {
    it('lessons button has border styling', () => {
      const { getByTestId } = render(
        <DashboardStats lessonsCount={5} reviewsCount={0} />,
      );
      const lessonsButton = getByTestId('lessons-button');
      const buttonStyle = lessonsButton.props.style;
      // Button should have borderWidth defined (outlined style)
      const flattenedStyle = Array.isArray(buttonStyle)
        ? Object.assign({}, ...buttonStyle)
        : buttonStyle;
      expect(flattenedStyle.borderWidth).toBe(2);
    });

    it('reviews button has border styling', () => {
      const { getByTestId } = render(
        <DashboardStats lessonsCount={0} reviewsCount={10} />,
      );
      const reviewsButton = getByTestId('reviews-button');
      const buttonStyle = reviewsButton.props.style;
      // Button should have borderWidth defined (outlined style)
      const flattenedStyle = Array.isArray(buttonStyle)
        ? Object.assign({}, ...buttonStyle)
        : buttonStyle;
      expect(flattenedStyle.borderWidth).toBe(2);
    });

    it('maintains minimum touch target size', () => {
      const { getByTestId } = render(
        <DashboardStats lessonsCount={5} reviewsCount={10} />,
      );
      const lessonsButton = getByTestId('lessons-button');
      const reviewsButton = getByTestId('reviews-button');

      const lessonsStyle = Array.isArray(lessonsButton.props.style)
        ? Object.assign({}, ...lessonsButton.props.style)
        : lessonsButton.props.style;
      const reviewsStyle = Array.isArray(reviewsButton.props.style)
        ? Object.assign({}, ...reviewsButton.props.style)
        : reviewsButton.props.style;

      // Should have minHeight of at least 44px (MIN_TOUCH_TARGET)
      expect(lessonsStyle.minHeight).toBeGreaterThanOrEqual(44);
      expect(reviewsStyle.minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
