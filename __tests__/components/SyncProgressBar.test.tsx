import React from 'react';
import { render } from '@testing-library/react-native';

import { SyncProgressBar } from '../../src/components/SyncProgressBar';

describe('SyncProgressBar', () => {
  it('should render when syncing', () => {
    const { getByTestId } = render(<SyncProgressBar isSyncing={true} />);

    expect(getByTestId('sync-progress-bar')).toBeTruthy();
  });

  it('should not render when not syncing', () => {
    const { queryByTestId } = render(<SyncProgressBar isSyncing={false} />);

    expect(queryByTestId('sync-progress-bar')).toBeNull();
  });

  it('should accept a custom testID', () => {
    const { getByTestId, queryByTestId } = render(
      <SyncProgressBar isSyncing={true} testID="custom-progress-bar" />,
    );

    expect(getByTestId('custom-progress-bar')).toBeTruthy();
    expect(queryByTestId('sync-progress-bar')).toBeNull();
  });

  it('should hide when syncing stops', () => {
    const { queryByTestId, rerender } = render(
      <SyncProgressBar isSyncing={true} />,
    );

    expect(queryByTestId('sync-progress-bar')).toBeTruthy();

    rerender(<SyncProgressBar isSyncing={false} />);

    expect(queryByTestId('sync-progress-bar')).toBeNull();
  });
});
