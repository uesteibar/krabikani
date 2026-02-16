import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { ApiKeyInputScreen } from '../../src/screens/ApiKeyInputScreen';
import { ThemeProvider } from '../../src/theme';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockValidateApiKey = jest.fn();
jest.mock('../../src/api', () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
}));

const mockSaveApiKey = jest.fn();
jest.mock('../../src/storage', () => ({
  saveApiKey: (...args: unknown[]) => mockSaveApiKey(...args),
}));

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>,
  );
}

describe('ApiKeyInputScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />);
    expect(getByTestId('api-key-input-screen')).toBeTruthy();
  });

  it('renders a text input for the API key', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />);
    expect(getByTestId('api-key-input')).toBeTruthy();
  });

  it('renders a Validate & Connect button', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />);
    expect(getByTestId('validate-button')).toBeTruthy();
  });

  it('goes back when back button is pressed', () => {
    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />);
    fireEvent.press(getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows loading state while validating', async () => {
    mockValidateApiKey.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId, getByText } = renderWithTheme(<ApiKeyInputScreen />);

    fireEvent.changeText(getByTestId('api-key-input'), 'test-key-123');
    fireEvent.press(getByTestId('validate-button'));

    await waitFor(() => {
      expect(getByText('Validating...')).toBeTruthy();
    });
  });

  it('shows error on invalid API key', async () => {
    mockValidateApiKey.mockResolvedValue({ success: false, error: 'unauthorized' });
    const { getByTestId, findByTestId } = renderWithTheme(
      <ApiKeyInputScreen />,
    );

    fireEvent.changeText(getByTestId('api-key-input'), 'bad-key');
    fireEvent.press(getByTestId('validate-button'));

    const errorText = await findByTestId('error-message');
    expect(errorText).toBeTruthy();
  });

  it('shows network error message on network failure', async () => {
    mockValidateApiKey.mockRejectedValue(new TypeError('Network request failed'));
    const { getByTestId, findByText } = renderWithTheme(
      <ApiKeyInputScreen />,
    );

    fireEvent.changeText(getByTestId('api-key-input'), 'some-key');
    fireEvent.press(getByTestId('validate-button'));

    const errorMsg = await findByText(
      "Couldn't reach WaniKani. Check your internet connection and try again.",
    );
    expect(errorMsg).toBeTruthy();
  });

  it('saves key and navigates to Sync on valid key', async () => {
    mockValidateApiKey.mockResolvedValue({
      success: true,
      user: { id: 1, username: 'test', level: 5 },
    });
    mockSaveApiKey.mockResolvedValue({ success: true });

    const { getByTestId } = renderWithTheme(<ApiKeyInputScreen />);

    fireEvent.changeText(getByTestId('api-key-input'), 'valid-key');
    fireEvent.press(getByTestId('validate-button'));

    await waitFor(() => {
      expect(mockSaveApiKey).toHaveBeenCalledWith('valid-key');
      expect(mockNavigate).toHaveBeenCalledWith('Sync');
    });
  });

  describe('Theme-aware styling', () => {
    it('should use light button text color in light mode', () => {
      const { getByText } = renderWithTheme(<ApiKeyInputScreen />);
      const buttonText = getByText('Validate & Connect');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#FFFFFF');
    });

    it('should use dark button text color in dark mode', () => {
      const { getByText } = renderWithTheme(<ApiKeyInputScreen />, 'dark');
      const buttonText = getByText('Validate & Connect');
      const flatStyle = Array.isArray(buttonText.props.style)
        ? Object.assign({}, ...buttonText.props.style.flat())
        : buttonText.props.style;
      expect(flatStyle.color).toBe('#121212');
    });
  });
});
