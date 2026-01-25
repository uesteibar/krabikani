import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SyncingIndicator } from '../../src/components/SyncingIndicator';

describe('SyncingIndicator', () => {
  it('should render nothing when isSyncing is false', () => {
    render(<SyncingIndicator isSyncing={false} />);

    expect(screen.queryByTestId('syncing-indicator')).toBeNull();
  });

  it('should show indicator when isSyncing is true', () => {
    render(<SyncingIndicator isSyncing={true} />);

    expect(screen.getByTestId('syncing-indicator')).toBeTruthy();
  });

  it('should show "Syncing..." text', () => {
    render(<SyncingIndicator isSyncing={true} />);

    expect(screen.getByText('Syncing...')).toBeTruthy();
  });

  it('should show a spinner', () => {
    render(<SyncingIndicator isSyncing={true} />);

    expect(screen.getByTestId('syncing-indicator-spinner')).toBeTruthy();
  });
});
