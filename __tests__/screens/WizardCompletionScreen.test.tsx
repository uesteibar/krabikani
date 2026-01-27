import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { WizardCompletionScreen } from '../../src/screens/WizardCompletionScreen';
import { ThemeProvider } from '../../src/theme';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">{ui}</ThemeProvider>,
  );
}

describe('WizardCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen', () => {
    const { getByTestId } = renderWithTheme(<WizardCompletionScreen />);
    expect(getByTestId('wizard-completion-screen')).toBeTruthy();
  });

  it('displays the Cabrigator logo', () => {
    const { getByTestId } = renderWithTheme(<WizardCompletionScreen />);
    expect(getByTestId('completion-logo')).toBeTruthy();
  });

  it('displays the completion message', () => {
    const { getByText } = renderWithTheme(<WizardCompletionScreen />);
    expect(getByText("You're all set!")).toBeTruthy();
  });

  it('displays a Start Learning button', () => {
    const { getByTestId } = renderWithTheme(<WizardCompletionScreen />);
    expect(getByTestId('start-learning-button')).toBeTruthy();
  });

  it('resets navigation to Home when Start Learning is pressed', () => {
    const { getByTestId } = renderWithTheme(<WizardCompletionScreen />);

    fireEvent.press(getByTestId('start-learning-button'));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  });
});
