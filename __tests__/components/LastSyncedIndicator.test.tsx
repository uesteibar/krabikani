import React from 'react';
import { render } from '@testing-library/react-native';

import {
  LastSyncedIndicator,
  formatTimeSince,
} from '../../src/components/LastSyncedIndicator';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { COLORS } from '../../src/theme';

function renderWithTheme(ui: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

describe('formatTimeSince', () => {
  it('returns "Never synced" for null', () => {
    expect(formatTimeSince(null)).toBe('Never synced');
  });

  it('returns "Just now" for less than 60 seconds', () => {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    expect(formatTimeSince(thirtySecondsAgo)).toBe('Just now');
  });

  it('returns "1 minute ago" for 1 minute', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    expect(formatTimeSince(oneMinuteAgo)).toBe('1 minute ago');
  });

  it('returns "X minutes ago" for multiple minutes', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatTimeSince(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns "1 hour ago" for 1 hour', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(formatTimeSince(oneHourAgo)).toBe('1 hour ago');
  });

  it('returns "X hours ago" for multiple hours', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(formatTimeSince(threeHoursAgo)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 1 day', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatTimeSince(oneDayAgo)).toBe('1 day ago');
  });

  it('returns "X days ago" for multiple days', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(formatTimeSince(fiveDaysAgo)).toBe('5 days ago');
  });

  it('handles edge case at 59 minutes', () => {
    const now = new Date();
    const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000);
    expect(formatTimeSince(fiftyNineMinutesAgo)).toBe('59 minutes ago');
  });

  it('handles edge case at 23 hours', () => {
    const now = new Date();
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    expect(formatTimeSince(twentyThreeHoursAgo)).toBe('23 hours ago');
  });
});

describe('LastSyncedIndicator', () => {
  it('displays "Never synced" when lastSyncedAt is null', () => {
    const { getByText } = renderWithTheme(<LastSyncedIndicator lastSyncedAt={null} />);
    expect(getByText('Last synced:')).toBeTruthy();
    expect(getByText('Never synced')).toBeTruthy();
  });

  it('displays relative time for recent sync', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { getByText } = renderWithTheme(
      <LastSyncedIndicator lastSyncedAt={fiveMinutesAgo} />,
    );
    expect(getByText('Last synced:')).toBeTruthy();
    expect(getByText('5 minutes ago')).toBeTruthy();
  });

  it('displays "Just now" for very recent sync', () => {
    const justNow = new Date();
    const { getByText } = renderWithTheme(
      <LastSyncedIndicator lastSyncedAt={justNow} />,
    );
    expect(getByText('Last synced:')).toBeTruthy();
    expect(getByText('Just now')).toBeTruthy();
  });

  it('has default testID', () => {
    const { getByTestId } = renderWithTheme(<LastSyncedIndicator lastSyncedAt={null} />);
    expect(getByTestId('last-synced-indicator')).toBeTruthy();
  });

  it('accepts custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <LastSyncedIndicator lastSyncedAt={null} testID="custom-sync" />,
    );
    expect(getByTestId('custom-sync')).toBeTruthy();
  });

  describe('theme-aware styling', () => {
    it('uses light theme background color in light mode', () => {
      const { getByTestId } = renderWithTheme(
        <LastSyncedIndicator lastSyncedAt={null} testID="sync-light" />,
        'light',
      );
      const container = getByTestId('sync-light');
      const badge = container.children[0] as any;
      const flattenedStyle = Array.isArray(badge.props.style)
        ? Object.assign({}, ...badge.props.style)
        : badge.props.style;
      expect(flattenedStyle.backgroundColor).toBe(COLORS.background.secondary);
    });

    it('uses dark theme background color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <LastSyncedIndicator lastSyncedAt={null} testID="sync-dark" />,
        'dark',
      );
      const container = getByTestId('sync-dark');
      const badge = container.children[0] as any;
      const flattenedStyle = Array.isArray(badge.props.style)
        ? Object.assign({}, ...badge.props.style)
        : badge.props.style;
      expect(flattenedStyle.backgroundColor).toBe('#1E1E1E');
    });
  });
});
