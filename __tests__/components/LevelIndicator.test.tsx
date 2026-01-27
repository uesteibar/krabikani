import React from 'react';
import { render } from '@testing-library/react-native';

import { LevelIndicator } from '../../src/components/LevelIndicator';
import { ThemeProvider } from '../../src/theme';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('LevelIndicator', () => {
  it('renders level when provided', () => {
    const { getByTestId, getByText } = renderWithTheme(
      <LevelIndicator level={5} />,
    );
    expect(getByTestId('level-indicator')).toBeTruthy();
    expect(getByText('LEVEL')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders nothing when level is null (loading state)', () => {
    const { queryByTestId } = renderWithTheme(
      <LevelIndicator level={null} />,
    );
    expect(queryByTestId('level-indicator')).toBeNull();
  });

  it('renders level 1 correctly', () => {
    const { getByText } = renderWithTheme(<LevelIndicator level={1} />);
    expect(getByText('LEVEL')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('renders high levels correctly', () => {
    const { getByText } = renderWithTheme(<LevelIndicator level={60} />);
    expect(getByText('LEVEL')).toBeTruthy();
    expect(getByText('60')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <LevelIndicator level={10} testID="custom-level-indicator" />,
    );
    expect(getByTestId('custom-level-indicator')).toBeTruthy();
    expect(queryByTestId('level-indicator')).toBeNull();
  });

  it('has level-text testID for the number', () => {
    const { getByTestId } = renderWithTheme(<LevelIndicator level={5} />);
    expect(getByTestId('level-text')).toBeTruthy();
    expect(getByTestId('level-text').props.children).toEqual(5);
  });

  it('has level-label testID for the label', () => {
    const { getByTestId } = renderWithTheme(<LevelIndicator level={5} />);
    expect(getByTestId('level-label')).toBeTruthy();
    expect(getByTestId('level-label').props.children).toEqual('LEVEL');
  });
});
