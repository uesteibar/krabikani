import React from 'react';
import { render } from '@testing-library/react-native';

import { LevelIndicator } from '../../src/components/LevelIndicator';

describe('LevelIndicator', () => {
  it('renders level when provided', () => {
    const { getByTestId, getByText } = render(<LevelIndicator level={5} />);
    expect(getByTestId('level-indicator')).toBeTruthy();
    expect(getByText('Level 5')).toBeTruthy();
  });

  it('renders nothing when level is null (loading state)', () => {
    const { queryByTestId } = render(<LevelIndicator level={null} />);
    expect(queryByTestId('level-indicator')).toBeNull();
  });

  it('renders level 1 correctly', () => {
    const { getByText } = render(<LevelIndicator level={1} />);
    expect(getByText('Level 1')).toBeTruthy();
  });

  it('renders high levels correctly', () => {
    const { getByText } = render(<LevelIndicator level={60} />);
    expect(getByText('Level 60')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <LevelIndicator level={10} testID="custom-level-indicator" />,
    );
    expect(getByTestId('custom-level-indicator')).toBeTruthy();
    expect(queryByTestId('level-indicator')).toBeNull();
  });

  it('has level-text testID', () => {
    const { getByTestId } = render(<LevelIndicator level={5} />);
    expect(getByTestId('level-text')).toBeTruthy();
    expect(getByTestId('level-text').props.children).toEqual(['Level ', 5]);
  });
});
