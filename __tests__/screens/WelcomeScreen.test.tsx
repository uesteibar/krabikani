import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { WelcomeScreen } from '../../src/screens/WelcomeScreen';
import { ThemeProvider } from '../../src/theme';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Cabrigator logo', () => {
    const { getByTestId } = renderWithTheme(<WelcomeScreen />);
    expect(getByTestId('welcome-logo')).toBeTruthy();
  });

  it('displays the app name', () => {
    const { getByText } = renderWithTheme(<WelcomeScreen />);
    expect(getByText('Krabikani')).toBeTruthy();
  });

  it('displays the tagline', () => {
    const { getByText } = renderWithTheme(<WelcomeScreen />);
    expect(getByText('Master Japanese, one review at a time')).toBeTruthy();
  });

  it('displays a Get Started button', () => {
    const { getByTestId } = renderWithTheme(<WelcomeScreen />);
    expect(getByTestId('get-started-button')).toBeTruthy();
  });

  it('navigates to Instructions when Get Started is pressed', () => {
    const { getByTestId } = renderWithTheme(<WelcomeScreen />);
    fireEvent.press(getByTestId('get-started-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Instructions');
  });

  it('renders with default testID', () => {
    const { getByTestId } = renderWithTheme(<WelcomeScreen />);
    expect(getByTestId('welcome-screen')).toBeTruthy();
  });
});
