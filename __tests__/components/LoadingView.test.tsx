import React from 'react';
import { render } from '@testing-library/react-native';

import { LoadingView } from '../../src/components/LoadingView';

describe('LoadingView', () => {
  it('renders with default message', () => {
    const { getByText } = render(<LoadingView />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders with custom message', () => {
    const { getByText } = render(
      <LoadingView message="Loading reviews..." />,
    );
    expect(getByText('Loading reviews...')).toBeTruthy();
  });

  it('renders ActivityIndicator', () => {
    const { getByTestId } = render(<LoadingView />);
    expect(getByTestId('loading-view-activity')).toBeTruthy();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(<LoadingView testID="custom-loading" />);
    expect(getByTestId('custom-loading')).toBeTruthy();
    expect(getByTestId('custom-loading-activity')).toBeTruthy();
    expect(getByTestId('custom-loading-message')).toBeTruthy();
  });
});
