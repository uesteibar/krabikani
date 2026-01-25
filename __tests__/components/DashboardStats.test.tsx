import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { DashboardStats } from '../../src/components/DashboardStats';

describe('DashboardStats', () => {
  it('renders lessons count', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
    );
    expect(getByTestId('lessons-count').props.children).toBe(5);
  });

  it('renders reviews count', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={5} reviewsCount={10} />,
    );
    expect(getByTestId('reviews-count').props.children).toBe(10);
  });

  it('renders zero counts correctly', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByTestId('lessons-count').props.children).toBe(0);
    expect(getByTestId('reviews-count').props.children).toBe(0);
  });

  it('renders large counts correctly', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={150} reviewsCount={500} />,
    );
    expect(getByTestId('lessons-count').props.children).toBe(150);
    expect(getByTestId('reviews-count').props.children).toBe(500);
  });

  it('has dashboard-stats testID', () => {
    const { getByTestId } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByTestId('dashboard-stats')).toBeTruthy();
  });

  it('displays Lessons label', () => {
    const { getByText } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByText('Lessons')).toBeTruthy();
  });

  it('displays Reviews label', () => {
    const { getByText } = render(
      <DashboardStats lessonsCount={0} reviewsCount={0} />,
    );
    expect(getByText('Reviews')).toBeTruthy();
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
});
