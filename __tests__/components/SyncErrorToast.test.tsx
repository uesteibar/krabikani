import React from 'react';
import { render } from '@testing-library/react-native';

import { SyncErrorToast } from '../../src/components/SyncErrorToast';

describe('SyncErrorToast', () => {
  it('should render when visible', () => {
    const onDismiss = jest.fn();
    const { getByTestId, getByText } = render(
      <SyncErrorToast visible={true} onDismiss={onDismiss} />,
    );

    expect(getByTestId('sync-error-toast')).toBeTruthy();
    expect(getByText('Sync failed')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const onDismiss = jest.fn();
    const { queryByTestId } = render(
      <SyncErrorToast visible={false} onDismiss={onDismiss} />,
    );

    expect(queryByTestId('sync-error-toast')).toBeNull();
  });

  it('should accept a custom testID', () => {
    const onDismiss = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <SyncErrorToast
        visible={true}
        onDismiss={onDismiss}
        testID="custom-error-toast"
      />,
    );

    expect(getByTestId('custom-error-toast')).toBeTruthy();
    expect(queryByTestId('sync-error-toast')).toBeNull();
  });

  it('should hide when visibility changes to false', () => {
    const onDismiss = jest.fn();
    const { queryByTestId, rerender } = render(
      <SyncErrorToast visible={true} onDismiss={onDismiss} />,
    );

    expect(queryByTestId('sync-error-toast')).toBeTruthy();

    rerender(<SyncErrorToast visible={false} onDismiss={onDismiss} />);

    expect(queryByTestId('sync-error-toast')).toBeNull();
  });
});
