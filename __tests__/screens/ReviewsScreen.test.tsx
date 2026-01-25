import React from 'react';
import { render } from '@testing-library/react-native';

import { ReviewsScreen } from '../../src/screens/ReviewsScreen';

describe('ReviewsScreen', () => {
  it('renders the title', () => {
    const { getByText } = render(<ReviewsScreen />);
    expect(getByText('Reviews')).toBeTruthy();
  });

  it('renders the coming soon message', () => {
    const { getByText } = render(<ReviewsScreen />);
    expect(getByText('Coming soon...')).toBeTruthy();
  });

  it('has reviews-screen testID', () => {
    const { getByTestId } = render(<ReviewsScreen />);
    expect(getByTestId('reviews-screen')).toBeTruthy();
  });
});
