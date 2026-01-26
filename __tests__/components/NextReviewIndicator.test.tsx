import React from 'react';
import { render } from '@testing-library/react-native';

import {
  NextReviewIndicator,
  formatTimeUntil,
} from '../../src/components/NextReviewIndicator';

describe('formatTimeUntil', () => {
  it('returns "now" for past dates', () => {
    const past = new Date(Date.now() - 60 * 1000);
    expect(formatTimeUntil(past)).toBe('now');
  });

  it('returns "in less than a minute" for <1 minute in future', () => {
    const soon = new Date(Date.now() + 30 * 1000);
    expect(formatTimeUntil(soon)).toBe('in less than a minute');
  });

  it('returns "in 1 minute" for 1 minute in future', () => {
    const oneMinute = new Date(Date.now() + 60 * 1000 + 500);
    expect(formatTimeUntil(oneMinute)).toBe('in 1 minute');
  });

  it('returns "in X minutes" for multiple minutes', () => {
    const fiveMinutes = new Date(Date.now() + 5 * 60 * 1000 + 500);
    expect(formatTimeUntil(fiveMinutes)).toBe('in 5 minutes');
  });

  it('returns "in 1 hour" for 1 hour in future', () => {
    const oneHour = new Date(Date.now() + 60 * 60 * 1000 + 500);
    expect(formatTimeUntil(oneHour)).toBe('in 1 hour');
  });

  it('returns "in X hours" for multiple hours', () => {
    const threeHours = new Date(Date.now() + 3 * 60 * 60 * 1000 + 500);
    expect(formatTimeUntil(threeHours)).toBe('in 3 hours');
  });

  it('returns "in 1 day" for 1 day in future', () => {
    const oneDay = new Date(Date.now() + 24 * 60 * 60 * 1000 + 500);
    expect(formatTimeUntil(oneDay)).toBe('in 1 day');
  });

  it('returns "in X days" for multiple days', () => {
    const fiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 500);
    expect(formatTimeUntil(fiveDays)).toBe('in 5 days');
  });

  it('handles edge case at 59 minutes', () => {
    const fiftyNineMinutes = new Date(Date.now() + 59 * 60 * 1000 + 500);
    expect(formatTimeUntil(fiftyNineMinutes)).toBe('in 59 minutes');
  });

  it('handles edge case at 23 hours', () => {
    const twentyThreeHours = new Date(Date.now() + 23 * 60 * 60 * 1000 + 500);
    expect(formatTimeUntil(twentyThreeHours)).toBe('in 23 hours');
  });
});

describe('NextReviewIndicator', () => {
  it('returns null when reviewsAvailable > 0', () => {
    const { queryByTestId } = render(
      <NextReviewIndicator nextReviewAt={null} reviewsAvailable={5} />,
    );
    expect(queryByTestId('next-review-indicator')).toBeNull();
  });

  it('returns null even with nextReviewAt when reviews are available', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { queryByTestId } = render(
      <NextReviewIndicator nextReviewAt={futureDate} reviewsAvailable={3} />,
    );
    expect(queryByTestId('next-review-indicator')).toBeNull();
  });

  it('displays "No upcoming reviews" when nextReviewAt is null and no reviews available', () => {
    const { getByText } = render(
      <NextReviewIndicator nextReviewAt={null} reviewsAvailable={0} />,
    );
    expect(getByText('No upcoming reviews')).toBeTruthy();
  });

  it('displays countdown when nextReviewAt is set and no reviews available', () => {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000 + 500);
    const { getByText } = render(
      <NextReviewIndicator
        nextReviewAt={twoHoursFromNow}
        reviewsAvailable={0}
      />,
    );
    expect(getByText('Next review in 2 hours')).toBeTruthy();
  });

  it('defaults reviewsAvailable to 0', () => {
    const { getByText } = render(<NextReviewIndicator nextReviewAt={null} />);
    expect(getByText('No upcoming reviews')).toBeTruthy();
  });

  it('has next-review-indicator testID', () => {
    const { getByTestId } = render(<NextReviewIndicator nextReviewAt={null} />);
    expect(getByTestId('next-review-indicator')).toBeTruthy();
  });

  it('shows minutes when review is within an hour', () => {
    const thirtyMinutes = new Date(Date.now() + 30 * 60 * 1000 + 500);
    const { getByText } = render(
      <NextReviewIndicator nextReviewAt={thirtyMinutes} reviewsAvailable={0} />,
    );
    expect(getByText('Next review in 30 minutes')).toBeTruthy();
  });

  it('shows days when review is more than a day away', () => {
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 500);
    const { getByText } = render(
      <NextReviewIndicator nextReviewAt={threeDays} reviewsAvailable={0} />,
    );
    expect(getByText('Next review in 3 days')).toBeTruthy();
  });
});
