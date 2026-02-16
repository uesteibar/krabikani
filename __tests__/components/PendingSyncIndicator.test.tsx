import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { PendingSyncIndicator } from '../../src/components/PendingSyncIndicator';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { COLORS } from '../../src/theme';

function renderWithTheme(ui: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

describe('PendingSyncIndicator', () => {
  it('should render nothing when there are no pending items', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={0}
        pendingReviewsCount={0}
      />,
    );

    expect(screen.queryByTestId('pending-sync-indicator')).toBeNull();
  });

  it('should show indicator when there are pending lessons', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={3}
        pendingReviewsCount={0}
      />,
    );

    expect(screen.getByTestId('pending-sync-indicator')).toBeTruthy();
    expect(screen.getByText('3 lessons pending sync')).toBeTruthy();
    expect(screen.getByText('Will sync automatically when online')).toBeTruthy();
  });

  it('should show indicator when there are pending reviews', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={0}
        pendingReviewsCount={5}
      />,
    );

    expect(screen.getByTestId('pending-sync-indicator')).toBeTruthy();
    expect(screen.getByText('5 reviews pending sync')).toBeTruthy();
  });

  it('should show both lessons and reviews when both are pending', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={2}
        pendingReviewsCount={3}
      />,
    );

    expect(screen.getByTestId('pending-sync-indicator')).toBeTruthy();
    expect(screen.getByText('2 lessons and 3 reviews pending sync')).toBeTruthy();
  });

  it('should use singular form for 1 lesson', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={1}
        pendingReviewsCount={0}
      />,
    );

    expect(screen.getByText('1 lesson pending sync')).toBeTruthy();
  });

  it('should use singular form for 1 review', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={0}
        pendingReviewsCount={1}
      />,
    );

    expect(screen.getByText('1 review pending sync')).toBeTruthy();
  });

  it('should use singular forms for 1 lesson and 1 review', () => {
    renderWithTheme(
      <PendingSyncIndicator
        pendingLessonsCount={1}
        pendingReviewsCount={1}
      />,
    );

    expect(screen.getByText('1 lesson and 1 review pending sync')).toBeTruthy();
  });

  describe('theme-awareness', () => {
    it('uses light pendingSyncText color in light mode', () => {
      renderWithTheme(
        <PendingSyncIndicator pendingLessonsCount={3} pendingReviewsCount={0} />,
        'light',
      );
      const text = screen.getByText('3 lessons pending sync');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: COLORS.status.pendingSyncText }),
        ]),
      );
    });

    it('uses dark pendingSyncText color in dark mode', () => {
      renderWithTheme(
        <PendingSyncIndicator pendingLessonsCount={3} pendingReviewsCount={0} />,
        'dark',
      );
      const text = screen.getByText('3 lessons pending sync');
      expect(text.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#E65100' }),
        ]),
      );
    });
  });
});
