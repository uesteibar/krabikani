import React from 'react';
import { render } from '@testing-library/react-native';

import { LessonsScreen } from '../../src/screens/LessonsScreen';

describe('LessonsScreen', () => {
  it('renders the title', () => {
    const { getByText } = render(<LessonsScreen />);
    expect(getByText('Lessons')).toBeTruthy();
  });

  it('renders the coming soon message', () => {
    const { getByText } = render(<LessonsScreen />);
    expect(getByText('Coming soon...')).toBeTruthy();
  });

  it('has lessons-screen testID', () => {
    const { getByTestId } = render(<LessonsScreen />);
    expect(getByTestId('lessons-screen')).toBeTruthy();
  });
});
