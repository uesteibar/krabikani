import React from 'react';
import { render } from '@testing-library/react-native';

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
});
