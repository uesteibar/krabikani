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

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>,
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

  describe('Theme-aware styling', () => {
    it('should use light button text color in light mode', () => {
      const { getByText } = renderWithTheme(<WizardCompletionScreen />);
      const buttonText = getByText('Start Learning');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('should use dark button text color in dark mode', () => {
      const { getByText } = renderWithTheme(
        <WizardCompletionScreen />,
        'dark',
      );
      const buttonText = getByText('Start Learning');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#121212');
    });
  });
});
