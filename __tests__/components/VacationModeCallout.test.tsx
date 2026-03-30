import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { VacationModeCallout } from '../../src/components/VacationModeCallout';
import { ThemeProvider } from '../../src/theme/ThemeContext';

jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme?: 'light' | 'dark',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

describe('VacationModeCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default testID', () => {
    const { getByTestId } = renderWithTheme(<VacationModeCallout />);
    expect(getByTestId('vacation-mode-callout')).toBeTruthy();
  });

  it('displays Vacation Mode title', () => {
    const { getByText } = renderWithTheme(<VacationModeCallout />);
    expect(getByText('Vacation Mode')).toBeTruthy();
  });

  it('displays message indicating reviews are paused', () => {
    const { getByText } = renderWithTheme(<VacationModeCallout />);
    expect(
      getByText('Your reviews are paused. Enjoy your break!'),
    ).toBeTruthy();
  });

  it('displays manage button', () => {
    const { getByTestId } = renderWithTheme(<VacationModeCallout />);
    expect(getByTestId('vacation-manage-button')).toBeTruthy();
  });

  it('opens WaniKani account settings when manage button is pressed', () => {
    const { getByTestId } = renderWithTheme(<VacationModeCallout />);
    fireEvent.press(getByTestId('vacation-manage-button'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.wanikani.com/settings/account',
    );
  });

  it('renders with custom testID', () => {
    const { getByTestId } = renderWithTheme(
      <VacationModeCallout testID="custom-id" />,
    );
    expect(getByTestId('custom-id')).toBeTruthy();
  });

  it('renders in dark mode without errors', () => {
    const { getByTestId } = renderWithTheme(<VacationModeCallout />, 'dark');
    expect(getByTestId('vacation-mode-callout')).toBeTruthy();
  });
});
